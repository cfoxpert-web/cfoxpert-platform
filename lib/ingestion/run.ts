import { STORAGE_BUCKET, type DocumentKind } from "../documents/model";
import { createAdminClient } from "../supabase/admin";
import { extractWithClaude } from "./extract-claude";
import { applyMappingMemory, type MappingEntry } from "./mapping";
import { normalizeLabel } from "./normalize";
import {
  parseCsv,
  sheetsToCsv,
  sheetsToLines,
  type ParsedSheet,
} from "./parse-spreadsheet";
import { readXlsx } from "./spreadsheet-file";
import type { ExtractionOutput, KpiCatalogueEntry } from "./types";
import { gateFailures, runValidationGates } from "./validate";

/**
 * Amendment A4-b — the extraction orchestrator (server-only).
 *
 * Runs one job through the ladder: deterministic parse → Claude fallback
 * → mapping memory → validation gates → needs_review (or failed). Writes
 * ONLY to staging (extracted_lines) and the job row; kpi_values is
 * untouched by construction (ADR-010 — the publish verb ships in A4-c).
 *
 * Stage transitions here run via the service role (machine transitions;
 * job events record changed_by null). The human transitions — approve,
 * and later publish — happen in server actions with the real actor.
 * Every run writes an audit_logs entry (ADR-005).
 */

export type RunExtractionResult =
  | { ok: true; lineCount: number; failures: number }
  | { ok: false; error: string };

type JobRow = {
  id: string;
  organization_id: string;
  stage: string;
  document: {
    id: string;
    storage_path: string;
    mime_type: string;
    kind: DocumentKind;
    period_hint: string | null;
    file_name: string;
  };
};

async function loadSheets(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParsedSheet[]> {
  const isCsv =
    mimeType === "text/csv" || /\.csv$/i.test(fileName);
  if (isCsv) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    return [{ name: "CSV", rows: parseCsv(text) }];
  }
  try {
    return await readXlsx(buffer);
  } catch {
    throw new Error(
      "Could not read this spreadsheet. If it is a legacy .xls file, re-export it from Tally/Excel as .xlsx, .csv, or PDF and upload again.",
    );
  }
}

export async function runExtraction(
  jobId: string,
  actorId: string | null,
): Promise<RunExtractionResult> {
  const admin = createAdminClient();

  const { data: jobRaw, error: jobError } = await admin
    .from("ingestion_jobs")
    .select(
      "id, organization_id, stage, document:client_documents ( id, storage_path, mime_type, kind, period_hint, file_name )",
    )
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();

  if (jobError || !jobRaw) {
    return { ok: false, error: "Job not found." };
  }
  const docRaw = Array.isArray(jobRaw.document)
    ? jobRaw.document[0]
    : jobRaw.document;
  if (!docRaw) return { ok: false, error: "Job has no document." };
  const job = { ...jobRaw, document: docRaw } as unknown as JobRow;

  if (job.stage !== "approved" && job.stage !== "failed") {
    return {
      ok: false,
      error: `Job is at stage '${job.stage}' — extraction runs on approved (or failed, for retry) jobs.`,
    };
  }

  await admin
    .from("ingestion_jobs")
    .update({ stage: "extracting", stage_note: null, validation: null })
    .eq("id", jobId);

  try {
    // ---- Bytes
    const { data: blob, error: dlError } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(job.document.storage_path);
    if (dlError || !blob) {
      throw new Error(`Could not download the file: ${dlError?.message ?? "not found"}`);
    }
    const buffer = Buffer.from(await blob.arrayBuffer());

    // ---- Catalogue + mapping memory
    const { data: catRows } = await admin
      .from("kpi_definitions")
      .select("key, label")
      .eq("active", true);
    const catalogue: KpiCatalogueEntry[] = (catRows ?? []).map((r) => ({
      key: r.key as string,
      label: r.label as string,
    }));
    const validKeys = new Set(catalogue.map((k) => k.key));

    const { data: mapRows } = await admin
      .from("account_mappings")
      .select("source_label_normalized, kpi_key, segment")
      .eq("organization_id", job.organization_id)
      .is("deleted_at", null);
    const mappings = new Map<string, MappingEntry>(
      (mapRows ?? []).map((r) => [
        normalizeLabel(r.source_label_normalized as string),
        {
          kpiKey: r.kpi_key as string,
          segment: (r.segment as string | null) ?? null,
        },
      ]),
    );

    // ---- The ladder
    const { mime_type, file_name, kind, period_hint } = job.document;
    let output: ExtractionOutput;

    if (mime_type === "application/pdf") {
      output = await extractWithClaude({
        source: { type: "pdf", data: buffer },
        kind,
        periodHint: period_hint,
        fileName: file_name,
        catalogue,
      });
    } else {
      const sheets = await loadSheets(buffer, mime_type, file_name);
      const parsed = sheetsToLines(sheets, kind);
      if (parsed) {
        output = {
          method: "parser",
          lines: parsed.map((l) => ({
            ...l,
            periodLabel: l.periodLabel ?? period_hint,
          })),
          periodLabel: period_hint,
          periodStart: null,
          periodEnd: null,
          notes: [],
        };
      } else {
        output = await extractWithClaude({
          source: { type: "text", text: sheetsToCsv(sheets) },
          kind,
          periodHint: period_hint,
          fileName: file_name,
          catalogue,
        });
      }
    }

    if (output.lines.length === 0) {
      throw new Error("No statement lines could be extracted from this document.");
    }

    // ---- Proposals stay inside the catalogue; memory overrides the model.
    const sanitized = output.lines.map((l) => ({
      ...l,
      proposedKpiKey:
        l.proposedKpiKey && validKeys.has(l.proposedKpiKey)
          ? l.proposedKpiKey
          : null,
    }));
    const { lines, fromMemory } = applyMappingMemory(sanitized, mappings);

    // ---- Restage: soft-delete any previous run's lines, insert fresh.
    await admin
      .from("extracted_lines")
      .update({ deleted_at: new Date().toISOString() })
      .eq("job_id", jobId)
      .is("deleted_at", null);

    const { error: insertError } = await admin.from("extracted_lines").insert(
      lines.map((l) => ({
        job_id: jobId,
        statement: l.statement,
        source_label: l.sourceLabel,
        amount: l.amount,
        period_label: l.periodLabel,
        period_start: output.periodStart,
        period_end: output.periodEnd,
        segment: l.segment,
        proposed_kpi_key: l.proposedKpiKey,
        confidence: l.confidence,
        provenance: l.provenance,
      })),
    );
    if (insertError) {
      throw new Error(`Could not stage extracted lines: ${insertError.message}`);
    }

    // ---- Gates (never silently passed — stored on the job, ADR-010).
    const gates = runValidationGates({
      lines,
      kind,
      periodStart: output.periodStart,
      periodEnd: output.periodEnd,
    });
    const failures = gateFailures(gates);

    const noteParts = [
      `${lines.length} lines`,
      output.method === "parser" ? "deterministic parse" : "AI extraction",
      fromMemory > 0 ? `${fromMemory} mapped from memory` : null,
      failures.length > 0
        ? `${failures.length} validation check(s) FAILED`
        : "validation checks passed",
      ...output.notes,
    ].filter(Boolean);

    await admin
      .from("ingestion_jobs")
      .update({
        stage: "needs_review",
        stage_note: noteParts.join(" · ").slice(0, 500),
        validation: gates,
      })
      .eq("id", jobId);

    await admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "ingestion.extract",
      target_table: "ingestion_jobs",
      target_id: jobId,
      after: {
        method: output.method,
        line_count: lines.length,
        from_memory: fromMemory,
        gate_failures: failures.map((f) => f.gate),
      },
      metadata: { document_id: job.document.id },
    });

    return { ok: true, lineCount: lines.length, failures: failures.length };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Extraction failed unexpectedly.";
    console.error(`[ingestion] job ${jobId} failed:`, message);

    await admin
      .from("ingestion_jobs")
      .update({ stage: "failed", stage_note: message.slice(0, 500) })
      .eq("id", jobId);

    await admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "ingestion.extract_failed",
      target_table: "ingestion_jobs",
      target_id: jobId,
      after: { error: message.slice(0, 500) },
      metadata: { document_id: job.document.id },
    });

    return { ok: false, error: message };
  }
}
