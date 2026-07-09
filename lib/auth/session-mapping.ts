import type { Session } from "@/types";

/**
 * The single Supabase-user → Session mapping point, shared by server
 * (supabase-auth.ts) and client (use-supabase-session.ts) code.
 *
 * Produces the exact Session shape defined in types/ and previously
 * supplied by lib/auth/mock-session.ts, so every existing consumer of
 * useSession() (ProfileMenu, ProtectedLayout, Settings) receives an
 * identical structure whether the source is mock or real.
 *
 * WHERE EACH FIELD COMES FROM (and what's temporary):
 * - name/company: Supabase user_metadata, set at user creation.
 * - role: ALSO user_metadata for now — DISPLAY ONLY. Per ADR-003,
 *   real authorization role lives on organization_members (Milestone
 *   6) and is NEVER read from metadata. Do not gate anything on this
 *   field; it exists solely so the UI renders identically to the
 *   mock era until M6 replaces its source.
 * - avatarInitial: derived, first letter of name (fallback: email).
 * - expiresAt: Supabase session expiry when available; otherwise a
 *   24h placeholder (the JWT, not this string, is what actually
 *   enforces expiry — this field is informational for the UI).
 */

type SupabaseUserLike = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

const VALID_ROLES = ["owner", "admin", "member"] as const;
type UserRole = (typeof VALID_ROLES)[number];

/** Unknown/absent metadata role degrades to 'member' — never to a higher role. */
function metaRole(meta: Record<string, unknown> | undefined): UserRole {
  const v = metaString(meta, "role");
  return (VALID_ROLES as readonly string[]).includes(v ?? "") ? (v as UserRole) : "member";
}

export function toSession(
  user: SupabaseUserLike,
  expiresAtUnixSeconds?: number,
): Session {
  const email = user.email ?? "";
  const name = metaString(user.user_metadata, "full_name") ?? email;

  return {
    user: {
      id: user.id,
      name,
      email,
      company: metaString(user.user_metadata, "company") ?? "",
      role: metaRole(user.user_metadata),
      avatarInitial: (name.charAt(0) || email.charAt(0) || "?").toUpperCase(),
    },
    expiresAt: expiresAtUnixSeconds
      ? new Date(expiresAtUnixSeconds * 1000).toISOString()
      : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  };
}
