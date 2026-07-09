import { z } from 'zod';

/**
 * Validated environment access.
 *
 * Why this exists: previously, environment variables (currently just
 * NEXT_PUBLIC_WEBHOOK_URL, see lib/webhook.ts) were read directly via
 * process.env wherever needed, with no validation. That's fine for one
 * variable — it stops being fine once Supabase credentials are added
 * (Milestone 3 of the platform roadmap), including a service-role key
 * that must never reach the client bundle.
 *
 * Import `env` from here instead of reading `process.env` directly.
 * If a required variable is missing or malformed, this throws at
 * startup with a clear message, instead of failing confusingly at the
 * point of use.
 *
 * Kept as a single flat file (lib/env.ts), matching this repo's
 * existing convention (lib/utils.ts, lib/validation.ts, lib/webhook.ts)
 * rather than introducing a nested lib/env/ folder.
 */

const clientEnvSchema = z.object({
  NEXT_PUBLIC_WEBHOOK_URL: z.string().url().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  /**
   * Milestone 2 (Feature Flags): comma-separated overrides, e.g.
   * "realAuth:on,crm:off". Parsed and validated in lib/feature-flags.ts
   * (unknown names/values are warned about and ignored there, so this
   * stays a plain optional string here — a malformed flag list should
   * degrade gracefully, not crash the boot).
   */
  NEXT_PUBLIC_FEATURE_FLAGS: z.string().optional(),
  /**
   * Milestone 3 (Supabase Integration): both OPTIONAL by design.
   * The live site must keep deploying before a Supabase project is
   * provisioned. lib/supabase/* checks isSupabaseConfigured() and
   * fails with a clear error only if actually used without config.
   * These become effectively required once the realAuth feature flag
   * is enabled (Milestone 4) — enforced there, not here.
   */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

/**
 * Server-only variables. NEVER prefixed NEXT_PUBLIC_, never read in
 * client code. SUPABASE_SERVICE_ROLE_KEY is optional for the same
 * reason the public Supabase vars are: the site must keep deploying
 * before provisioning. lib/supabase/admin.ts gates on its presence
 * with a clear error.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

type Env = z.infer<typeof clientEnvSchema> & Partial<z.infer<typeof serverEnvSchema>>;

function loadEnv(): Env {
  const clientResult = clientEnvSchema.safeParse({
    NEXT_PUBLIC_WEBHOOK_URL: process.env.NEXT_PUBLIC_WEBHOOK_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_FEATURE_FLAGS: process.env.NEXT_PUBLIC_FEATURE_FLAGS,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!clientResult.success) {
    console.error(
      '❌ Invalid environment variables:',
      clientResult.error.flatten().fieldErrors,
    );
    throw new Error(
      'Invalid environment variables. Check .env.local against .env.local.example.',
    );
  }

  const isServer = typeof window === 'undefined';
  if (!isServer) {
    return clientResult.data;
  }

  const serverResult = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!serverResult.success) {
    console.error(
      '❌ Invalid server environment variables:',
      serverResult.error.flatten().fieldErrors,
    );
    throw new Error('Invalid server environment variables.');
  }

  return { ...clientResult.data, ...serverResult.data };
}

export const env = loadEnv();
