"use client";

import { useEffect, type PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/use-session";

/**
 * Milestone 12: the real route guard, implementing exactly the two
 * behaviors the structure-only version documented as missing:
 *   1. isLoading → loading state (real auth resolves asynchronously)
 *   2. !session  → redirect to /client-login
 *
 * With realAuth OFF the mock session always exists, so the only
 * behavioral difference from before is that clicking Sign Out now
 * lands on /client-login instead of a dead-end message — the exact
 * redirect the original file's comment specified.
 */
export function ProtectedLayout({ children }: PropsWithChildren) {
  const { session, isLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/client-login");
    }
  }, [isLoading, session, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate">
        Loading your session…
      </div>
    );
  }

  if (!session) {
    // Redirect is in flight (useEffect above); render nothing sensitive.
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate">
        Redirecting to login…
      </div>
    );
  }

  return <>{children}</>;
}
