import { Suspense } from "react";
import { Card } from "@/components/cards/card";
import { KPICard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { WorkingCapitalCard } from "@/components/dashboard/working-capital-card";
import { HealthScoreCard } from "@/components/dashboard/health-score-card";
import { ActionTracker } from "@/components/dashboard/action-tracker";
import { BoardPackWidget } from "@/components/dashboard/board-pack-widget";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TasksWidget } from "@/components/dashboard/tasks-widget";
import { DocumentsWidget } from "@/components/dashboard/documents-widget";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  MOCK_KPIS,
  MOCK_REVENUE_SERIES,
  MOCK_CASH_FLOW_SERIES,
  MOCK_WORKING_CAPITAL,
  MOCK_ACTION_ITEMS,
  MOCK_BOARD_PACKS,
  MOCK_NOTIFICATIONS,
  MOCK_ACTIVITIES,
  MOCK_TASKS,
  MOCK_DOCUMENTS,
  MOCK_QUICK_ACTIONS,
} from "@/lib/mock-data/dashboard";

import { getDashboardData, type DashboardQuery } from "@/lib/dashboard/data";
import { toKpiCardData } from "@/lib/dashboard/map-kpis";
import { getClientDocuments } from "@/lib/documents/queries";
import { DOCUMENT_KINDS } from "@/lib/documents/model";
import { getMonthlySeries } from "@/lib/kpi/queries";
import { isComparisonMode } from "@/lib/kpi/period-comparison";
import { PeriodComparisonSelector } from "@/components/dashboard/period-comparison-selector";
import { ReportEmpty } from "@/components/dashboard/report/report-empty";
import { getClientHealthScore } from "@/lib/dashboard/health";
import type { DocumentItem, QuickAction, TimeSeriesPoint } from "@/types";

/** Real quick actions — every link goes somewhere that exists today. */
const REAL_QUICK_ACTIONS: QuickAction[] = [
  { id: "qa1", label: "Upload Financials", href: "/dashboard/documents" },
  { id: "qa2", label: "View Health Score", href: "/dashboard?tab=health" },
  { id: "qa3", label: "Knowledge Hub", href: "/knowledge" },
  { id: "qa4", label: "Message CFOxpert", href: "/contact" },
];

/**
 * Milestone 11: the dashboard's data seam, swapped. With the
 * realDashboardData flag ON and a signed-in member, the KPI row and
 * Health Score render REAL data (KPI Engine + latest health_scores row);
 * with the flag OFF (or no session/org/data) every widget renders the
 * same mock data as before — byte-identical behavior. Widgets are
 * untouched either way; only the data source changes, exactly as the
 * Phase 4 brief designed for.
 *
 * Remaining widgets (charts, actions, board packs, notifications, tasks,
 * documents) stay mock until their own milestones deliver real sources.
 */
export async function CommandCenter({
  period,
  compare,
  comparePeriod,
}: {
  period?: string;
  compare?: string;
  comparePeriod?: string;
} = {}) {
  const query: DashboardQuery = {
    periodLabel: period,
    compare: isComparisonMode(compare) ? compare : undefined,
    comparePeriodLabel: comparePeriod,
  };
  const real = await getDashboardData(query);
  const kpis = real?.snapshot
    ? toKpiCardData(real.snapshot.kpis, real.snapshot.comparisonLabel)
    : null;
  // Real-data path with an empty period shows an honest empty state; the
  // mock fallback is ONLY for mock mode (flag off / no org resolved).
  const kpiRow = kpis && kpis.length > 0 ? kpis : real ? null : MOCK_KPIS;

  // Health score (A2): computed from financials at read time; falls back to
  // a persisted lead-check score if one exists; mock ONLY in mock mode.
  // null on the real path = honest "Not yet assessed" card.
  const computedHealth = real
    ? await getClientHealthScore(real.organizationId, query.periodLabel)
    : null;
  const healthScore = computedHealth
    ? { score: computedHealth.overallScore, grade: computedHealth.grade as string }
    : real
      ? real.healthScore
      : { score: 82, grade: "A-" };

  // Pre-launch content pass: on the real path the lower widgets carry REAL
  // data or don't render — no fake numbers in front of clients. Mock mode
  // keeps every illustrative widget for demos, byte-identical.
  let revenueSeries: TimeSeriesPoint[] = [];
  let recentDocuments: DocumentItem[] = [];
  if (real) {
    const [series, docs] = await Promise.all([
      getMonthlySeries(real.organizationId, "revenue"),
      getClientDocuments(real.organizationId),
    ]);
    revenueSeries = series
      .filter((p) => p.segment === null)
      .map((p) => ({
        month: p.periodLabel.split(" ")[0] ?? p.periodLabel,
        value: Math.round(p.value / 100000), // rupees → ₹ lakhs (chart unit)
      }));
    recentDocuments = docs.slice(0, 3).map((d) => ({
      id: d.id,
      name: d.fileName,
      category:
        DOCUMENT_KINDS.find((k) => k.key === d.kind)?.label ?? "Document",
      updatedLabel: new Date(d.uploadedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Period + comparison selector (real data only). Suspense: the
          selector reads useSearchParams(). */}
      {real?.snapshot && real.periods.length > 0 && (
        <Suspense>
          <PeriodComparisonSelector
            periods={real.periods}
            currentPeriod={real.snapshot.periodLabel}
            mode={real.snapshot.comparisonMode}
            comparePeriodLabel={real.snapshot.comparisonLabel}
          />
        </Suspense>
      )}

      {/* KPI row */}
      {kpiRow ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiRow.map((kpi) => (
            <KPICard key={kpi.id} {...kpi} />
          ))}
        </div>
      ) : (
        <ReportEmpty periodLabel={real?.snapshot?.periodLabel} />
      )}

      {/* Charts row. Real path: revenue trend from recorded monthly values
          (needs ≥2 points to be a trend); cash flow has no real source yet
          and renders only in mock mode. */}
      {(!real || revenueSeries.length >= 2) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-1 font-display text-[16px] text-navy">Revenue Trend</h3>
            <p className="mb-2 text-[12.5px] text-slate">
              {real ? "Recorded months, ₹ lakhs" : "Last 6 months, ₹ lakhs"}
            </p>
            <RevenueChart data={real ? revenueSeries : MOCK_REVENUE_SERIES} />
          </Card>
          {!real && (
            <Card className="p-6">
              <h3 className="mb-1 font-display text-[16px] text-navy">Cash Flow</h3>
              <p className="mb-2 text-[12.5px] text-slate">Inflow vs outflow, ₹ lakhs</p>
              <CashFlowChart data={MOCK_CASH_FLOW_SERIES} />
            </Card>
          )}
        </div>
      )}

      {/* Working capital (mock-only) + health score */}
      <div
        className={
          real
            ? "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]"
            : "grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]"
        }
      >
        {!real && <WorkingCapitalCard data={MOCK_WORKING_CAPITAL} />}
        <HealthScoreCard
          score={healthScore?.score ?? null}
          grade={healthScore?.grade ?? null}
          breakdownHref={
            real
              ? `/dashboard?tab=health${
                  real.snapshot
                    ? `&period=${encodeURIComponent(real.snapshot.periodLabel)}`
                    : ""
                }`
              : undefined
          }
        />
      </div>

      {/* Illustrative widgets — mock mode only (their real sources are
          future milestones; their pages show honest coming-soon states). */}
      {!real && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ActionTracker items={MOCK_ACTION_ITEMS} />
            <BoardPackWidget packs={MOCK_BOARD_PACKS} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NotificationsPanel items={MOCK_NOTIFICATIONS} />
            <RecentActivity items={MOCK_ACTIVITIES} />
            <TasksWidget items={MOCK_TASKS} />
            <DocumentsWidget items={MOCK_DOCUMENTS} />
          </div>
        </>
      )}

      {/* Real path: the documents widget is real (top 3 recent uploads). */}
      {real && recentDocuments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DocumentsWidget items={recentDocuments} />
        </div>
      )}

      <QuickActions items={real ? REAL_QUICK_ACTIONS : MOCK_QUICK_ACTIONS} />
    </div>
  );
}
