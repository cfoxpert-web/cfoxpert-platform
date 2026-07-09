"use server";

import { createClient } from "../supabase/server";

/**
 * Milestone 6 — profile updates (the Settings page's edit path).
 *
 * Updates the caller's OWN public.users row. No user id parameter by
 * design: RLS (users_update_own) restricts the write to auth.uid()'s
 * row anyway, but not accepting an id at all means there is no code
 * path to even attempt updating someone else.
 */
export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

export async function updateOwnProfile(input: {
  fullName: string;
}): Promise<UpdateProfileResult> {
  const fullName = input.fullName.trim();
  if (fullName.length === 0 || fullName.length > 120) {
    return { ok: false, error: "Name must be between 1 and 120 characters." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) {
    console.error("[profile] update failed:", error.message);
    return { ok: false, error: "Could not save your profile. Please try again." };
  }

  return { ok: true };
}
