"use client";

import { createContext, useState, type PropsWithChildren } from "react";
import { MOCK_SESSION } from "@/lib/auth/mock-session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/client";
import { useSupabaseSession } from "@/lib/auth/use-supabase-session";
import type { Session } from "@/types";

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  /** Fire-and-forget by contract: consumers call this synchronously.
   *  Real branch invalidates the Supabase session; the auth-state
   *  subscription then nulls `session` automatically. */
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * Milestone 4: real authentication behind the realAuth feature flag.
 *
 * - realAuth OFF (default): MockSessionProvider — behavior identical
 *   to the original structure-only provider (MOCK_SESSION on mount,
 *   signOut clears local state).
 * - realAuth ON: RealSessionProvider — session comes from Supabase
 *   via useSupabaseSession(); signOut invalidates the real session.
 *
 * The flag is resolved once at module load (see lib/feature-flags.ts),
 * so which branch renders is constant for the lifetime of the app —
 * but the branch lives at the component level, not inside a hook call,
 * to keep the Rules of Hooks satisfied unconditionally.
 *
 * Every consumer of useSession() receives the same SessionContextValue
 * shape from either branch. No component changes.
 */
export function SessionProvider({ children }: PropsWithChildren) {
  if (isFeatureEnabled("realAuth")) {
    return <RealSessionProvider>{children}</RealSessionProvider>;
  }
  return <MockSessionProvider>{children}</MockSessionProvider>;
}

/** Original structure-only behavior, preserved exactly. */
function MockSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(MOCK_SESSION);
  const [isLoading] = useState(false);

  function signOut() {
    // eslint-disable-next-line no-console
    console.log("[Auth] signOut() called — structure only, no real session to invalidate yet.");
    setSession(null);
  }

  return (
    <SessionContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

/** Real Supabase-backed session. */
function RealSessionProvider({ children }: PropsWithChildren) {
  const { session, isLoading } = useSupabaseSession();

  function signOut() {
    // Fire-and-forget by contract. onAuthStateChange in
    // useSupabaseSession() nulls the session when this completes,
    // so no local state management is needed here.
    void createClient()
      .auth.signOut()
      .catch((err) => {
        console.error("[Auth] signOut failed:", err);
      });
  }

  return (
    <SessionContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}
