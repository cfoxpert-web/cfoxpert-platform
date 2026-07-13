import { Suspense } from "react";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { getReportSnapshot, type DashboardQuery } from "@/lib/dashboard/data";
import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import { ReportEmpty } from "./report-empty";
import { kpiMap, statementLine } from "./statement";

const BS_KEYS = [
  "fixed_assets",
  "inventory",
  "trade_receivables",
  "cash_bank",
  "trade_payables",
  "secured_borrowings",
  "unsecured_borrowings",
] as const;

/**
 * Amendment A3 — Balance Sheet tab. Position at the current period's end vs
 * the comparator's, with movement in ₹ and % (the report's movement-analysis
 * layout).
 */
export async function BalanceSheetTab({
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

  const map = snapshot ? kpiMap(snapshot.kpis) : null;
  const rows: ComparisonRow[] = map
    ? BS_KEYS.map((key) => statementLine(map, key, { withDelta: true })).filter(
        (row): row is ComparisonRow => row !== null,
      )
    : [];

  if (!snapshot || rows.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {selector}
        <ReportEmpty periodLabel={snapshot?.periodLabel} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {selector}
      <ComparisonTable
        title={`Balance Sheet Movements — ${snapshot.periodLabel}`}
        subtitle="Consolidated position at period end vs the comparison period end."
        currentLabel={snapshot.periodLabel}
        priorLabel={snapshot.comparisonLabel}
        rows={rows}
      />
    </div>
  );
}
