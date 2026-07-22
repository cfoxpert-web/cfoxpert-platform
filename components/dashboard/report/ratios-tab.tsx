import { Suspense } from "react";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { getReportSnapshot, type DashboardQuery } from "@/lib/dashboard/data";
import { computeRatios, periodDaysBetween, type ComputedRatio } from "@/lib/kpi/ratios";
import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import { ReportEmpty } from "./report-empty";
import { kpiMap, priorValue } from "./statement";

/**
 * Amendment A3 — Key Ratios tab. Everything is computed at read time from
 * statement-line primitives (lib/kpi/ratios.ts) — ratios are never stored.
 * Day-based ratios use each period's REAL length (a quarter's DSO scales by
 * ~91 days, a year's by 365), which is why the snapshot carries both periods'
 * date ranges. Benchmark bands arrive later via industry classification
 * (ADR-008); v1 shows value + movement.
 */

function formatRatio(ratio: ComputedRatio, value: number | null): string {
  if (value === null) return "—";
  if (ratio.unit === "%") return `${value.toFixed(1)}%`;
  if (ratio.unit === "days") return `${Math.round(value)} days`;
  return `${value.toFixed(2)}x`;
}

function movementLabel(ratio: ComputedRatio, delta: number): string {
  const abs = Math.abs(delta);
  if (ratio.unit === "%") return `${abs.toFixed(1)} pts`;
  if (ratio.unit === "days") return `${Math.round(abs)} days`;
  return `${abs.toFixed(2)}x`;
}

export async function RatiosTab({
  organizationId,
  query,
}: {
  organizationId: string;
  query: DashboardQuery;
}) {
  const { snapshot, periods } = await getReportSnapshot(organizationId, query);

  const selector =
    snapshot && periods.length > 0 ? (
      <Suspense>
        <PeriodComparisonSelector
          periods={periods}
          currentPeriod={snapshot.periodLabel}
          mode={snapshot.comparisonMode}
          comparePeriodLabel={snapshot.comparisonLabel}
        />
      </Suspense>
    ) : null;

  if (!snapshot || snapshot.kpis.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {selector}
        <ReportEmpty periodLabel={snapshot?.periodLabel} />
      </div>
    );
  }

  const map = kpiMap(snapshot.kpis);
  const currentValues: Partial<Record<string, number>> = {};
  const priorValues: Partial<Record<string, number>> = {};
  for (const [key, kpi] of map) {
    currentValues[key] = kpi.value;
    const prior = priorValue(kpi);
    if (prior !== null) priorValues[key] = prior;
  }

  const currentRatios = computeRatios({
    values: currentValues,
    periodDays: periodDaysBetween(snapshot.periodStart, snapshot.periodEnd),
  });
  const priorByKey = new Map(
    computeRatios({
      values: priorValues,
      periodDays: periodDaysBetween(snapshot.comparisonStart, snapshot.comparisonEnd),
    }).map((r) => [r.key, r.value]),
  );

  const rows: ComparisonRow[] = currentRatios
    .filter((ratio) => ratio.value !== null)
    .map((ratio) => {
      const prior = priorByKey.get(ratio.key) ?? null;
      let movement: ComparisonRow["movement"] = null;
      if (ratio.value !== null && prior !== null) {
        const delta = ratio.value - prior;
        const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
        const improving =
          direction === "flat" ? null : (delta > 0) === ratio.higherIsBetter;
        movement = {
          symbol: direction === "up" ? "▲" : direction === "down" ? "▼" : "→",
          label: movementLabel(ratio, delta),
          tone: improving === null ? "flat" : improving ? "good" : "bad",
        };
      }
      return {
        label: ratio.label,
        current: formatRatio(ratio, ratio.value),
        prior: formatRatio(ratio, prior),
        movement,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      {selector}
      <ComparisonTable
        title={`Key Ratios — ${snapshot.periodLabel}`}
        subtitle="Computed from recorded statement lines; day ratios scale by each period's actual length. Benchmark bands follow with industry classification."
        currentLabel={snapshot.periodLabel}
        priorLabel={snapshot.comparisonLabel}
        rows={rows}
      />
    </div>
  );
}
