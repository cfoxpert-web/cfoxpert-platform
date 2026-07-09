"use client";

import { useEffect, useState } from "react";

import type { Session } from "@/types";
import { createClient } from "../supabase/client";
import { toSession } from "./session-mapping";

type SessionState = {
  session: Session | null;
  /** True until the first auth check resolves — render loading, not logged-out. */
  isLoading: boolean;
};

/**
 * Client-side Supabase session subscription. Used ONLY inside the
 * SessionProvider's realAuth branch — everything else keeps calling
 * useSession(). Subscribes to onAuthStateChange so login/logout in
 * another tab, or a token refresh, updates the UI without a reload.
 */
export function useSupabaseSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setState({ session: null, isLoading: false });
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setState({ session: toSession(user, session?.expires_at), isLoading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      setState({
        session: supaSession?.user ? toSession(supaSession.user, supaSession.expires_at) : null,
        isLoading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
