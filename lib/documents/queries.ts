import { createClient } from "../supabase/server";
import type { DocumentKind, IngestionStage } from "./model";

/**
 * Amendment A4-a — Documents page read path. Authenticated client only:
 * RLS scopes rows to the viewer's org(s); the coarse job stage is the only
 * pipeline detail members see (event notes are staff-only by policy).
 */

export type DocumentListItem = {
  id: string;
  fileName: string;
  kind: DocumentKind;
  sizeBytes: number;
  periodHint: string | null;
  uploadedAt: string; // ISO
  stage: IngestionStage | null; // null = job row missing (shouldn't happen)
};

export async function getClientDocuments(
  organizationId: string,
): Promise<DocumentListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_documents")
    .select(
      "id, file_name, kind, size_bytes, period_hint, created_at, ingestion_jobs ( stage, deleted_at )",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[documents] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const jobs = Array.isArray(row.ingestion_jobs)
      ? row.ingestion_jobs
      : row.ingestion_jobs
        ? [row.ingestion_jobs]
        : [];
    const liveJob = jobs.find((j) => j.deleted_at === null) ?? null;
    return {
      id: row.id as string,
      fileName: row.file_name as string,
      kind: row.kind as DocumentKind,
      sizeBytes: Number(row.size_bytes),
      periodHint: (row.period_hint as string | null) ?? null,
      uploadedAt: row.created_at as string,
      stage: (liveJob?.stage as IngestionStage | undefined) ?? null,
    };
  });
}
