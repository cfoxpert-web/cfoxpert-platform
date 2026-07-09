"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { updateOwnProfile } from "@/lib/auth/profile-actions";

const COMING_SOON_SECTIONS = [
  { title: "Notification Preferences", description: "Choose which alerts trigger an email vs. an in-app notification only." },
  { title: "Team Access", description: "Invite team members and set what each role can see in the portal." },
  { title: "Billing", description: "View invoices and manage your engagement plan." },
];

/**
 * Milestone 6 (Settings wiring): with realAuth ON, the full-name field is
 * editable and saves through updateOwnProfile (own-row RLS; the action
 * accepts no user id by design). Email stays read-only (changes go through
 * Supabase Auth) and company stays read-only (it comes from the
 * organization, not the profile). With realAuth OFF, behavior is the
 * original structure-only page, unchanged.
 */
export default function SettingsPage() {
  const { session } = useSession();
  const realAuth = isFeatureEnabled("realAuth");

  const [name, setName] = useState<string | null>(null); // null = untouched
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const displayName = name ?? session?.user.name ?? "";
  const dirty = realAuth && name !== null && name !== session?.user.name;

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);
    const result = await updateOwnProfile({ fullName: displayName });
    if (result.ok) {
      setSaveState("saved");
    } else {
      setSaveState("error");
      setSaveError(result.error);
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <Card className="p-6">
          <h3 className="mb-4 font-display text-[16px] text-navy">Profile</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="mb-2 block text-[13px] font-semibold text-navy">
                Full name
              </label>
              <Input
                id="settings-name"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                disabled={!realAuth}
              />
            </div>
            <div>
              <label htmlFor="settings-company" className="mb-2 block text-[13px] font-semibold text-navy">
                Company
              </label>
              <Input id="settings-company" defaultValue={session?.user.company} disabled />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-email" className="mb-2 block text-[13px] font-semibold text-navy">
                Email address
              </label>
              <Input id="settings-email" defaultValue={session?.user.email} disabled />
            </div>
          </div>
          {realAuth ? (
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" onClick={handleSave} disabled={!dirty || saveState === "saving"}>
                {saveState === "saving" ? "Saving…" : "Save changes"}
              </Button>
              {saveState === "saved" && !dirty && (
                <span className="text-xs font-semibold text-teal">Saved.</span>
              )}
              {saveState === "error" && saveError && (
                <span className="text-xs font-semibold text-coral">{saveError}</span>
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-light">
              Profile editing isn&apos;t wired up yet — this reflects the current mock session only.
            </p>
          )}
        </Card>

        {COMING_SOON_SECTIONS.map((section) => (
          <Card key={section.title} className="flex items-center justify-between gap-4 p-6">
            <div>
              <h4 className="mb-1 text-[15px] font-semibold text-navy">{section.title}</h4>
              <p className="text-[13px] text-slate">{section.description}</p>
            </div>
            <Badge variant="soon">Soon</Badge>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
