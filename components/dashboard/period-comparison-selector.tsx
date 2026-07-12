"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodOption } from "@/lib/kpi/queries";
import type { ComparisonMode } from "@/lib/kpi/period-comparison";

/**
 * Milestone A1 — dashboard period + comparison selector.
 *
 * Drives the KPI row via URL params (?period=..&compare=..&comparePeriod=..)
 * so the server component re-renders with the chosen comparison. The
 * "Compare" dropdown lists the relationship modes plus every other period
 * (an explicit "vs FY25" = a custom pair).
 */

const RELATIONSHIP_OPTIONS: { value: ComparisonMode; label: string }[] = [
  { value: "previous", label: "vs previous period" },
  { value: "yoy", label: "vs same period last year" },
  { value: "qoq", label: "vs previous quarter" },
  { value: "mom", label: "vs previous month" },
];

const selectClass =
  "rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-teal/30";

interface Props {
  periods: PeriodOption[];
  currentPeriod: string;
  mode: ComparisonMode;
  comparePeriodLabel?: string | null;
}

export function PeriodComparisonSelector({
  periods,
  currentPeriod,
  mode,
  comparePeriodLabel,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const compareValue =
    mode === "custom" && comparePeriodLabel
      ? `custom:${comparePeriodLabel}`
      : mode;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-slate">Period</span>
        <select
          className={selectClass}
          value={currentPeriod}
          onChange={(e) => setParams({ period: e.target.value })}
        >
          {periods.map((option) => (
            <option key={option.label} value={option.label}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-slate">Compare</span>
        <select
          className={selectClass}
          value={compareValue}
          onChange={(e) => {
            const value = e.target.value;
            if (value.startsWith("custom:")) {
              setParams({ compare: "custom", comparePeriod: value.slice(7) });
            } else {
              setParams({ compare: value, comparePeriod: null });
            }
          }}
        >
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {periods
            .filter((option) => option.label !== currentPeriod)
            .map((option) => (
              <option key={`custom:${option.label}`} value={`custom:${option.label}`}>
                vs {option.label}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
