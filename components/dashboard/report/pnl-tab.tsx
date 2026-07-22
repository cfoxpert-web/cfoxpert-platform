import { Suspense } from "react";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { getReportSnapshot, type DashboardQuery } from "@/lib/dashboard/data";
import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import { ReportEmpty } from "./report-empty";
import { kpiMap, marginSubRow, statementLine } from "./statement";

/**
 * Amendment A3 — P&L Comparison tab. Line-by-line statement, current period
 * vs the selected comparator. Lines a period doesn't carry (e.g. Q1 has no
 * tax provisioning) simply don't render — never a fabricated zero.
 */
export async function PnlTab({
  organizationId,
  query,
}: {
  organizationId: string;
  query: DashboardQuery;
}) {
  const { snapshot, periods } = await getReportSnapshot(organizationId, query);

  if (!snapshot || snapshot.kpis.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {snapshot && periods.length > 0 && (
          <Suspense>
            <PeriodComparisonSelector
              periods={periods}
              currentPeriod={snapshot.periodLabel}
              mode={snapshot.comparisonMode}
              comparePeriodLabel={snapshot.comparisonLabel}
            />
          </Suspense>
        )}
        <ReportEmpty periodLabel={snapshot?.periodLabel} />
      </div>
    );
  }

  const map = kpiMap(snapshot.kpis);
  const rows: ComparisonRow[] = [
    statementLine(map, "revenue", { emphasis: true }),
    statementLine(map, "gross_profit"),
    marginSubRow(map, "gross_profit", "Gross Profit %"),
    statementLine(map, "other_income"),
    statementLine(map, "indirect_expenses"),
    statementLine(map, "depreciation"),
    statementLine(map, "finance_cost"),
    statementLine(map, "pbt"),
    statementLine(map, "tax_expense"),
    statementLine(map, "net_profit", { emphasis: true }),
    marginSubRow(map, "net_profit", "Net Profit %"),
  ].filter((row): row is ComparisonRow => row !== null);

  return (
    <div className="flex flex-col gap-6">
      <Suspense>
        <PeriodComparisonSelector
          periods={periods}
          currentPeriod={snapshot.periodLabel}
          mode={snapshot.comparisonMode}
          comparePeriodLabel={snapshot.comparisonLabel}
        />
      </Suspense>
      <ComparisonTable
        title={`Profit & Loss — ${snapshot.periodLabel}`}
        subtitle="Consolidated. Lines shown are those recorded for the selected period."
        currentLabel={snapshot.periodLabel}
        priorLabel={snapshot.comparisonLabel}
        rows={rows}
      />
    </div>
  );
}
