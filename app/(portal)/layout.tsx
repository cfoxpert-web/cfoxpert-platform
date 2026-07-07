import { SessionProvider } from "@/lib/auth/session-provider";
import { ProtectedLayout } from "@/components/layout/protected-layout";

/**
 * Every route inside app/(portal)/ passes through here. This is the
 * "Protected Layout" the Phase 5 brief asks for — see ProtectedLayout's own
 * comments for exactly what's structural-only vs. what a real
 * implementation still needs to add.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </SessionProvider>
  );
}
