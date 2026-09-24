"use server";

import { revalidatePath } from "next/cache";

import { isFeatureEnabled } from "../feature-flags";
import { normalizeLabel } from "../ingestion/normalize";
import type { GateResult } from "../ingestion/types";
import { findPeriodCollisions } from "../ingestion/period";
import {
  UNIT_MULTIPLIER,
  isUnitBasisName,
  normalizeSegment,
  type UnitBasisName,
} from "../ingestion/workbook";
import { rollUpToKpis } from "../kpi/rollup";
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
  /**
   * The projection head. Replaces the old per-line KPI choice: a line
   * belongs to a head, and the head → KPI rollup is declared as versioned
   * data (ADR-018), not chosen row by row. Null = still unclassified; the
   * line is STILL PUBLISHED and still counted in unclassified_value.
   */
  head: string | null;
  segment: string | null;
};

/** One resolution per DISTINCT staged period, keyed by the line's period_end. */
export type PublishPeriodInput = {
  /** `extracted_lines.period_end` — the column's own canonical date. */
  periodKey: string;
} & (
  | { mode: "existing"; periodId: string }
  | {
      mode: "new";
      label: string;
      periodType: string;
      periodStart: string; // YYYY-MM-DD
      periodEnd: string;
    }
);

export type PublishInput = {
  jobId: string;
  /**
   * A publish can span several periods. Scoping two columns stages both
   * years; publishing them into ONE period merged FY 2025-26 into
   * FY 2026-27 — on this client roughly ₹38,012 L of revenue for a company
   * doing 20,200 — into an insert-only table.
   */
  periods: PublishPeriodInput[];
  lines: PublishLineInput[];
};

export type ReviewActionResult =
  | {
      ok: true;
      published?: number;
      /** Rupee value published but sitting outside the rollup. */
      unclassifiedTotal?: number;
      unclassifiedCount?: number;
      /** One entry per period this publish wrote into. */
      periods?: { label: string; lines: number; unclassified: number }[];
    }
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
    .select(
      "id, stage, organization_id, validation, unit_basis, scope, document_id, client_documents ( file_name )",
    )
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

  // ---- A4-d: a FAILED validation gate blocks publication.
  // The gates were computed and stored at extraction, and the review screen
  // showed them — but nothing ever read them here, so a balance sheet whose
  // assets did not equal its liabilities published on one click. Gates prove
  // internal consistency only (ADR-010), so passing them is not permission
  // to publish; failing one is a refusal.
  const gateResults: GateResult[] = Array.isArray(job.validation)
    ? (job.validation as GateResult[])
    : [];
  const failedGates = gateResults.filter((g) => g.status === "fail");
  if (failedGates.length > 0) {
    const detail = failedGates
      .map((g) => `${g.gate}: ${g.detail}`)
      .join(" · ");
    return {
      ok: false,
      error: `${failedGates.length} validation check(s) failed and must be resolved before publishing — ${detail}. Reject the job and re-extract, or fix the source document and upload again.`,
    };
  }
  const orgId = job.organization_id as string;
  const docRaw = job.client_documents;
  const doc = Array.isArray(docRaw) ? docRaw[0] : docRaw;
  const fileName = (doc?.file_name as string | undefined) ?? "document";
  const documentId = job.document_id as string;
  const admin = createAdminClient();

  // Provenance the published line must carry, resolved once (ADR-015).
  const unitBasis: UnitBasisName = isUnitBasisName(job.unit_basis)
    ? job.unit_basis
    : "rupees";
  const scopeSource =
    job.scope && typeof job.scope === "object" && "source" in job.scope
      ? String((job.scope as { source?: unknown }).source ?? "")
      : null;
  /** "26-27 Projection!I8" → "26-27 Projection" */
  const sheetOf = (provenance: string | null): string | null => {
    if (!provenance) return null;
    const bang = provenance.lastIndexOf("!");
    return bang > 0 ? provenance.slice(0, bang) : null;
  };

  const { data: lineRows } = await supabase
    .from("extracted_lines")
    .select("id, source_label, amount, segment, provenance, period_label, period_end")
    .eq("job_id", input.jobId)
    .is("deleted_at", null);
  const byId = new Map(
    (lineRows ?? []).map((l) => [l.id as string, l]),
  );

  // ---- The head → KPI map, at its CURRENT version. Whatever version is in
  // force at publish time is stamped on every value this publish writes, so
  // a later remap can never turn this period into a false reconciliation
  // failure (migration 0023).
  const { data: mapVersionRow } = await admin.rpc("current_head_map_version");
  const headMapVersion =
    typeof mapVersionRow === "number" ? mapVersionRow : 1;
  const { data: mapRows } = await admin
    .from("head_kpi_map")
    .select("head, kpi_key")
    .eq("version", headMapVersion);
  const headToKpi: Record<string, string> = {};
  for (const row of mapRows ?? []) {
    headToKpi[row.head as string] = row.kpi_key as string;
  }

  const { data: defRows } = await supabase
    .from("kpi_definitions")
    .select("id, key")
    .eq("active", true);
  const defIdByKey = new Map(
    (defRows ?? []).map((d) => [d.key as string, d.id as string]),
  );

  // ---- Validate the payload before writing anything.
  //
  // NOTE what is NOT here any more: the rule rejecting two lines that map to
  // the same KPI. Under the old KPI-level store the second row would have
  // silently superseded the first, so refusing was right. At line level
  // MANY-TO-ONE IS THE NORMAL CASE — twenty-three admin lines roll up to one
  // Indirect Expenses figure — so the rule is REPLACED by the rollup, not
  // relaxed. Duplicate SOURCE LINES are still refused below.
  const seenLines = new Set<string>();
  const resolved: {
    lineId: string;
    head: string | null;
    headStatus: "classified" | "unclassified";
    segment: string | null;
    amount: number;
    sourceLabel: string;
    provenance: string | null;
    /** The line's OWN period, from staging. Never the scope span. */
    periodKey: string;
    periodLabel: string | null;
  }[] = [];

  for (const sel of input.lines) {
    const row = byId.get(sel.lineId);
    if (!row) {
      return { ok: false, error: "A selected line no longer exists — reload and retry." };
    }
    if (seenLines.has(sel.lineId)) {
      return { ok: false, error: "The same source line is selected twice." };
    }
    seenLines.add(sel.lineId);

    if (row.amount === null) {
      return {
        ok: false,
        error: `"${row.source_label}" has no amount and cannot be published.`,
      };
    }
    const head = sel.head === null || sel.head === "" ? null : sel.head;
    if (head !== null && !(head in headToKpi)) {
      return {
        ok: false,
        error: `'${head}' is not a projection head in map version ${headMapVersion}.`,
      };
    }
    // An operator who types "Total" means the same thing the workbook did.
    // One rule, applied wherever a segment name enters the system.
    const segment = normalizeSegment(
      typeof sel.segment === "string" ? sel.segment.slice(0, 100) : null,
    );

    const periodKey = (row.period_end as string | null) ?? null;
    if (!periodKey) {
      return {
        ok: false,
        error: `"${row.source_label}" has no period recorded — re-extract the document before publishing.`,
      };
    }

    resolved.push({
      lineId: sel.lineId,
      head,
      headStatus: head === null ? "unclassified" : "classified",
      segment,
      amount: Number(row.amount),
      sourceLabel: row.source_label as string,
      provenance: (row.provenance as string | null) ?? null,
      periodKey,
      periodLabel: (row.period_label as string | null) ?? null,
    });
  }

  // ---- Every staged period in this publish must have a resolution.
  const stagedKeys = [...new Set(resolved.map((r) => r.periodKey))].sort();
  const byKey = new Map(input.periods.map((p) => [p.periodKey, p]));
  const unresolved = stagedKeys.filter((k) => !byKey.has(k));
  if (unresolved.length > 0) {
    return {
      ok: false,
      error: `No period was chosen for ${unresolved.join(", ")} — every staged period needs one before publishing.`,
    };
  }

  // ---- No two selected lines may share (period, segment, label): under
  // statement_lines_current the later row supersedes the earlier one, so
  // one of the two figures would silently vanish from the fact table.
  const identity = new Set<string>();
  for (const r of resolved) {
    const key = `${r.periodKey}|${r.segment ?? ""}|${normalizeLabel(r.sourceLabel)}`;
    if (identity.has(key)) {
      return {
        ok: false,
        error: `"${r.sourceLabel}" is selected twice for the same period and unit — the second would supersede the first. Deselect one.`,
      };
    }
    identity.add(key);
  }

  // ---- Resolve EVERY staged period to its own target. One per period.
  const targets = new Map<string, { id: string; label: string }>();
  for (const key of stagedKeys) {
    const spec = byKey.get(key);
    if (!spec) continue; // unreachable: checked above

    if (spec.mode === "existing") {
      const { data: period } = await supabase
        .from("kpi_periods")
        .select("id, period_label, organization_id")
        .eq("id", spec.periodId)
        .is("deleted_at", null)
        .single();
      if (!period || (period.organization_id as string) !== orgId) {
        return { ok: false, error: `Selected period for ${key} not found for this client.` };
      }
      targets.set(key, {
        id: period.id as string,
        label: period.period_label as string,
      });
      continue;
    }

    const label = spec.label.trim().slice(0, 50);
    const periodType = spec.periodType as PeriodType;
    if (label === "") return { ok: false, error: `Period label is required for ${key}.` };
    if (!PERIOD_TYPES.includes(periodType)) {
      return { ok: false, error: `Choose a period type for ${label} (monthly/quarterly/yearly).` };
    }
    if (
      !ISO_DATE.test(spec.periodStart) ||
      !ISO_DATE.test(spec.periodEnd) ||
      spec.periodStart > spec.periodEnd
    ) {
      return { ok: false, error: `Period dates for ${label} are missing or reversed.` };
    }
    // Insert-only path is service-role by design (kpi tables have no
    // client write policies); the audit entry below carries the real actor.
    const { data: created, error: periodError } = await admin
      .from("kpi_periods")
      .insert({
        organization_id: orgId,
        period_label: label,
        period_type: periodType,
        period_start: spec.periodStart,
        period_end: spec.periodEnd,
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
    targets.set(key, { id: created.id as string, label });
  }

  // ---- THE RAIL. Two DISTINCT staged periods must never land in the same
  // target period. Segment is deliberately NOT part of this check: Dhaulana
  // and Greater Noida both publishing into FY 2026-27 as separate segments
  // is per-segment publishing working (ADR-014), not a collision. Segment is
  // a dimension WITHIN a period; only period-to-period mapping can merge.
  const collisions = findPeriodCollisions(
    stagedKeys.map((key) => ({
      periodKey: key,
      targetPeriodId: targets.get(key)?.id ?? "",
      label: targets.get(key)?.label ?? key,
    })),
  );
  if (collisions.length > 0) {
    const first = collisions[0];
    return {
      ok: false,
      error:
        `${first?.periodKeys.join(" and ")} would both publish into "${first?.label}", ` +
        `merging different periods into one. Give each staged period its own target — ` +
        `published values are insert-only and cannot be unmerged.`,
    };
  }

  // ---- Publish, in one direction: LINES ARE THE FACT TABLE (ADR-018).
  // Every selected line is written to statement_lines with full provenance —
  // including the unclassified ones, because a fact table that omits rows
  // cannot be reconciled to its source, and reconciling to the client's own
  // figures is this feature's entire trust model.
  const factRows = resolved.map((r, index) => ({
    id: crypto.randomUUID(),
    organization_id: orgId,
    kpi_period_id: targets.get(r.periodKey)?.id ?? "",
    segment: r.segment,
    source_label: r.sourceLabel,
    source_label_normalized: normalizeLabel(r.sourceLabel),
    head: r.head,
    head_status: r.headStatus,
    sort_order: index,
    amount: r.amount,
    document_id: documentId,
    job_id: input.jobId,
    extracted_line_id: r.lineId,
    source_sheet: sheetOf(r.provenance),
    source_cell: r.provenance,
    unit_basis: unitBasis,
    unit_multiplier: UNIT_MULTIPLIER[unitBasis],
    scope_source: scopeSource,
    created_by: userId,
  }));

  const { error: linesError } = await admin
    .from("statement_lines")
    .insert(factRows);
  if (linesError) {
    return { ok: false, error: `Publish failed: ${linesError.message}` };
  }

  // ---- Then DERIVE kpi_values from those lines, PER PERIOD. Never the
  // other way round (ADR-018). Rolling up across periods is precisely the
  // merge the rail above refuses; doing it here would reintroduce it after
  // the check had passed.
  const valueRows: {
    kpi_period_id: string;
    kpi_definition_id: string;
    value: number;
    segment: string | null;
    source_statement_line_ids: string[];
    head_map_version: number;
    note: string;
    created_by: string;
  }[] = [];
  let unclassifiedTotal = 0;
  let unclassifiedCount = 0;
  const publishedPeriods: { label: string; lines: number; unclassified: number }[] = [];

  for (const key of stagedKeys) {
    const target = targets.get(key);
    if (!target) continue;
    const periodRows = factRows.filter((l) => l.kpi_period_id === target.id);
    if (periodRows.length === 0) continue;

    const rollup = rollUpToKpis(
      periodRows.map((l) => ({
        id: l.id,
        segment: l.segment,
        sourceLabel: l.source_label,
        head: l.head,
        headStatus: l.head_status,
        amount: l.amount,
      })),
      { version: headMapVersion, entries: headToKpi },
    );

    unclassifiedTotal += rollup.unclassified.total;
    unclassifiedCount += rollup.unclassified.lineCount;
    publishedPeriods.push({
      label: target.label,
      lines: periodRows.length,
      unclassified: rollup.unclassified.total,
    });

    for (const v of rollup.values) {
      const definitionId = defIdByKey.get(v.kpiKey);
      if (!definitionId) continue;
      valueRows.push({
        kpi_period_id: target.id,
        kpi_definition_id: definitionId,
        value: v.value,
        segment: v.segment,
        source_statement_line_ids: v.sourceLineIds,
        head_map_version: v.headMapVersion,
        note: `Rolled up from ${v.sourceLineIds.length || rollup.unclassified.lineCount} line(s) in ${fileName} via ingestion review (head map v${v.headMapVersion})`,
        created_by: userId,
      });
    }
  }

  if (valueRows.length > 0) {
    const { error: valuesError } = await admin.from("kpi_values").insert(valueRows);
    if (valuesError) {
      return { ok: false, error: `Publish failed at rollup: ${valuesError.message}` };
    }
  }

  // ---- Confirm mappings (authenticated staff writes — real actor).
  // Publishing IS the confirmation: an operator who overrode the classifier
  // has taught it, and the correction applies deterministically on this
  // client's next upload (ADR-017).
  const { data: existingMaps } = await supabase
    .from("account_mappings")
    .select("id, source_label_normalized, head, segment")
    .eq("organization_id", orgId)
    .is("deleted_at", null);
  const mapByLabel = new Map(
    (existingMaps ?? []).map((m) => [m.source_label_normalized as string, m]),
  );

  for (const r of resolved) {
    if (r.head === null) continue; // nothing confirmed to remember
    const normalized = normalizeLabel(r.sourceLabel);
    if (normalized === "") continue;
    const existing = mapByLabel.get(normalized);
    if (!existing) {
      const { error } = await supabase.from("account_mappings").insert({
        organization_id: orgId,
        source_label_normalized: normalized,
        head: r.head,
        segment: r.segment,
        created_by: userId,
        updated_by: userId,
      });
      if (error) console.error("[review] mapping insert failed:", error.message);
      mapByLabel.set(normalized, {
        id: "new",
        source_label_normalized: normalized,
        head: r.head,
        segment: r.segment,
      });
    } else if (
      existing.head !== r.head ||
      (existing.segment ?? null) !== r.segment
    ) {
      const { error } = await supabase
        .from("account_mappings")
        .update({ head: r.head, segment: r.segment, updated_by: userId })
        .eq("id", existing.id as string);
      if (error) console.error("[review] mapping update failed:", error.message);
    }
  }

  // ---- Close the job (authenticated staff update — real actor in events).
  const { error: stageError } = await supabase
    .from("ingestion_jobs")
    .update({
      stage: "published",
      stage_note:
        `${resolved.length} line(s) published across ${publishedPeriods.length} period(s): ` +
        publishedPeriods.map((p) => `${p.label} (${p.lines})`).join(", ") +
        (unclassifiedCount > 0
          ? ` · ₹${unclassifiedTotal.toLocaleString("en-IN")} across ${unclassifiedCount} line(s) still unclassified`
          : ""),
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
      periods: publishedPeriods,
      line_count: resolved.length,
      value_count: valueRows.length,
      head_map_version: headMapVersion,
      unclassified_total: unclassifiedTotal,
      unclassified_count: unclassifiedCount,
    },
    metadata: { organization_id: orgId, file_name: fileName },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/review");
  return {
    ok: true,
    published: resolved.length,
    unclassifiedTotal,
    unclassifiedCount,
    periods: publishedPeriods,
  };
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
