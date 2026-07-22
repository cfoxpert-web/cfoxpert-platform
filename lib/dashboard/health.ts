import { getReportSnapshot } from "./data";
import { getSegmentValues } from "@/lib/kpi/queries";
import { periodDaysBetween } from "@/lib/kpi/ratios";
import { getHealthMetricBands } from "@/lib/health-check/bands";
import {
  buildMetricValues,
  computeClientHealth,
  type ClientHealthResult,
} from "@/lib/health-check/financial-score";

/**
 * Amendment A2 — the client health score, computed AT READ TIME from the
 * period's financial data (approved: no GET-side-effect persistence; the
 * insert-only health_scores audit row arrives with a deliberate publish
 * step later).
 *
 * Growth is always measured against the PREVIOUS SAME-TYPE period (compare
 * pinned to "previous"), so the score is a property of the period — it never
 * shifts with whatever comparison the user has selected in the UI.
 */

export type ClientHealthScore = ClientHealthResult & { periodLabel: string };

export async function getClientHealthScore(
  organizationId: string,
  periodLabel?: string,
): Promise<ClientHealthScore | null> {
  const { snapshot } = await getReportSnapshot(organizationId, {
    periodLabel,
    compare: "previous",
  });
  if (!snapshot || snapshot.kpis.length === 0) return null;

  const [segments, bands] = await Promise.all([
    getSegmentValues(snapshot.periodId),
    getHealthMetricBands(),
  ]);

  const values: Partial<Record<string, number>> = {};
  let priorRevenue: number | null = null;
  for (const kpi of snapshot.kpis) {
    values[kpi.definition.key] = kpi.value;
    if (kpi.definition.key === "revenue" && kpi.trend) {
      priorRevenue = kpi.value - kpi.trend.delta;
    }
  }

  const metrics = buildMetricValues({
    values,
    priorRevenue,
    periodDays: periodDaysBetween(snapshot.periodStart, snapshot.periodEnd),
    segmentRevenues: segments
      .filter((s) => s.definitionKey === "revenue")
      .map((s) => s.value),
  });

  const result = computeClientHealth({ metrics, bands });
  return result ? { ...result, periodLabel: snapshot.periodLabel } : null;
}
