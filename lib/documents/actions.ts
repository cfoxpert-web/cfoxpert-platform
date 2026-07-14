"use server";

import { revalidatePath } from "next/cache";

import { isFeatureEnabled } from "../feature-flags";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  isDocumentKind,
  type DocumentKind,
} from "./model";

/**
 * Amendment A4-a — document upload.
 *
 * BOUNDARY DESIGN (ADR-010 + migration 0013's storage note):
 * - DB rows are written with the AUTHENTICATED client, so RLS is the
 *   tenancy boundary and created_by carries the real actor (M9 pattern).
 * - File BYTES go through the service-role client into the private
 *   'client-documents' bucket — clients never touch storage directly, and
 *   the bucket has no client-facing policies. Every service-role write
 *   carries an audit_logs entry (ADR-005).
 * - Staff uploads auto-approve (stage 'approved'); client uploads wait at
 *   'received' for an analyst — enforced belt-and-braces by the
 *   ingestion_jobs insert policy, not just by this action.
 */

const BUCKET = "client-documents";

export type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

/** Strip path separators and control chars; keep something recognizable. */
function sanitizeFileName(name: string): string {
  const cleaned = name
    .replace(/[/\\]/g, "_")
    .replace(/[^\p{L}\p{N}._ ()-]/gu, "_")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 200) : "document";
}

export async function uploadClientDocument(
  formData: FormData,
): Promise<UploadResult> {
  if (!isFeatureEnabled("docIngestion")) {
    return { ok: false, error: "Document upload is not enabled yet." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is larger than the 20 MB limit." };
  }
  if (!(file.type in ACCEPTED_MIME_TYPES)) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a PDF, Excel file, or CSV.",
    };
  }

  const kindRaw = formData.get("kind");
  const kind: DocumentKind =
    typeof kindRaw === "string" && isDocumentKind(kindRaw) ? kindRaw : "other";

  const periodHintRaw = formData.get("periodHint");
  const periodHint =
    typeof periodHintRaw === "string" && periodHintRaw.trim() !== ""
      ? periodHintRaw.trim().slice(0, 100)
      : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in to upload." };

  // Internal staff may upload on a client's behalf by passing the org id
  // (the staff surface arrives with A4-c; the action supports it now).
  const { data: isStaff } = await supabase.rpc("is_internal_staff");
  const requestedOrgId = formData.get("organizationId");

  let organizationId: string | null = null;
  if (isStaff === true && typeof requestedOrgId === "string" && requestedOrgId) {
    organizationId = requestedOrgId;
  } else {
    // Same resolution rule as the dashboard: the user's most recent live
    // membership. Filter by user_id explicitly — RLS shows teammates' rows.
    const { data } = await supabase
      .from("organization_members")
      .select("organization_id, created_at")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1);
    organizationId = data?.[0]?.organization_id ?? null;
  }
  if (!organizationId) {
    return { ok: false, error: "No organization found for your account." };
  }

  const documentId = crypto.randomUUID();
  const fileName = sanitizeFileName(file.name);
  const storagePath = `${organizationId}/${documentId}/${fileName}`;

  // ---- Bytes: service-role storage write (private bucket, lazily created).
  const admin = createAdminClient();
  const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
    public: false,
  });
  if (bucketError && !/already exists/i.test(bucketError.message)) {
    console.error("[documents] bucket ensure failed:", bucketError.message);
    return { ok: false, error: "Upload storage is unavailable. Try again." };
  }

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    console.error("[documents] storage upload failed:", uploadError.message);
    return { ok: false, error: "Could not store the file. Try again." };
  }

  // ---- Rows: authenticated client, RLS-checked, real actor.
  const { error: docError } = await supabase.from("client_documents").insert({
    id: documentId,
    organization_id: organizationId,
    storage_path: storagePath,
    file_name: fileName,
    mime_type: file.type,
    size_bytes: file.size,
    kind,
    period_hint: periodHint,
    uploaded_by_staff: isStaff === true,
    created_by: user.id,
    updated_by: user.id,
  });
  if (docError) {
    console.error("[documents] document insert failed:", docError.message);
    await admin.storage.from(BUCKET).remove([storagePath]); // no orphan bytes
    return { ok: false, error: "Could not record the upload. Try again." };
  }

  const { error: jobError } = await supabase.from("ingestion_jobs").insert({
    organization_id: organizationId,
    document_id: documentId,
    stage: isStaff === true ? "approved" : "received",
    created_by: user.id,
    updated_by: user.id,
  });
  if (jobError) {
    // Document row exists without a job — recoverable by staff, but log loudly.
    console.error("[documents] job insert failed:", jobError.message);
  }

  // ---- Audit (ADR-005): required — a service-role write happened above.
  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_id: user.id,
    action: "document.upload",
    target_table: "client_documents",
    target_id: documentId,
    after: {
      organization_id: organizationId,
      file_name: fileName,
      size_bytes: file.size,
      kind,
      staff: isStaff === true,
    },
    metadata: { bucket: BUCKET, storage_path: storagePath },
  });
  if (auditError) {
    console.error("[documents] audit log failed:", auditError.message);
  }

  revalidatePath("/dashboard/documents");
  return { ok: true, documentId };
}
