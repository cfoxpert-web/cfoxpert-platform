import { Suspense } from "react";
import { Card } from "@/components/cards/card";
import { ScoreRing } from "@/components/health-score/score-ring";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { ENTERPRISE_VALUE_DRIVERS } from "@/constants/drivers";
import { getClientHealthScore } from "@/lib/dashboard/health";
import type { DashboardQuery } from "@/lib/dashboard/data";
import { getOrgPeriods } from "@/lib/kpi/queries";
import type { MetricScore } from "@/lib/health-check/financial-score";
import { cn } from "@/lib/utils";

/**
 * Amendment A2 — Health Score tab. Full transparency into the computed
 * score: driver breakdown (qualitative drivers honestly "Not yet assessed")
 * and metric-level detail with each benchmark band.
 */

function formatMetricValue(metric: MetricScore): string {
  if (metric.unit === "%") return `${metric.value.toFixed(1)}%`;
  if (metric.unit === "days") return `${Math.round(metric.value)} days`;
  return `${metric.value.toFixed(2)}x`;
}

function formatBand(metric: MetricScore): string {
  const fmt = (v: number) =>
    metric.unit === "%" ? `${v}%` : metric.unit === "days" ? `${v} days` : `${v}x`;
  if (metric.idealMin !== null && metric.idealMax !== null)
    return `${fmt(metric.idealMin)} – ${fmt(metric.idealMax)}`;
  if (metric.idealMin !== null) return `≥ ${fmt(metric.idealMin)}`;
  if (metric.idealMax !== null) return `≤ ${fmt(metric.idealMax)}`;
  return "—";
}

function statusFor(score: number): { label: string; className: string } {
  if (score >= 90) return { label: "Strong", className: "bg-teal-light text-teal" };
  if (score >= 75) return { label: "Healthy", className: "bg-teal-light text-teal" };
  return { label: "Attention", className: "bg-coral/10 text-coral" };
}

export async function HealthScoreTab({
  organizationId,
  query,
}: {
  organizationId: string;
  query: DashboardQuery;
}) {
  const [health, periods] = await Promise.all([
    getClientHealthScore(organizationId, query.periodLabel),
    getOrgPeriods(organizationId),
  ]);

  // Period-only selector: the comparison basis for the score is pinned to
  // "previous same-type period" by design, so no Compare dropdown here.
  const selector =
    periods.length > 0 ? (
      <Suspense>
        <PeriodComparisonSelector
          periods={periods}
          currentPeriod={health?.periodLabel ?? query.periodLabel ?? ""}
          mode="previous"
          showCompare={false}
        />
      </Suspense>
    ) : null;

  if (!health) {
    return (
      <div className="flex flex-col gap-6">
        {selector}
        <Card className="p-10 text-center">
          <p className="text-[14px] text-slate">
            Not enough financial data to compute a health score for this period.
          </p>
          <p className="mt-1 text-[12.5px] text-slate-light">
            The score computes once statement lines are recorded for the period.
          </p>
        </Card>
      </div>
    );
  }

  const driversByKey = new Map(health.drivers.map((d) => [d.key, d]));
  const scoredMetrics = health.drivers.flatMap((d) =>
    d.metrics.map((m) => ({ driverLabel: d.label, metric: m })),
  );

  return (
    <div className="flex flex-col gap-6">
      {selector}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Score */}
        <Card className="flex flex-col items-center justify-center gap-4 border-0 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-8 text-center text-white">
          <ScoreRing score={health.overallScore} size={120} strokeWidth={10} label={`Grade ${health.grade}`} />
          <div>
            <h3 className="font-display text-[16px]">Business Health Score</h3>
            <p className="mt-1 text-[12px] text-white/70">
              {health.periodLabel} · computed from financial evidence
            </p>
            <p className="mt-1 text-[11.5px] text-white/50">
              Governance &amp; Technology await assessment and are excluded from the weighting.
            </p>
          </div>
        </Card>

        {/* Driver breakdown */}
        <Card className="p-6">
          <h3 className="font-display text-[17px] text-navy">Driver Breakdown</h3>
          <div className="mt-4 flex flex-col gap-4">
            {ENTERPRISE_VALUE_DRIVERS.map((driver) => {
              const result = driversByKey.get(driver.key);
              const score = result?.score ?? null;
              return (
                <div key={driver.key}>
                  <div className="mb-1.5 flex items-baseline justify-between text-[12.5px]">
                    <span className="text-slate">
                      {driver.label}
                      {result?.source === "computed" && (
                        <span className="ml-1.5 text-[10.5px] uppercase tracking-wide text-slate-light">computed</span>
                      )}
                    </span>
                    <span className={cn("font-semibold", score === null ? "text-slate-light" : "text-navy")}>
                      {score === null ? "Not yet assessed" : score}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-pill bg-line">
                    {score !== null && (
                      <div
                        className="h-full rounded-pill"
                        style={{ width: `${score}%`, backgroundColor: driver.hex }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Metric detail */}
      {scoredMetrics.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-[17px] text-navy">How the score is built</h3>
          <p className="mt-0.5 text-[12px] text-slate">
            Each metric scores against its benchmark band (favorable 90 / within 75 / breach 40).
            Bands are data — tune them without a deploy. Growth is measured against the previous
            same-type period.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4 font-semibold">Driver</th>
                  <th className="py-2 pr-4 font-semibold">Metric</th>
                  <th className="py-2 pr-4 text-right font-semibold">Value</th>
                  <th className="py-2 pr-4 text-right font-semibold">Healthy Band</th>
                  <th className="py-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {scoredMetrics.map(({ driverLabel, metric }) => {
                  const status = statusFor(metric.score);
                  return (
                    <tr key={metric.metricKey} className="border-b border-line/60">
                      <td className="py-2.5 pr-4 text-slate">{driverLabel}</td>
                      <td className="py-2.5 pr-4 text-slate">{metric.label}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-navy">
                        {formatMetricValue(metric)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-slate">
                        {formatBand(metric)}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={cn("rounded-pill px-2 py-0.5 text-[11.5px] font-semibold", status.className)}>
                          {status.label} · {metric.score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
