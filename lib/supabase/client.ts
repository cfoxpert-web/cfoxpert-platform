'use client';

import { createBrowserClient } from '@supabase/ssr';

import { requireSupabaseConfig } from './config';

/**
 * Browser-side Supabase client, for Client Components only.
 * Scoped to the anon key — all data access through this client is
 * subject to Row Level Security. Never use for privileged operations.
 *
 * Throws a clear error if Supabase is not yet configured; callers
 * should be behind a feature flag (e.g. realAuth) until it is.
 */
export function createClient() {
  const { url, anonKey } = requireSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
