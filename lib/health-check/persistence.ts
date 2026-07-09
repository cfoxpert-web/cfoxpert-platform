"use server";

import { z } from "zod";

import { env } from "../env";
import { isFeatureEnabled } from "../feature-flags";
import { createAdminClient } from "../supabase/admin";
import { computeHealthCheckResult, type AnswerMap } from "./score-engine";

/**
 * Milestone 8 — Health Check persistence (final form, real shapes).
 *
 * ORDERING (frozen roadmap rule): persist FIRST; the webhook fires only
 * as a side effect of a successful write.
 *
 * SCORE PROVENANCE — caveat CLOSED: the score is recomputed SERVER-SIDE
 * from the raw answers through the same pure computeHealthCheckResult()
 * the UI uses. The client's displayed result is never trusted or stored.
 *
 * Flag-gated: healthCheckPersistence OFF (default) → no-op; the page
 * keeps today's webhook-only behavior.
 */

const inputSchema = z.object({
  contact: z.object({
    name: z.string().trim().min(2).max(200),
    phone: z.string().trim().max(20),
    email: z.string().trim().email().max(320),
  }),
  answers: z.record(z.string(), z.number().min(0).max(100)),
});

export type PersistHealthCheckInput = z.infer<typeof inputSchema>;

export type PersistResult =
  | { ok: true; submissionId: string | null }
  | { ok: false; error: string };

export async function persistHealthCheckSubmission(
  input: PersistHealthCheckInput,
): Promise<PersistResult> {
  if (!isFeatureEnabled("healthCheckPersistence")) {
    return { ok: true, submissionId: null };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid submission data." };
  }
  const { contact, answers } = parsed.data;

  // Server-side recompute — the stored score's single source of truth.
  const result = computeHealthCheckResult(answers as AnswerMap);

  const admin = createAdminClient();

  // 1. The submission (the record that must never be lost).
  const { data: submission, error: subError } = await admin
    .from("health_check_submissions")
    .insert({
      submitted_name: contact.name,
      submitted_email: contact.email,
      company_name: null,
      answers,
      source: "website",
    })
    .select("id")
    .single();

  if (subError || !submission) {
    console.error("[health-check] persist failed:", subError?.message);
    return { ok: false, error: "Could not save your submission. Please try again." };
  }

  // 2. The score (insert-only; recomputes are new rows).
  const { error: scoreError } = await admin.from("health_scores").insert({
    submission_id: submission.id,
    overall_score: result.overallScore,
    grade: result.grade,
    driver_scores: result.driverScores, // DriverScore[] — {key, score, weight}
  });
  if (scoreError) {
    console.error("[health-check] score persist failed:", scoreError.message);
  }

  // 3. Audit trail (ADR-005).
  const { error: auditError } = await admin.from("audit_logs").insert({
    action: "health_check.submit",
    target_table: "health_check_submissions",
    target_id: submission.id,
    after: { email: contact.email, score: result.overallScore, grade: result.grade },
    metadata: { source: "website" },
  });
  if (auditError) {
    console.error("[health-check] audit log failed:", auditError.message);
  }

  // 4. Webhook — same payload shape the existing flow sends, so any
  // downstream consumer (n8n, Sheets, CRM) keeps working unchanged.
  if (env.NEXT_PUBLIC_WEBHOOK_URL) {
    try {
      await fetch(env.NEXT_PUBLIC_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "health_check_completed",
          contact,
          answers,
          result,
          submissionId: submission.id,
        }),
      });
    } catch (err) {
      console.error("[health-check] webhook failed (submission already saved):", err);
    }
  }

  return { ok: true, submissionId: submission.id };
}
