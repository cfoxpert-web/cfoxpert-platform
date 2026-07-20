import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import type { DocumentKind } from "../documents/model";
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
 * Structured outputs (json_schema) make the response guaranteed-parseable;
 * correctness still comes from the validation gates + analyst review.
 *
 * Data handling per the ADR-010 addendum: standard Anthropic commercial
 * API (no training on inputs/outputs by default, limited retention),
 * disclosed in the Privacy Policy.
 */

const LineSchema = z.object({
  statement: z.enum([
    "trial_balance",
    "pnl",
    "balance_sheet",
    "stock_statement",
    "other",
  ]),
  source_label: z.string(),
  amount: z.number().nullable(),
  period_label: z.string().nullable(),
  segment: z.string().nullable(),
  provenance: z.string(),
  proposed_kpi_key: z.string().nullable(),
  confidence: z.number(),
});

const ExtractionSchema = z.object({
  period_label: z.string().nullable(),
  period_start: z.string().nullable(),
  period_end: z.string().nullable(),
  notes: z.array(z.string()),
  lines: z.array(LineSchema),
});

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

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: buildSystemPrompt(input.catalogue),
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error(
      `AI extraction returned no usable result (stop reason: ${response.stop_reason ?? "unknown"}).`,
    );
  }

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
