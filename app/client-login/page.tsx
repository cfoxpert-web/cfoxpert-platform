"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/cards/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/cards/dashboard-card";
import { MetricTile } from "@/components/cards/metric-tile";
import { Logo } from "@/components/layout/logo";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { signInWithPassword } from "@/lib/auth/supabase-auth";

/**
 * Milestone 4: real authentication, gated behind the realAuth feature
 * flag (lib/feature-flags.ts).
 *
 * - realAuth OFF (default): behaves exactly as before — submitting
 *   navigates straight to /dashboard against the mock session, and
 *   the "structure only" notice is shown.
 * - realAuth ON: submits credentials to Supabase via the
 *   signInWithPassword server action; errors render inline; the
 *   notice disappears.
 */
export default function ClientLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "request">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const realAuth = isFeatureEnabled("realAuth");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!realAuth) {
      router.push("/dashboard");
      return;
    }

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    setLoginError(null);
    setIsSubmitting(true);
    try {
      const result = await signInWithPassword(email, password);
      if (result.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setLoginError(result.error);
      }
    } catch {
      setLoginError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-12 text-white lg:flex">
        <div>
  <Logo heightClass="h-6" />
</div>
        <div className="max-w-md">
          <p className="mb-4 text-xs font-bold uppercase tracking-wider text-teal-bright">Client Portal</p>
          <h1 className="mb-4 font-display text-3xl font-medium">Your business, in one live view.</h1>
          <p className="mb-8 text-[15px] text-white/65">
            Dashboards, board packs, and your action tracker — accessible any time, not just in meetings.
          </p>
          <DashboardCard title="CEO Command Center">
            <div className="grid grid-cols-2 gap-2.5">
              <MetricTile label="Health Score" value="82 · A-" />
              <MetricTile label="EBITDA Margin" value="18.6%" />
              <MetricTile label="Cash Cycle" value="32 days" />
              <MetricTile label="Open Actions" value="3 of 14" />
            </div>
          </DashboardCard>
        </div>
        <div className="flex gap-6 text-[12.5px] text-white/45">
          <span>© CFOxpert</span>
          <span>Paramount Legal Bistro LLP</span>
        </div>
      </div>

      {/* Right: auth form */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="mb-8 inline-block text-[13px] text-slate hover:text-navy">
            ← Back to cfoxpert.in
          </Link>

          <div className="mb-7 flex gap-1 rounded-[12px] bg-mist p-1">
            <button
              onClick={() => setTab("login")}
              className={`flex-1 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                tab === "login" ? "bg-white text-navy shadow-elevation-1" : "text-slate"
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setTab("request")}
              className={`flex-1 rounded-[9px] py-2.5 text-[13.5px] font-semibold transition-colors ${
                tab === "request" ? "bg-white text-navy shadow-elevation-1" : "text-slate"
              }`}
            >
              Request Access
            </button>
          </div>

          {tab === "login" ? (
            <>
              <div className="mb-7">
                <h2 className="mb-1.5 font-display text-2xl font-medium text-navy">Welcome back</h2>
                <p className="text-sm text-slate">Log in to your CFOxpert Client Portal.</p>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-[13px] font-semibold text-navy">Email address</label>
                  <Input id="login-email" name="email" type="email" placeholder="you@company.com" required />
                </div>
                <div>
                  <label htmlFor="login-password" className="mb-2 block text-[13px] font-semibold text-navy">Password</label>
                  <Input id="login-password" name="password" type="password" placeholder="Enter your password" required />
                </div>
                {loginError && (
                  <p role="alert" className="text-[13px] font-medium text-red-600">
                    {loginError}
                  </p>
                )}
                <Button type="submit" size="lg" className="mt-1 w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Logging in…" : "Log In →"}
                </Button>
              </form>
              {!realAuth && (
                <Card className="mt-6 flex gap-2.5 border-[#D6EEE6] bg-teal-light p-3.5 text-[12.5px] text-slate">
                  <span>🔒</span>
                  <span>
                    <b className="text-navy">Structure only.</b> There&apos;s no real password check
                    yet — this button navigates straight to the mock dashboard so the click-through
                    flow can be reviewed end-to-end.
                  </span>
                </Card>
              )}
            </>
          ) : (
            <>
              <div className="mb-7">
                <h2 className="mb-1.5 font-display text-2xl font-medium text-navy">Request portal access</h2>
                <p className="text-sm text-slate">Tell us a bit about your business and we&apos;ll set up your login.</p>
              </div>
              <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label htmlFor="req-name" className="mb-2 block text-[13px] font-semibold text-navy">Full name</label>
                  <Input id="req-name" placeholder="e.g. Rohit Sharma" />
                </div>
                <div>
                  <label htmlFor="req-company" className="mb-2 block text-[13px] font-semibold text-navy">Company name</label>
                  <Input id="req-company" placeholder="e.g. Jagdamba Paper Products Pvt Ltd" />
                </div>
                <div>
                  <label htmlFor="req-email" className="mb-2 block text-[13px] font-semibold text-navy">Work email</label>
                  <Input id="req-email" type="email" placeholder="you@company.com" />
                </div>
                <Button type="submit" size="lg" className="mt-1 w-full">
                  Request Access →
                </Button>
              </form>
            </>
          )}

          <div className="mt-7 text-center text-[13.5px] text-slate">
            Not a client yet?{" "}
            <Link href="/health-check" className="font-semibold text-teal hover:underline">
              Book a Business Health Check
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
