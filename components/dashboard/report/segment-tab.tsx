import { Suspense } from "react";
import { Card } from "@/components/cards/card";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { getReportSnapshot, type DashboardQuery } from "@/lib/dashboard/data";
import { getSegmentValues } from "@/lib/kpi/queries";
import { formatInrTable, formatPercent } from "@/lib/dashboard/map-kpis";

/**
 * Amendment A3 — Segment (unit-wise) tab. Renders the branch-level rows the
 * A5 seed recorded (kpi_values.segment); the unit-wise layout mirrors the
 * board report's segment tables.
 */

const BS_KEYS = [
  "fixed_assets",
  "inventory",
  "trade_receivables",
  "cash_bank",
  "trade_payables",
  "secured_borrowings",
  "unsecured_borrowings",
] as const;

const cellHead = "py-2 pr-4 text-right font-semibold";
const cellNum = "py-2.5 pr-4 text-right tabular-nums text-navy";

export async function SegmentTab({
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

  const segmentRows = snapshot ? await getSegmentValues(snapshot.periodId) : [];

  if (!snapshot || segmentRows.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {selector}
        <Card className="p-10 text-center">
          <p className="text-[14px] text-slate">
            No unit-level data recorded for {snapshot?.periodLabel ?? "this period"}.
          </p>
          <p className="mt-1 text-[12.5px] text-slate-light">
            Unit-wise figures appear here once branch-level financials are entered.
          </p>
        </Card>
      </div>
    );
  }

  // segment -> (definition key -> value)
  const bySegment = new Map<string, Map<string, number>>();
  for (const row of segmentRows) {
    const inner = bySegment.get(row.segment) ?? new Map<string, number>();
    inner.set(row.definitionKey, row.value);
    bySegment.set(row.segment, inner);
  }
  const segments = [...bySegment.entries()].sort(
    (a, b) => (b[1].get("revenue") ?? 0) - (a[1].get("revenue") ?? 0),
  );
  const totalRevenue = segments.reduce(
    (sum, [, values]) => sum + (values.get("revenue") ?? 0),
    0,
  );

  const pnlUnits = segments.filter(([, values]) => values.has("revenue"));
  const bsLabels = new Map(
    segmentRows.map((row) => [row.definitionKey, row.definitionLabel]),
  );
  const bsKeys = BS_KEYS.filter((key) =>
    segments.some(([, values]) => values.has(key)),
  );

  return (
    <div className="flex flex-col gap-6">
      {selector}

      {pnlUnits.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-[17px] text-navy">
            Unit-wise Results — {snapshot.periodLabel}
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4 font-semibold">Unit</th>
                  <th className={cellHead}>Revenue</th>
                  <th className={cellHead}>% of Group</th>
                  <th className={cellHead}>Gross Profit</th>
                  <th className={cellHead}>GP %</th>
                  <th className={cellHead}>Net Profit</th>
                  <th className={cellHead}>NP %</th>
                </tr>
              </thead>
              <tbody>
                {pnlUnits.map(([segment, values]) => {
                  const revenue = values.get("revenue") ?? 0;
                  const gp = values.get("gross_profit");
                  const np = values.get("net_profit");
                  return (
                    <tr key={segment} className="border-b border-line/60">
                      <td className="py-2.5 pr-4 text-slate">{segment}</td>
                      <td className={cellNum}>{formatInrTable(revenue)}</td>
                      <td className={cellNum}>
                        {totalRevenue !== 0
                          ? formatPercent((revenue / totalRevenue) * 100)
                          : "—"}
                      </td>
                      <td className={cellNum}>{gp !== undefined ? formatInrTable(gp) : "—"}</td>
                      <td className={cellNum}>
                        {gp !== undefined && revenue !== 0
                          ? formatPercent((gp / revenue) * 100)
                          : "—"}
                      </td>
                      <td className={cellNum}>{np !== undefined ? formatInrTable(np) : "—"}</td>
                      <td className={cellNum}>
                        {np !== undefined && revenue !== 0
                          ? formatPercent((np / revenue) * 100)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-mist/50 font-semibold">
                  <td className="py-2.5 pr-4 text-navy">Group Total</td>
                  <td className={cellNum}>{formatInrTable(totalRevenue)}</td>
                  <td className={cellNum}>100%</td>
                  <td className={cellNum} colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {bsKeys.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-[17px] text-navy">
            Balance Sheet by Unit — {snapshot.periodLabel}
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-slate">
                  <th className="py-2 pr-4 font-semibold">Particulars</th>
                  {segments.map(([segment]) => (
                    <th key={segment} className={cellHead}>{segment}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bsKeys.map((key) => (
                  <tr key={key} className="border-b border-line/60">
                    <td className="py-2.5 pr-4 text-slate">{bsLabels.get(key) ?? key}</td>
                    {segments.map(([segment, values]) => {
                      const value = values.get(key);
                      return (
                        <td key={segment} className={cellNum}>
                          {value !== undefined ? formatInrTable(value) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
