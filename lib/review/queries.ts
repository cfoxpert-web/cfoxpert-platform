import type { DocumentKind, IngestionStage } from "../documents/model";
import type { GateResult } from "../ingestion/types";
import type { ScopeChoice, SheetScope } from "../ingestion/workbook";
import { createClient } from "../supabase/server";

/**
 * Amendment A4-c — analyst review read path. Authenticated client only:
 * every row these queries can see is granted by an explicit staff RLS
 * policy (jobs/documents/lines since 0013, organizations/kpi_periods
 * since 0015). Non-staff callers simply get empty results — the UI shows
 * an honest "analysts only" state, never a crash.
 */

export type ReviewQueueItem = {
  jobId: string;
  stage: IngestionStage;
  stageNote: string | null;
  updatedAt: string;
  organizationName: string;
  fileName: string;
  kind: DocumentKind;
};

export type ReviewLine = {
  id: string;
  statement: DocumentKind;
  sourceLabel: string;
  amount: number | null;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  segment: string | null;
  proposedKpiKey: string | null;
  /** Projection head the classifier assigned; null = a real exception. */
  proposedHead: string | null;
  /** Grouping key — the line's own period end, from staging. */
  periodKey: string | null;
  /** Confidence in the AMOUNT as read from the source. */
  confidence: number | null;
  /** Confidence in the KPI MAPPING; null when nothing is mapped. */
  mappingConfidence: number | null;
  provenance: string | null;
};

export type ReviewJobDetail = {
  jobId: string;
  stage: IngestionStage;
  stageNote: string | null;
  validation: GateResult[];
  organizationId: string;
  organizationName: string;
  document: {
    fileName: string;
    kind: DocumentKind;
    periodHint: string | null;
    uploadedAt: string;
  };
  lines: ReviewLine[];
  catalogue: { key: string; label: string }[];
  periods: { id: string; label: string; type: string }[];
  /** A4-d-2 scope state: what the workbook offers and what was chosen. */
  scopeOptions: SheetScope[];
  scope: ScopeChoice | null;
  scopeWarnings: string[];
  /** A4-d-3: unit basis applies to any spreadsheet, CSVs included. */
  unitBasis: string | null;
  unitEvidence: { detectedFrom?: string; largestPrintedValue?: number | null } | null;
  mimeType: string;
};

const one = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const supabase = await createClient();

  // rls-scope: cross-org by design — the analyst queue spans every client.
  // The staff RLS policy (migration 0013) IS the boundary here, and the
  // result is never attributed to one organization: each row carries and
  // displays its own. Deliberately unfiltered; see ADR-022.
  const { data, error } = await supabase
    .from("ingestion_jobs")
    .select(
      "id, stage, stage_note, updated_at, organizations ( name ), client_documents ( file_name, kind )",
    )
    .is("deleted_at", null)
    .neq("stage", "published")
    .neq("stage", "rejected")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[review] queue failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const org = one(row.organizations);
    const doc = one(row.client_documents);
    return {
      jobId: row.id as string,
      stage: row.stage as IngestionStage,
      stageNote: (row.stage_note as string | null) ?? null,
      updatedAt: row.updated_at as string,
      organizationName: (org?.name as string | undefined) ?? "Unknown",
      fileName: (doc?.file_name as string | undefined) ?? "Unknown",
      kind: ((doc?.kind as DocumentKind | undefined) ?? "other"),
    };
  });
}

export async function getReviewJobDetail(
  jobId: string,
): Promise<ReviewJobDetail | null> {
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("ingestion_jobs")
    .select(
      "id, stage, stage_note, validation, scope, scope_options, scope_warnings, unit_basis, unit_evidence, organization_id, organizations ( name ), client_documents ( file_name, kind, period_hint, created_at, mime_type )",
    )
    .eq("id", jobId)
    .is("deleted_at", null)
    .single();

  if (error || !job) return null;
  const org = one(job.organizations);
  const doc = one(job.client_documents);
  if (!doc) return null;

  const [linesRes, catRes, periodsRes] = await Promise.all([
    supabase
      .from("extracted_lines")
      .select(
        "id, statement, source_label, amount, period_label, period_start, period_end, segment, proposed_kpi_key, proposed_head, confidence, mapping_confidence, provenance",
      )
      .eq("job_id", jobId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("kpi_definitions")
      .select("key, label")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("kpi_periods")
      .select("id, period_label, period_type")
      .eq("organization_id", job.organization_id as string)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  return {
    jobId: job.id as string,
    stage: job.stage as IngestionStage,
    stageNote: (job.stage_note as string | null) ?? null,
    validation: Array.isArray(job.validation)
      ? (job.validation as GateResult[])
      : [],
    organizationId: job.organization_id as string,
    organizationName: (org?.name as string | undefined) ?? "Unknown",
    document: {
      fileName: doc.file_name as string,
      kind: doc.kind as DocumentKind,
      periodHint: (doc.period_hint as string | null) ?? null,
      uploadedAt: doc.created_at as string,
    },
    lines: (linesRes.data ?? []).map((l) => ({
      id: l.id as string,
      statement: l.statement as DocumentKind,
      sourceLabel: l.source_label as string,
      amount: l.amount === null ? null : Number(l.amount),
      periodLabel: (l.period_label as string | null) ?? null,
      periodStart: (l.period_start as string | null) ?? null,
      periodEnd: (l.period_end as string | null) ?? null,
      segment: (l.segment as string | null) ?? null,
      proposedKpiKey: (l.proposed_kpi_key as string | null) ?? null,
      proposedHead: (l.proposed_head as string | null) ?? null,
      periodKey: (l.period_end as string | null) ?? null,
      confidence: l.confidence === null ? null : Number(l.confidence),
      mappingConfidence:
        l.mapping_confidence === null || l.mapping_confidence === undefined
          ? null
          : Number(l.mapping_confidence),
      provenance: (l.provenance as string | null) ?? null,
    })),
    catalogue: (catRes.data ?? []).map((d) => ({
      key: d.key as string,
      label: d.label as string,
    })),
    scopeOptions: Array.isArray(job.scope_options)
      ? (job.scope_options as SheetScope[])
      : [],
    scope: (job.scope as ScopeChoice | null) ?? null,
    scopeWarnings: Array.isArray(job.scope_warnings)
      ? (job.scope_warnings as string[])
      : [],
    unitBasis: (job.unit_basis as string | null) ?? null,
    unitEvidence:
      job.unit_evidence && typeof job.unit_evidence === "object"
        ? (job.unit_evidence as { detectedFrom?: string; largestPrintedValue?: number | null })
        : null,
    mimeType: (doc.mime_type as string | undefined) ?? "",
    periods: (periodsRes.data ?? []).map((p) => ({
      id: p.id as string,
      label: p.period_label as string,
      type: p.period_type as string,
    })),
  };
}
