"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { REPORT_TABS } from "@/components/dashboard/report/tab-defs";

/**
 * Amendment A3 — report tab navigation. URL-param driven (?tab=...) so tab
 * state is shareable and survives reloads; period/compare params persist
 * across tab switches. The tab registry lives in report/tab-defs.ts (shared
 * with the server page — do NOT move it back into this client module).
 *
 * Amendment A6: `locked` tabs stay visible but greyed with a lock — the
 * package includes-everything story is told by showing, not hiding. They
 * remain clickable; the page renders the locked panel for them.
 */

export function ReportTabs({
  active,
  locked = [],
}: {
  active: string;
  locked?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const go = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "overview") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-line">
      {REPORT_TABS.map((tab) => {
        const isLocked = locked.includes(tab.key);
        return (
          <button
            key={tab.key}
            onClick={() => go(tab.key)}
            className={cn(
              "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors",
              active === tab.key
                ? "border-teal text-navy"
                : "border-transparent text-slate hover:text-navy",
              isLocked && "text-slate-light hover:text-slate",
            )}
          >
            {tab.label}
            {isLocked && <Lock className="h-3 w-3" aria-label="Not in your package" />}
          </button>
        );
      })}
    </div>
  );
}
