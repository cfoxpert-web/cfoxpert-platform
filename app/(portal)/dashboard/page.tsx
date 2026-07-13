import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CommandCenter } from "@/components/dashboard/command-center";
import { ReportTabs, REPORT_TABS } from "@/components/dashboard/report-tabs";
import { PnlTab } from "@/components/dashboard/report/pnl-tab";
import { BalanceSheetTab } from "@/components/dashboard/report/balance-sheet-tab";
import { RatiosTab } from "@/components/dashboard/report/ratios-tab";
import { CostStructureTab } from "@/components/dashboard/report/cost-structure-tab";
import { SegmentTab } from "@/components/dashboard/report/segment-tab";
import { InventoryTab } from "@/components/dashboard/report/inventory-tab";
import {
  getCurrentUserOrganization,
  type DashboardQuery,
} from "@/lib/dashboard/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { isComparisonMode } from "@/lib/kpi/period-comparison";

/** Collapse a possibly-repeated query param to its first value. */
const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [org, params] = await Promise.all([
    getCurrentUserOrganization(),
    searchParams,
  ]);

  // Report tabs exist only on the real-data path (Amendment A3); mock mode
  // keeps the classic single-view dashboard byte-identically.
  const showTabs = isFeatureEnabled("realDashboardData") && org !== null;
  const tabParam = first(params.tab);
  const tab =
    showTabs && tabParam && REPORT_TABS.some((t) => t.key === tabParam)
      ? tabParam
      : "overview";

  const compare = first(params.compare);
  const query: DashboardQuery = {
    periodLabel: first(params.period),
    compare: isComparisonMode(compare) ? compare : undefined,
    comparePeriodLabel: first(params.comparePeriod),
  };

  return (
    <DashboardLayout title="CEO Command Center" companyName={org?.name}>
      <div className="flex flex-col gap-6">
        {showTabs && (
          <Suspense>
            <ReportTabs active={tab} />
          </Suspense>
        )}
        {tab === "overview" && (
          <CommandCenter
            period={query.periodLabel}
            compare={compare}
            comparePeriod={query.comparePeriodLabel}
          />
        )}
        {org && tab === "pnl" && <PnlTab organizationId={org.id} query={query} />}
        {org && tab === "balance-sheet" && (
          <BalanceSheetTab organizationId={org.id} query={query} />
        )}
        {org && tab === "ratios" && <RatiosTab organizationId={org.id} query={query} />}
        {org && tab === "cost-structure" && (
          <CostStructureTab organizationId={org.id} query={query} />
        )}
        {org && tab === "segment" && <SegmentTab organizationId={org.id} query={query} />}
        {org && tab === "inventory" && <InventoryTab organizationId={org.id} />}
      </div>
    </DashboardLayout>
  );
}
