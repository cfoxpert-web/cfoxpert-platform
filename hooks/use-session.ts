"use client";

import { useContext } from "react";
import { SessionContext } from "@/lib/auth/session-provider";

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return ctx;
}
