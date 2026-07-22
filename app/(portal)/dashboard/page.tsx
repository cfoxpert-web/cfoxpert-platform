import { Suspense } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CommandCenter } from "@/components/dashboard/command-center";
import { ReportTabs } from "@/components/dashboard/report-tabs";
import { REPORT_TABS } from "@/components/dashboard/report/tab-defs";
import { PnlTab } from "@/components/dashboard/report/pnl-tab";
import { BalanceSheetTab } from "@/components/dashboard/report/balance-sheet-tab";
import { RatiosTab } from "@/components/dashboard/report/ratios-tab";
import { HealthScoreTab } from "@/components/dashboard/report/health-score-tab";
import { CostStructureTab } from "@/components/dashboard/report/cost-structure-tab";
import { SegmentTab } from "@/components/dashboard/report/segment-tab";
import { InventoryTab } from "@/components/dashboard/report/inventory-tab";
import { ReportLocked } from "@/components/dashboard/report/report-locked";
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

  // Amendment A6: unentitled tabs stay visible but greyed; navigating to
  // one (including a ?tab= deep link) renders the locked panel and fetches
  // no data. On the single combined package nothing is locked.
  const lockedTabs =
    showTabs && org !== null
      ? REPORT_TABS.filter((t) => !org.entitlements.includes(t.entitlement))
      : [];
  const activeLocked = lockedTabs.find((t) => t.key === tab);

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
            <ReportTabs active={tab} locked={lockedTabs.map((t) => t.key)} />
          </Suspense>
        )}
        {activeLocked && <ReportLocked entitlement={activeLocked.entitlement} />}
        {!activeLocked && tab === "overview" && (
          <CommandCenter
            period={query.periodLabel}
            compare={compare}
            comparePeriod={query.comparePeriodLabel}
          />
        )}
        {org && !activeLocked && tab === "pnl" && (
          <PnlTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "balance-sheet" && (
          <BalanceSheetTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "ratios" && (
          <RatiosTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "health" && (
          <HealthScoreTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "cost-structure" && (
          <CostStructureTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "segment" && (
          <SegmentTab organizationId={org.id} query={query} />
        )}
        {org && !activeLocked && tab === "inventory" && (
          <InventoryTab organizationId={org.id} />
        )}
      </div>
    </DashboardLayout>
  );
}
