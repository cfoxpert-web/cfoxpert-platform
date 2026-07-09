import { env } from '../env';

/**
 * Milestone 3 (Supabase Integration) — configuration gate.
 *
 * Supabase env vars are deliberately OPTIONAL (see lib/env.ts) so the
 * live site keeps deploying before a Supabase project is provisioned.
 * Everything in lib/supabase/* routes through this gate:
 *
 *  - isSupabaseConfigured() — safe to call anywhere, never throws.
 *    Use it to no-op gracefully (middleware) or branch (future code).
 *  - requireSupabaseConfig() — returns the config or throws a clear,
 *    actionable error. Use it at the top of any code path that cannot
 *    proceed without Supabase (client factories).
 */

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function requireSupabaseConfig(): SupabaseConfig {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.local.example). ' +
        'This code path should not be reachable while Supabase-dependent ' +
        'features are behind disabled feature flags — if you are seeing this ' +
        'in production, a feature flag was enabled before its configuration.',
    );
  }
  return config;
}
