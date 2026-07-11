"use client";

import { useState, type PropsWithChildren } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

interface DashboardLayoutProps extends PropsWithChildren {
  title: string;
  companyName?: string;
}

export function DashboardLayout({ title, companyName, children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-mist">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar title={title} companyName={companyName} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
