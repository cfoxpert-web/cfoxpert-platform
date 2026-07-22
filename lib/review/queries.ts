import type { DocumentKind, IngestionStage } from "../documents/model";
import type { GateResult } from "../ingestion/types";
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
  confidence: number | null;
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
};

const one = <T>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export async function getReviewQueue(): Promise<ReviewQueueItem[]> {
  const supabase = await createClient();

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
      "id, stage, stage_note, validation, organization_id, organizations ( name ), client_documents ( file_name, kind, period_hint, created_at )",
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
        "id, statement, source_label, amount, period_label, period_start, period_end, segment, proposed_kpi_key, confidence, provenance",
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
      confidence: l.confidence === null ? null : Number(l.confidence),
      provenance: (l.provenance as string | null) ?? null,
    })),
    catalogue: (catRes.data ?? []).map((d) => ({
      key: d.key as string,
      label: d.label as string,
    })),
    periods: (periodsRes.data ?? []).map((p) => ({
      id: p.id as string,
      label: p.period_label as string,
      type: p.period_type as string,
    })),
  };
}
