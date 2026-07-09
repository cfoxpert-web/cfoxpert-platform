"use server";

import type { Session } from "@/types";
import { createClient } from "../supabase/server";
import { toSession } from "./session-mapping";

export type SignInResult = { ok: true } | { ok: false; error: string };

/**
 * Password sign-in. Returns a discriminated result rather than
 * throwing, so the login form renders errors inline.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<SignInResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Deliberately generic: never confirm whether an email exists.
    return { ok: false, error: "Invalid email or password." };
  }
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Server-side session read for Server Components and route guards.
 * getUser() verifies the JWT against Supabase; the follow-up
 * getSession() call is only used for the expiry timestamp, never for
 * identity.
 */
export async function getServerSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return toSession(user, session?.expires_at);
}
