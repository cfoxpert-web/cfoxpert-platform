/**
 * Same pluggable pattern used in the static HTML prototypes: leave the URL
 * unset and every submission just logs to the console and the flow
 * continues normally. Set NEXT_PUBLIC_WEBHOOK_URL in .env.local once you
 * have a real destination (n8n, Sheets, a CRM) — no code changes needed
 * anywhere that calls sendToWebhook.
 */

export interface WebhookPayload {
  type: string;
  [key: string]: unknown;
}

export interface WebhookResult {
  ok: boolean;
  skipped?: boolean;
  error?: string;
}

import { env } from "@/lib/env";

const WEBHOOK_URL = env.NEXT_PUBLIC_WEBHOOK_URL ?? "";

export async function sendToWebhook(payload: WebhookPayload): Promise<WebhookResult> {
  if (!WEBHOOK_URL) {
    // eslint-disable-next-line no-console
    console.log("[CFOxpert Webhook] No NEXT_PUBLIC_WEBHOOK_URL set — payload ready to send:", payload);
    return { ok: true, skipped: true };
  }

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch (err) {
    // Submission failures should never block the user-facing flow —
    // log it, but let the UI proceed as if it succeeded.
    // eslint-disable-next-line no-console
    console.warn("[CFOxpert Webhook] Submission failed, continuing anyway:", err);
    return { ok: false, error: String(err) };
  }
}
