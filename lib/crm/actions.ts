"use server";

import { z } from "zod";

import { isFeatureEnabled } from "../feature-flags";
import { createClient } from "../supabase/server";

/**
 * Milestone 9 — CRM server actions.
 *
 * All writes go through the AUTHENTICATED client (not service role):
 * RLS's is_internal_staff() policies are the security boundary, and
 * created_by/updated_by carry the true acting analyst. The flag gate
 * (crm) keeps the whole surface dark until enabled.
 */

const notEnabled = { ok: false as const, error: "CRM is not enabled." };
const notAllowed = "You do not have access to CRM.";

const leadSchema = z.object({
  name: z.string().trim().max(200).optional(),
  companyName: z.string().trim().max(200).optional(),
  email: z.string().trim().email().max(320).optional(),
  phone: z.string().trim().max(30).optional(),
  source: z.enum(["health_check", "website", "referral", "manual"]).default("manual"),
  healthCheckSubmissionId: z.string().uuid().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export type CreateLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string };

export async function createLead(
  input: z.infer<typeof leadSchema>,
): Promise<CreateLeadResult> {
  if (!isFeatureEnabled("crm")) return notEnabled;

  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid lead data." };
  const d = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: d.name ?? null,
      company_name: d.companyName ?? null,
      email: d.email ?? null,
      phone: d.phone ?? null,
      source: d.source,
      health_check_submission_id: d.healthCheckSubmissionId ?? null,
      notes: d.notes ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // RLS denial lands here for non-staff — same generic message either way.
    return { ok: false, error: notAllowed };
  }
  return { ok: true, leadId: data.id };
}

const statusSchema = z.enum(["new", "contacted", "qualified", "lost"]);
// Note: 'converted' is deliberately absent — conversion only happens
// through convertLead() below, never as a bare status write.

export async function updateLeadStatus(
  leadId: string,
  status: z.infer<typeof statusSchema>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFeatureEnabled("crm")) return notEnabled;
  if (!z.string().uuid().safeParse(leadId).success || !statusSchema.safeParse(status).success) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("leads")
    .update({ status }, { count: "exact" })
    .eq("id", leadId)
    .is("deleted_at", null);

  if (error || !count) return { ok: false, error: notAllowed };
  return { ok: true };
}

const activitySchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["call", "email", "note", "meeting"]),
  content: z.string().trim().min(1).max(5000),
});

export async function logActivity(
  input: z.infer<typeof activitySchema>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isFeatureEnabled("crm")) return notEnabled;

  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid activity." };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_activities").insert({
    lead_id: parsed.data.leadId,
    type: parsed.data.type,
    content: parsed.data.content,
  });

  if (error) return { ok: false, error: notAllowed };
  return { ok: true };
}

export type ConvertLeadResult =
  | { ok: true; organizationId: string }
  | { ok: false; error: string };

/**
 * Atomic conversion via the convert_lead Postgres function: client org
 * created + submission/scores linked + lead marked converted + audit
 * entry, in one transaction. The function itself re-verifies internal
 * staff — this action is a thin, validated wrapper.
 */
export async function convertLead(
  leadId: string,
  organizationName: string,
): Promise<ConvertLeadResult> {
  if (!isFeatureEnabled("crm")) return notEnabled;

  const name = organizationName.trim();
  if (!z.string().uuid().safeParse(leadId).success || name.length === 0 || name.length > 200) {
    return { ok: false, error: "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_lead", {
    p_lead_id: leadId,
    p_organization_name: name,
  });

  if (error || !data) {
    console.error("[crm] convert_lead failed:", error?.message);
    return { ok: false, error: error?.message?.includes("already converted")
      ? "This lead has already been converted."
      : "Conversion failed." };
  }
  return { ok: true, organizationId: data as string };
}
