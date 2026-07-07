"use client";

import { createContext, useState, type PropsWithChildren } from "react";
import { MOCK_SESSION } from "@/lib/auth/mock-session";
import type { Session } from "@/types";

export interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  /** Structure only — logs and clears mock state. Wire up a real sign-out call here later. */
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/**
 * STRUCTURE ONLY — no real authentication happens here. `session` is always
 * `MOCK_SESSION` on mount. This exists so:
 *   1. `ProtectedLayout` and `useSession()` have something real to consume now
 *   2. Swapping in real auth later means changing this one file's internals
 *      (e.g. calling `useSession()` from next-auth, or reading a cookie/JWT)
 *      without touching any component that calls `useSession()`.
 */
export function SessionProvider({ children }: PropsWithChildren) {
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
