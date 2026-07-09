import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "../env";
import { requireSupabaseConfig } from "./config";

/**
 * Service-role Supabase client. BYPASSES ALL ROW LEVEL SECURITY.
 *
 * SERVER-ONLY. Never import from anything that ships to the browser.
 * Reserved for operations with no legitimate user-scoped path — the
 * first real use is persisting public Health Check submissions
 * (Milestone 8), where the prospect has no session and the table is
 * deliberately deny-all.
 *
 * Every use of this client MUST write an audit_logs entry (ADR-005):
 * service-role writes are exactly the writes RLS can't account for.
 */
export function createAdminClient() {
  const { url } = requireSupabaseConfig();

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it as a server-only " +
        "environment variable (Vercel env settings / .env.local — see " +
        ".env.local.example). Never prefix it NEXT_PUBLIC_.",
    );
  }

  return createSupabaseClient(url, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
