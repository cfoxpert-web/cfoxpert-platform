"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";

const COMING_SOON_SECTIONS = [
  { title: "Notification Preferences", description: "Choose which alerts trigger an email vs. an in-app notification only." },
  { title: "Team Access", description: "Invite team members and set what each role can see in the portal." },
  { title: "Billing", description: "View invoices and manage your engagement plan." },
];

/**
 * STRUCTURE ONLY. The profile fields below are read-only and pre-filled
 * from the mock session — there's no save handler wired up because there's
 * nothing real to save to yet. The three sections below that are visibly
 * "Coming soon" rather than faked as functional.
 */
export default function SettingsPage() {
  const { session } = useSession();

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
              <Input id="settings-name" defaultValue={session?.user.name} disabled />
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
          <p className="mt-4 text-xs text-slate-light">
            Profile editing isn&apos;t wired up yet — this reflects the current mock session only.
          </p>
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
