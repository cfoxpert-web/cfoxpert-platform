"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Amendment A3 — report tab navigation. URL-param driven (?tab=...) so tab
 * state is shareable and survives reloads; period/compare params persist
 * across tab switches.
 */

export const REPORT_TABS = [
  { key: "overview", label: "Overview" },
  { key: "pnl", label: "P&L" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "ratios", label: "Key Ratios" },
  { key: "cost-structure", label: "Cost Structure" },
  { key: "segment", label: "Segment" },
  { key: "inventory", label: "Inventory" },
] as const;

export type ReportTabKey = (typeof REPORT_TABS)[number]["key"];

export function ReportTabs({ active }: { active: string }) {
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
      {REPORT_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => go(tab.key)}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors",
            active === tab.key
              ? "border-teal text-navy"
              : "border-transparent text-slate hover:text-navy",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
