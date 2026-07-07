"use client";

import type { PropsWithChildren } from "react";
import { useSession } from "@/hooks/use-session";

/**
 * STRUCTURE ONLY. In a real implementation, this component would:
 *   1. Check `session` from useSession()
 *   2. If `isLoading`, render a loading skeleton
 *   3. If `!session`, redirect to /client-login via next/navigation's useRouter
 *
 * Right now `session` is always the mock user (see lib/auth/mock-session.ts),
 * so this always renders children — there is no actual access control on
 * any route wrapped by this component yet. Do not treat /dashboard or any
 * other portal route as secure until this logic is implemented for real.
 */
export function ProtectedLayout({ children }: PropsWithChildren) {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate">
        Loading your session…
      </div>
    );
  }

  if (!session) {
    // Real implementation: router.push("/client-login") inside a useEffect.
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate">
        You&apos;ve been signed out. (Structure only — no real redirect wired up yet.)
      </div>
    );
  }

  return <>{children}</>;
}
