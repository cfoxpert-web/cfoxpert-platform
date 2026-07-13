import { Suspense } from "react";
import { Card } from "@/components/cards/card";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { getReportSnapshot, type DashboardQuery } from "@/lib/dashboard/data";
import { formatPercent } from "@/lib/dashboard/map-kpis";
import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import { ReportEmpty } from "./report-empty";
import { kpiMap, marginSubRow, statementLine } from "./statement";

/**
 * Amendment A3 — Cost Structure tab, v1: the gross-profit-to-net-profit
 * bridge plus %-of-revenue bars. Category-level expense breakdown (employee /
 * admin / selling / ...) is a known data gap — it needs either more KPI
 * definitions or the A4 ingestion pipeline, and is not fabricated here.
 */
export async function CostStructureTab({
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
  const rows: ComparisonRow[] = [
    statementLine(map, "gross_profit", { emphasis: true }),
    marginSubRow(map, "gross_profit", "Gross Profit %"),
    statementLine(map, "other_income", { labelOverride: "Add: Other Income" }),
    statementLine(map, "indirect_expenses", {
      labelOverride: "Less: Indirect Expenses (incl. depreciation & finance cost)",
    }),
    statementLine(map, "depreciation", { labelOverride: "of which: Depreciation" }),
    statementLine(map, "finance_cost", { labelOverride: "of which: Finance Cost" }),
    statementLine(map, "pbt", { emphasis: true }),
    statementLine(map, "tax_expense", { labelOverride: "Less: Tax" }),
    statementLine(map, "net_profit", { emphasis: true }),
    marginSubRow(map, "net_profit", "Net Profit %"),
  ].filter((row): row is ComparisonRow => row !== null);

  // %-of-revenue bars (working-capital-card idiom).
  const revenue = map.get("revenue")?.value;
  const bars =
    revenue && revenue !== 0
      ? (
          [
            ["gross_profit", "Gross Profit"],
            ["indirect_expenses", "Indirect Expenses"],
            ["net_profit", "Net Profit"],
          ] as const
        )
          .map(([key, label]) => {
            const kpi = map.get(key);
            if (!kpi) return null;
            return { label, share: (kpi.value / revenue) * 100 };
          })
          .filter((bar): bar is { label: string; share: number } => bar !== null)
      : [];

  return (
    <div className="flex flex-col gap-6">
      {selector}
      <ComparisonTable
        title={`Gross Profit to Net Profit Bridge — ${snapshot.periodLabel}`}
        subtitle="Category-level expense breakdown follows once expense-line data is recorded."
        currentLabel={snapshot.periodLabel}
        priorLabel={snapshot.comparisonLabel}
        rows={rows}
      />
      {bars.length > 0 && (
        <Card className="p-6">
          <h3 className="font-display text-[17px] text-navy">Share of Revenue</h3>
          <div className="mt-4 flex flex-col gap-4">
            {bars.map((bar) => (
              <div key={bar.label}>
                <div className="mb-1.5 flex justify-between text-[12.5px]">
                  <span className="text-slate">{bar.label}</span>
                  <span className="font-semibold text-navy">{formatPercent(bar.share)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-pill bg-line">
                  <div
                    className="h-full rounded-pill bg-teal"
                    style={{ width: `${Math.min(100, Math.max(0, bar.share))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
