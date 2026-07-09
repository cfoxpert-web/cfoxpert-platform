import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { requireSupabaseConfig } from './config';

/**
 * Server-side Supabase client, for Server Components, Server Actions,
 * and Route Handlers. Reads/writes the auth session cookie via
 * Next.js's cookies() API (async in Next 15).
 *
 * Throws a clear error if Supabase is not yet configured; callers
 * should be behind a feature flag until it is.
 */
export async function createClient() {
  const { url, anonKey } = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookie writes are
          // not allowed. Safe to ignore: the middleware refreshes the
          // session on every request, so the cookie stays current.
        }
      },
    },
  });
}
