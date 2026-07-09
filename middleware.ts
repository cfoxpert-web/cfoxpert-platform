import { type NextRequest } from 'next/server';

import { updateSession } from './lib/supabase/middleware';

/**
 * Root middleware (Milestone 3). Currently does exactly one thing:
 * refresh the Supabase auth session on every request — and no-ops
 * entirely if Supabase is not yet configured.
 *
 * Route protection deliberately does NOT live here; it lives with
 * the layouts it protects (ProtectedLayout), which becomes real in
 * Milestone 4/12 per the frozen roadmap.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * All paths except Next.js internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
