import type { Session } from "@/types";

/**
 * STRUCTURE ONLY. This is a hardcoded mock session, not a real
 * authentication result. When real auth is added (NextAuth, Clerk, a
 * custom JWT flow — whatever you choose later), this file is what gets
 * replaced: everything downstream (SessionProvider, useSession,
 * ProtectedLayout) already expects a `Session | null` shape and won't
 * need to change.
 */
export const MOCK_SESSION: Session = {
  user: {
    id: "usr_mock_1",
    name: "Parth Sharma",
    email: "parth@shitlapaper.example",
    company: "Shitla Paper Products Pvt Ltd",
    role: "owner",
    avatarInitial: "P",
  },
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
};
