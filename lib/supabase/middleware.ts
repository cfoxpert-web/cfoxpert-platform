import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseConfig } from './config';

/**
 * Session-refresh helper called from the root middleware.ts on every
 * request. Keeps the Supabase auth cookie current so Server
 * Components always see a valid session.
 *
 * Contains NO route-protection or redirect logic — that belongs to
 * the auth milestone (Milestone 4) and ProtectedLayout, not here.
 *
 * If Supabase is not configured, this no-ops: the site behaves
 * exactly as it does today. This is what makes the milestone safe to
 * deploy before a Supabase project exists.
 */
export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();

  let response = NextResponse.next({ request });

  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touching auth state is what triggers the token refresh when needed.
  await supabase.auth.getUser();

  return response;
}
