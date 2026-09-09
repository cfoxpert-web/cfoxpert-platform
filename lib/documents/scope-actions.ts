"use server";

import { revalidatePath } from "next/cache";

import { isFeatureEnabled } from "../feature-flags";
import { runExtraction } from "../ingestion/run";
import { loadSheetsForScope } from "../ingestion/load-sheets";
import {
  autoSelectScope,
  describeWorkbook,
  fingerprintWorkbook,
  isUnitBasisName,
  validateScopeChoice,
  type ScopeChoice,
  type SheetScope,
  type UnitBasisName,
} from "../ingestion/workbook";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import { STORAGE_BUCKET } from "./model";

/**
 * Amendment A4-d-2 — resolving scope before anything is staged.
 *
 * Two verbs:
 *   introspectDocument — reads what the workbook OFFERS. Writes no lines,
 *     stages nothing, makes no decision it cannot justify. Auto-selects a
 *     scope only where there is exactly one plausible reading.
 *   setJobScope — the operator's choice, validated against what was
 *     actually detected and then handed to extraction.
 *
 * The approve-to-process gate is untouched (ADR-010). Approval still
 * happens in `processIngestionJob`; scope merely arrives pre-filled when
 * it can be. Auto-selection fills a field, it does not skip a step.
 */

export type ScopeActionResult = { ok: true } | { ok: false; error: string };

/** The picker's view of one job. */
export type JobScopeState = {
  jobId: string;
  stage: string;
  fileName: string;
  organizationName: string;
  options: SheetScope[];
  scope: ScopeChoice | null;
  warnings: string[];
};

async function requireStaff() {
  if (!isFeatureEnabled("docIngestion")) {
    return { ok: false as const, error: "Document ingestion is not enabled." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const { data: isStaff } = await supabase.rpc("is_internal_staff");
  if (isStaff !== true) {
    return { ok: false as const, error: "Only CFOxpert analysts can set a document's scope." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

/**
 * Read the workbook's structure and record what it offers.
 *
 * Runs with the service role because it happens right after upload, before
 * any human is involved; it only ever WRITES to the job it was given, and
 * writes an audit entry. Safe to re-run: it recomputes options from the
 * bytes and never touches an already-resolved scope.
 */
export async function introspectDocument(
  jobId: string,
  actorId: string | null,
): Promise<ScopeActionResult> {
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("ingestion_jobs")
    .select(
      "id, stage, scope, document:client_documents ( storage_path, mime_type, file_name )",
    )
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return { ok: false, error: "Job not found." };

  const docRaw = job.document;
  const doc = Array.isArray(docRaw) ? docRaw[0] : docRaw;
  if (!doc) return { ok: false, error: "Job has no document." };

  // An already-resolved scope is an operator's decision. Never overwrite it.
  if (job.scope !== null && job.scope !== undefined) {
    return { ok: true };
  }

  // CSVs are deliberately NOT scoped. A CSV is one sheet with no name, no
  // tiered header and no segment columns, so scoping it offers the operator
  // nothing while changing a path that works today. It keeps the legacy
  // unscoped extraction. Multi-sheet workbooks are where scope earns its
  // keep, and a single-sheet XLSX still auto-selects.
  const fileName = doc.file_name as string;
  const mimeType = doc.mime_type as string;
  const isCsv = mimeType === "text/csv" || /\.csv$/i.test(fileName);

  const fail = async (reason: string): Promise<ScopeActionResult> => {
    // A4-d-3: introspection runs in `after()`, which can time out, hit a
    // memory ceiling, or meet a malformed file. Swallowing that left the
    // job with no scope data and the operator staring at an empty picker
    // with no way to act — the exact "looks broken, no explanation" state
    // this milestone exists to remove. Record it and let the route offer
    // a retry; the bytes are already in storage, so re-running is cheap.
    await admin
      .from("ingestion_jobs")
      .update({
        scope_options: [],
        scope_warnings: [`Could not read this workbook: ${reason}`],
      })
      .eq("id", jobId);
    await admin.from("audit_logs").insert({
      actor_id: actorId,
      action: "ingestion.introspect_failed",
      target_table: "ingestion_jobs",
      target_id: jobId,
      after: { error: reason.slice(0, 500) },
    });
    return { ok: false, error: reason };
  };

  const { data: blob, error: dlError } = await admin.storage
    .from(STORAGE_BUCKET)
    .download(doc.storage_path as string);
  if (dlError || !blob) {
    return fail(dlError?.message ?? "the stored file could not be downloaded");
  }

  let sheets;
  let readWarnings: string[];
  try {
    const loaded = await loadSheetsForScope(
      Buffer.from(await blob.arrayBuffer()),
      mimeType,
      fileName,
    );
    sheets = loaded.sheets;
    readWarnings = loaded.warnings;
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "the file could not be parsed",
    );
  }
  if (sheets === null) return { ok: true };

  // CSVs get a unit basis but NOT sheet scope: one sheet, no name, no
  // tiered header, no segments, so sheet selection offers nothing while
  // changing a path that works. The unit still matters exactly as much.
  const options = isCsv ? [] : describeWorkbook(sheets);
  const fingerprint = fingerprintWorkbook(sheets, options);
  const auto = isCsv
    ? ({ autoSelected: false, because: "CSVs are read whole — no sheet to choose." } as const)
    : autoSelectScope(options);

  // Largest printed figure across everything read: the evidence an operator
  // judges the unit basis against, and available even for a CSV.
  let largestPrintedValue: number | null = null;
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (typeof cell !== "number" || !Number.isFinite(cell)) continue;
        const abs = Math.abs(cell);
        if (largestPrintedValue === null || abs > largestPrintedValue) {
          largestPrintedValue = abs;
        }
      }
    }
  }
  const detectedUnit = options.find((o) => o.plausible)?.unit ?? null;
  const unitBasis: UnitBasisName = detectedUnit?.basis ?? "rupees";
  const unitEvidence = {
    detectedFrom:
      detectedUnit?.detectedFrom ?? "no unit stated in the file — assumed rupees",
    largestPrintedValue,
  };

  const warnings = [...readWarnings];
  if (unitEvidence.detectedFrom.startsWith("no unit stated")) {
    warnings.push(
      `No unit is stated in this file. Assumed rupees${
        largestPrintedValue !== null
          ? ` — the largest figure in it is ${largestPrintedValue.toLocaleString("en-IN")}`
          : ""
      }. Confirm before publishing: reading rupees as lakhs is a 100,000× error that still balances.`,
    );
  }
  if (!auto.autoSelected && !isCsv) warnings.push(auto.because);

  const { error: updateError } = await admin
    .from("ingestion_jobs")
    .update({
      scope_options: options,
      workbook_fingerprint: fingerprint,
      scope_warnings: warnings,
      scope: auto.autoSelected ? auto.choice : null,
      unit_basis: unitBasis,
      unit_evidence: unitEvidence,
    })
    .eq("id", jobId);
  if (updateError) {
    return { ok: false, error: `Could not record the scope: ${updateError.message}` };
  }

  await admin.from("audit_logs").insert({
    actor_id: actorId,
    action: "ingestion.introspect",
    target_table: "ingestion_jobs",
    target_id: jobId,
    after: {
      sheets: options.length,
      plausible_sheets: options.filter((o) => o.plausible).length,
      auto_selected: auto.autoSelected,
      because: auto.because,
      fingerprint: fingerprint.hash,
    },
  });

  return { ok: true };
}

/**
 * The operator's scope decision. Validated against what the workbook was
 * actually found to offer — a scope naming a sheet, segment or date that is
 * not there is REFUSED, never coerced to the nearest match.
 *
 * On success the job moves to `approved` and extraction runs, which is the
 * same transition `processIngestionJob` performs; the scope decision simply
 * replaces the click that would otherwise have made it.
 */
export async function setJobScope(
  jobId: string,
  choice: Omit<ScopeChoice, "source">,
): Promise<ScopeActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) return gate;
  const { supabase, userId } = gate;

  const { data: job } = await supabase
    .from("ingestion_jobs")
    .select("id, stage, scope_options")
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return { ok: false, error: "Job not found." };

  if (job.stage === "published" || job.stage === "rejected") {
    return {
      ok: false,
      error: `This job is ${job.stage} — its scope can no longer be changed.`,
    };
  }
  if (job.stage === "extracting") {
    return { ok: false, error: "This document is already being processed." };
  }

  const options = Array.isArray(job.scope_options)
    ? (job.scope_options as SheetScope[])
    : [];
  if (options.length === 0) {
    return {
      ok: false,
      error: "This document has not been read yet — re-run introspection first.",
    };
  }

  const resolved: ScopeChoice = { ...choice, source: "operator" };
  const validation = validateScopeChoice(options, resolved);
  if (!validation.ok) return { ok: false, error: validation.error };

  const { error } = await supabase
    .from("ingestion_jobs")
    .update({ scope: resolved, stage: "approved", updated_by: userId })
    .eq("id", jobId);
  if (error) {
    return { ok: false, error: `Could not save the scope: ${error.message}` };
  }

  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "ingestion.scope_set",
    target_table: "ingestion_jobs",
    target_id: jobId,
    after: resolved,
  });

  const result = await runExtraction(jobId, userId);
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/review");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

/**
 * Does this job still need a human to choose its scope?
 *
 * True only when the workbook offered readings AND none was auto-selected.
 * A PDF (no `scope_options`) and an auto-selected workbook both answer no.
 */
export async function jobNeedsScope(jobId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("ingestion_jobs")
    .select("scope, scope_options")
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return false;
  const options = Array.isArray(job.scope_options) ? job.scope_options : [];
  const hasPlausible = (options as SheetScope[]).some((o) => o.plausible);
  return hasPlausible && (job.scope === null || job.scope === undefined);
}

/**
 * Park an approved job that needs a scope decision.
 *
 * This is NOT a new gate. Approval has already happened; the job is simply
 * waiting on a choice that only a human can make, and `awaiting_scope`
 * makes that visible in the queue instead of leaving it looking stalled.
 */
export async function parkForScope(
  jobId: string,
  because: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("ingestion_jobs")
    .update({
      stage: "awaiting_scope",
      stage_note: `Waiting for a scope decision — ${because}`.slice(0, 500),
    })
    .eq("id", jobId);
}

/**
 * Set the unit the source figures are printed in, and re-read the document.
 *
 * Applies to every spreadsheet-family upload, CSVs included: unit basis is
 * not part of sheet scope. Changing it changes every amount by orders of
 * magnitude, so extraction re-runs rather than leaving stale figures staged.
 */
export async function setJobUnitBasis(
  jobId: string,
  basis: UnitBasisName,
): Promise<ScopeActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) return gate;
  const { supabase, userId } = gate;

  if (!isUnitBasisName(basis)) {
    return { ok: false, error: `"${String(basis)}" is not a unit basis.` };
  }

  const { data: job } = await supabase
    .from("ingestion_jobs")
    .select("id, stage, unit_basis")
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return { ok: false, error: "Job not found." };
  if (job.stage === "published") {
    return {
      ok: false,
      error:
        "This job is published — its figures are already in the report. Correct them with a new upload (values are insert-only).",
    };
  }
  if (job.stage === "rejected") {
    return { ok: false, error: "This job was rejected." };
  }
  if (job.stage === "extracting") {
    return { ok: false, error: "This document is already being processed." };
  }

  const { error } = await supabase
    .from("ingestion_jobs")
    .update({ unit_basis: basis, updated_by: userId })
    .eq("id", jobId);
  if (error) {
    return { ok: false, error: `Could not save the unit: ${error.message}` };
  }

  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "ingestion.unit_basis_set",
    target_table: "ingestion_jobs",
    target_id: jobId,
    before: { unit_basis: job.unit_basis ?? null },
    after: { unit_basis: basis },
  });

  // Only re-extract a job that has already been read; one still waiting on
  // scope or approval will pick the new basis up when it runs.
  if (job.stage === "needs_review" || job.stage === "failed") {
    await admin.from("ingestion_jobs").update({ stage: "approved" }).eq("id", jobId);
    const result = await runExtraction(jobId, userId);
    if (!result.ok) return { ok: false, error: result.error };
  }

  revalidatePath("/dashboard/review");
  return { ok: true };
}

/**
 * Re-run introspection after a failure. The bytes are already in storage,
 * so this is cheap — and it is the difference between an operator who can
 * act and one looking at a job that appears stalled.
 */
export async function retryIntrospection(jobId: string): Promise<ScopeActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) return gate;
  const result = await introspectDocument(jobId, gate.userId);
  revalidatePath("/dashboard/review");
  return result;
}
