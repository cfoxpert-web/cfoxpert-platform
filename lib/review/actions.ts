"use server";

import { revalidatePath } from "next/cache";

import { isFeatureEnabled } from "../feature-flags";
import { normalizeLabel } from "../ingestion/normalize";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";

/**
 * Amendment A4-c — the publish and reject verbs (staff-only).
 *
 * THIS is the only place model-extracted numbers become report numbers
 * (ADR-010): an analyst has looked at every line on the review screen,
 * chosen its KPI mapping, and explicitly clicked Publish. Writes go
 * through the existing insert-only kpi path with document provenance in
 * every value's note; corrections later are new rows (ADR-006).
 *
 * Publishing also CONFIRMS mappings: each published line's label→KPI
 * choice is upserted into account_mappings, so the next upload from this
 * client maps deterministically (the pipeline gets less model-dependent
 * with every publish).
 */

const PERIOD_TYPES = ["monthly", "quarterly", "yearly"] as const;
type PeriodType = (typeof PERIOD_TYPES)[number];

export type PublishLineInput = {
  lineId: string;
  kpiKey: string;
  segment: string | null;
};

export type PublishInput = {
  jobId: string;
  period:
    | { mode: "existing"; periodId: string }
    | {
        mode: "new";
        label: string;
        periodType: string;
        periodStart: string; // YYYY-MM-DD
        periodEnd: string;
      };
  lines: PublishLineInput[];
};

export type ReviewActionResult =
  | { ok: true; published?: number }
  | { ok: false; error: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function requireStaff(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }
> {
  if (!isFeatureEnabled("docIngestion")) {
    return { ok: false, error: "Document ingestion is not enabled." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: isStaff } = await supabase.rpc("is_internal_staff");
  if (isStaff !== true) {
    return { ok: false, error: "Only CFOxpert analysts can do this." };
  }
  return { ok: true, supabase, userId: user.id };
}

export async function publishIngestionJob(
  input: PublishInput,
): Promise<ReviewActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) return gate;
  const { supabase, userId } = gate;

  if (!input || !Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: false, error: "Select at least one line to publish." };
  }

  // ---- Load the job + its live staged lines (staff RLS).
  const { data: job } = await supabase
    .from("ingestion_jobs")
    .select("id, stage, organization_id, client_documents ( file_name )")
    .eq("id", input.jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return { ok: false, error: "Job not found." };
  if (job.stage !== "needs_review") {
    return {
      ok: false,
      error: `Job is at stage '${job.stage}' — only jobs awaiting review can be published.`,
    };
  }
  const orgId = job.organization_id as string;
  const docRaw = job.client_documents;
  const doc = Array.isArray(docRaw) ? docRaw[0] : docRaw;
  const fileName = (doc?.file_name as string | undefined) ?? "document";

  const { data: lineRows } = await supabase
    .from("extracted_lines")
    .select("id, source_label, amount, segment, provenance")
    .eq("job_id", input.jobId)
    .is("deleted_at", null);
  const byId = new Map(
    (lineRows ?? []).map((l) => [l.id as string, l]),
  );

  // ---- Catalogue: key → definition id (the only publishable keys).
  const { data: defRows } = await supabase
    .from("kpi_definitions")
    .select("id, key")
    .eq("active", true);
  const defIdByKey = new Map(
    (defRows ?? []).map((d) => [d.key as string, d.id as string]),
  );

  // ---- Validate the payload before writing anything.
  const seen = new Set<string>();
  const resolved: {
    lineId: string;
    kpiKey: string;
    definitionId: string;
    segment: string | null;
    amount: number;
    sourceLabel: string;
    provenance: string | null;
  }[] = [];

  for (const sel of input.lines) {
    const row = byId.get(sel.lineId);
    if (!row) {
      return { ok: false, error: "A selected line no longer exists — reload and retry." };
    }
    const definitionId = defIdByKey.get(sel.kpiKey);
    if (!definitionId) {
      return { ok: false, error: `'${sel.kpiKey}' is not a valid KPI.` };
    }
    if (row.amount === null) {
      return {
        ok: false,
        error: `"${row.source_label}" has no amount and cannot be published.`,
      };
    }
    const segment =
      typeof sel.segment === "string" && sel.segment.trim() !== ""
        ? sel.segment.trim().slice(0, 100)
        : null;
    const dupKey = `${sel.kpiKey}::${segment ?? ""}`;
    if (seen.has(dupKey)) {
      return {
        ok: false,
        error: `Two selected lines map to the same KPI (${sel.kpiKey}${segment ? `, segment ${segment}` : ""}) — the second would silently supersede the first. Deselect one.`,
      };
    }
    seen.add(dupKey);
    resolved.push({
      lineId: sel.lineId,
      kpiKey: sel.kpiKey,
      definitionId,
      segment,
      amount: Number(row.amount),
      sourceLabel: row.source_label as string,
      provenance: (row.provenance as string | null) ?? null,
    });
  }

  // ---- Resolve the target period.
  const admin = createAdminClient();
  let periodId: string;
  let periodLabel: string;

  if (input.period.mode === "existing") {
    const { data: period } = await supabase
      .from("kpi_periods")
      .select("id, period_label, organization_id")
      .eq("id", input.period.periodId)
      .is("deleted_at", null)
      .single();
    if (!period || (period.organization_id as string) !== orgId) {
      return { ok: false, error: "Selected period not found for this client." };
    }
    periodId = period.id as string;
    periodLabel = period.period_label as string;
  } else {
    const label = input.period.label.trim().slice(0, 50);
    const periodType = input.period.periodType as PeriodType;
    if (label === "") return { ok: false, error: "Period label is required." };
    if (!PERIOD_TYPES.includes(periodType)) {
      return { ok: false, error: "Choose a period type (monthly/quarterly/yearly)." };
    }
    if (
      !ISO_DATE.test(input.period.periodStart) ||
      !ISO_DATE.test(input.period.periodEnd) ||
      input.period.periodStart > input.period.periodEnd
    ) {
      return { ok: false, error: "Period dates are missing or reversed." };
    }
    // Insert-only path is service-role by design (kpi tables have no
    // client write policies); the audit entry below carries the real actor.
    const { data: created, error: periodError } = await admin
      .from("kpi_periods")
      .insert({
        organization_id: orgId,
        period_label: label,
        period_type: periodType,
        period_start: input.period.periodStart,
        period_end: input.period.periodEnd,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (periodError || !created) {
      return {
        ok: false,
        error: periodError?.message.includes("duplicate")
          ? `A period labelled "${label}" already exists for this client — pick it from the list instead.`
          : `Could not create the period: ${periodError?.message ?? "unknown error"}.`,
      };
    }
    periodId = created.id as string;
    periodLabel = label;
  }

  // ---- Publish: insert-only kpi_values with document provenance.
  const { error: valuesError } = await admin.from("kpi_values").insert(
    resolved.map((r) => ({
      kpi_period_id: periodId,
      kpi_definition_id: r.definitionId,
      value: r.amount,
      segment: r.segment,
      note: `Published from ${fileName}${r.provenance ? ` (${r.provenance})` : ""} via ingestion review — source line "${r.sourceLabel}"`,
      created_by: userId,
    })),
  );
  if (valuesError) {
    return { ok: false, error: `Publish failed: ${valuesError.message}` };
  }

  // ---- Confirm mappings (authenticated staff writes — real actor).
  const { data: existingMaps } = await supabase
    .from("account_mappings")
    .select("id, source_label_normalized, kpi_key, segment")
    .eq("organization_id", orgId)
    .is("deleted_at", null);
  const mapByLabel = new Map(
    (existingMaps ?? []).map((m) => [m.source_label_normalized as string, m]),
  );

  for (const r of resolved) {
    const normalized = normalizeLabel(r.sourceLabel);
    if (normalized === "") continue;
    const existing = mapByLabel.get(normalized);
    if (!existing) {
      const { error } = await supabase.from("account_mappings").insert({
        organization_id: orgId,
        source_label_normalized: normalized,
        kpi_key: r.kpiKey,
        segment: r.segment,
        created_by: userId,
        updated_by: userId,
      });
      if (error) console.error("[review] mapping insert failed:", error.message);
      mapByLabel.set(normalized, {
        id: "new",
        source_label_normalized: normalized,
        kpi_key: r.kpiKey,
        segment: r.segment,
      });
    } else if (
      existing.kpi_key !== r.kpiKey ||
      (existing.segment ?? null) !== r.segment
    ) {
      const { error } = await supabase
        .from("account_mappings")
        .update({ kpi_key: r.kpiKey, segment: r.segment, updated_by: userId })
        .eq("id", existing.id as string);
      if (error) console.error("[review] mapping update failed:", error.message);
    }
  }

  // ---- Close the job (authenticated staff update — real actor in events).
  const { error: stageError } = await supabase
    .from("ingestion_jobs")
    .update({
      stage: "published",
      stage_note: `${resolved.length} value(s) published to ${periodLabel}`,
      updated_by: userId,
    })
    .eq("id", input.jobId);
  if (stageError) {
    console.error("[review] stage update failed:", stageError.message);
  }

  // ---- Audit (ADR-005 — service-role writes above demand it).
  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "ingestion.publish",
    target_table: "ingestion_jobs",
    target_id: input.jobId,
    after: {
      period_id: periodId,
      period_label: periodLabel,
      value_count: resolved.length,
      kpi_keys: resolved.map((r) => `${r.kpiKey}${r.segment ? `[${r.segment}]` : ""}`),
    },
    metadata: { organization_id: orgId, file_name: fileName },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/review");
  return { ok: true, published: resolved.length };
}

export async function rejectIngestionJob(
  jobId: string,
  reason: string,
): Promise<ReviewActionResult> {
  const gate = await requireStaff();
  if (!gate.ok) return gate;
  const { supabase, userId } = gate;

  const note = reason.trim().slice(0, 400);
  if (note === "") return { ok: false, error: "Give the client-facing reason." };

  const { data: job } = await supabase
    .from("ingestion_jobs")
    .select("id, stage")
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();
  if (!job) return { ok: false, error: "Job not found." };
  if (job.stage === "published") {
    return { ok: false, error: "Published jobs cannot be rejected." };
  }

  const { error } = await supabase
    .from("ingestion_jobs")
    .update({ stage: "rejected", stage_note: note, updated_by: userId })
    .eq("id", jobId);
  if (error) return { ok: false, error: `Could not reject: ${error.message}` };

  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "ingestion.reject",
    target_table: "ingestion_jobs",
    target_id: jobId,
    after: { reason: note },
  });

  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/review");
  return { ok: true };
}
