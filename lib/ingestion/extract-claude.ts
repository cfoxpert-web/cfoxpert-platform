import Anthropic from "@anthropic-ai/sdk";

import { DOCUMENT_KINDS, type DocumentKind } from "../documents/model";
import { env } from "../env";
import type {
  CandidateLine,
  ExtractionOutput,
  KpiCatalogueEntry,
} from "./types";

/**
 * Amendment A4-b — Claude extraction (rung 2 of the ladder, ADR-010).
 *
 * PROPOSES ONLY. Output lands in staging; nothing here can publish.
 * One document from one organization per request — the prompt carries no
 * client-identifying context beyond the document itself, and no data from
 * any other organization can be present by construction.
 *
 * Structured outputs (a hand-written json_schema on output_config — NOT
 * the SDK's zod helper, which type-clashes with this repo's zod version)
 * make the response schema-conformant server-side; the payload is still
 * re-validated here line by line, and correctness ultimately comes from
 * the validation gates + analyst review.
 *
 * Data handling per the ADR-010 addendum: standard Anthropic commercial
 * API (no training on inputs/outputs by default, limited retention),
 * disclosed in the Privacy Policy.
 */

const KIND_VALUES = DOCUMENT_KINDS.map((k) => k.key);

const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] };
const NULLABLE_NUMBER = { anyOf: [{ type: "number" }, { type: "null" }] };

const EXTRACTION_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["period_label", "period_start", "period_end", "notes", "lines"],
  properties: {
    period_label: NULLABLE_STRING,
    period_start: NULLABLE_STRING,
    period_end: NULLABLE_STRING,
    notes: { type: "array", items: { type: "string" } },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "statement",
          "source_label",
          "amount",
          "period_label",
          "segment",
          "provenance",
          "proposed_kpi_key",
          "confidence",
        ],
        properties: {
          statement: { type: "string", enum: KIND_VALUES },
          source_label: { type: "string" },
          amount: NULLABLE_NUMBER,
          period_label: NULLABLE_STRING,
          segment: NULLABLE_STRING,
          provenance: { type: "string" },
          proposed_kpi_key: NULLABLE_STRING,
          confidence: { type: "number" },
        },
      },
    },
  },
};

type RawLine = {
  statement: DocumentKind;
  source_label: string;
  amount: number | null;
  period_label: string | null;
  segment: string | null;
  provenance: string;
  proposed_kpi_key: string | null;
  confidence: number;
};

type RawExtraction = {
  period_label: string | null;
  period_start: string | null;
  period_end: string | null;
  notes: string[];
  lines: RawLine[];
};

const isKind = (v: unknown): v is DocumentKind =>
  typeof v === "string" && (KIND_VALUES as string[]).includes(v);

const strOrNull = (v: unknown): string | null =>
  typeof v === "string" ? v : null;

/**
 * Belt-and-braces runtime narrowing. The API enforces the schema, but a
 * truncated response (max_tokens) or anything unexpected must fail
 * honestly, never stage garbage. Malformed individual lines are dropped.
 */
function narrowPayload(value: unknown): RawExtraction {
  if (typeof value !== "object" || value === null) {
    throw new Error("AI extraction returned a non-object payload.");
  }
  const v = value as Record<string, unknown>;
  const rawLines = Array.isArray(v.lines) ? v.lines : [];

  const lines: RawLine[] = [];
  for (const item of rawLines) {
    if (typeof item !== "object" || item === null) continue;
    const l = item as Record<string, unknown>;
    if (typeof l.source_label !== "string" || l.source_label === "") continue;
    lines.push({
      statement: isKind(l.statement) ? l.statement : "other",
      source_label: l.source_label,
      amount: typeof l.amount === "number" && Number.isFinite(l.amount) ? l.amount : null,
      period_label: strOrNull(l.period_label),
      segment: strOrNull(l.segment),
      provenance: typeof l.provenance === "string" ? l.provenance : "unknown",
      proposed_kpi_key: strOrNull(l.proposed_kpi_key),
      confidence: typeof l.confidence === "number" ? l.confidence : 0,
    });
  }

  return {
    period_label: strOrNull(v.period_label),
    period_start: strOrNull(v.period_start),
    period_end: strOrNull(v.period_end),
    notes: Array.isArray(v.notes)
      ? v.notes.filter((n): n is string => typeof n === "string")
      : [],
    lines,
  };
}

function buildSystemPrompt(catalogue: KpiCatalogueEntry[]): string {
  const catalogueList = catalogue
    .map((k) => `- ${k.key}: ${k.label}`)
    .join("\n");

  return `You extract financial statement lines from Indian company documents (Tally/ERP exports, audited statements) for a virtual-CFO platform. An analyst reviews every number you produce before anything is published — your job is faithful transcription, not judgment.

Rules:
- Extract every line item that carries an amount, including stated Total/Grand Total lines. Never invent, estimate, or omit lines.
- source_label: the label EXACTLY as printed.
- amount: in RUPEES. If the document states figures in lakhs or crores, convert to rupees and say so in notes. Trial balance sign convention: debit positive, credit negative. Other statements: as printed (parentheses = negative).
- provenance: where the line appears — "page 3" for PDFs, the sheet/cell reference if the input is a spreadsheet dump.
- statement: which statement the line belongs to (trial_balance, pnl, balance_sheet, stock_statement, other).
- period_label / period_start / period_end (YYYY-MM-DD): the period the document covers, when stated. For balance sheets use the as-on date for both start and end.
- segment: branch/unit/division name ONLY if the document breaks figures out by segment; otherwise null.
- proposed_kpi_key: if a line clearly corresponds to one of the platform KPIs below, propose that key — otherwise null. NEVER propose a key not in this list. This is a proposal an analyst will confirm or reject.
- confidence: 0 to 1, your confidence in the amount AND its reading (label, sign, unit).

Platform KPI catalogue (the only valid proposed_kpi_key values):
${catalogueList}`;
}

export async function extractWithClaude(input: {
  source:
    | { type: "pdf"; data: Buffer }
    | { type: "text"; text: string };
  kind: DocumentKind;
  periodHint: string | null;
  fileName: string;
  catalogue: KpiCatalogueEntry[];
}): Promise<ExtractionOutput> {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error(
      "AI extraction is not configured (ANTHROPIC_API_KEY is missing) and deterministic parsing could not read this document.",
    );
  }

  // Bounded to fit inside the hosting platform's function time limit;
  // a timeout fails the job honestly and Retry is one click.
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: 55_000,
    maxRetries: 0,
  });

  const task = `Extract the financial statement lines from this document.
Uploader-declared document type: ${input.kind} (verify against the content; correct it per line via "statement" if the declaration is wrong).
Uploader-declared period hint: ${input.periodHint ?? "none"}.
File name: ${input.fileName}`;

  const content =
    input.source.type === "pdf"
      ? [
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: input.source.data.toString("base64"),
            },
          },
          { type: "text" as const, text: task },
        ]
      : [
          {
            type: "text" as const,
            text: `${task}\n\nDocument content (CSV dump of the spreadsheet):\n\n${input.source.text}`,
          },
        ];

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: buildSystemPrompt(input.catalogue),
    messages: [{ role: "user", content }],
    output_config: {
      format: { type: "json_schema", schema: EXTRACTION_SCHEMA },
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("AI extraction declined to process this document.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      "AI extraction output was truncated (document too large for one pass).",
    );
  }

  const textBlock = response.content.find(
    (b): b is Anthropic.TextBlock => b.type === "text",
  );
  if (!textBlock) {
    throw new Error(
      `AI extraction returned no usable result (stop reason: ${response.stop_reason ?? "unknown"}).`,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(textBlock.text);
  } catch {
    throw new Error("AI extraction returned unparseable output.");
  }
  const parsed = narrowPayload(payload);

  const validKeys = new Set(input.catalogue.map((k) => k.key));
  const lines: CandidateLine[] = parsed.lines.map((l) => ({
    statement: l.statement,
    sourceLabel: l.source_label,
    amount: l.amount,
    periodLabel: l.period_label ?? parsed.period_label,
    segment: l.segment,
    provenance: l.provenance,
    // The model may only PROPOSE catalogue keys; anything else is dropped
    // to null (analyst decides), never passed through.
    proposedKpiKey:
      l.proposed_kpi_key && validKeys.has(l.proposed_kpi_key)
        ? l.proposed_kpi_key
        : null,
    confidence: Math.min(1, Math.max(0, l.confidence)),
  }));

  return {
    method: "claude",
    lines,
    periodLabel: parsed.period_label,
    periodStart: parsed.period_start,
    periodEnd: parsed.period_end,
    notes: parsed.notes,
  };
}
