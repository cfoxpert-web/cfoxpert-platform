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

/**
 * All data below is mock, per the Phase 4 brief (no backend, no database,
 * no auth). Every widget is independently reusable — this component is
 * only the layout that arranges them, so Phase 5's Client Portal can either
 * reuse this whole composition or cherry-pick individual widgets.
 */
export function CommandCenter() {
  return (
    <div className="flex flex-col gap-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {MOCK_KPIS.map((kpi) => (
          <KPICard key={kpi.id} {...kpi} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 font-display text-[16px] text-navy">Revenue Trend</h3>
          <p className="mb-2 text-[12.5px] text-slate">Last 6 months, ₹ lakhs</p>
          <RevenueChart data={MOCK_REVENUE_SERIES} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-1 font-display text-[16px] text-navy">Cash Flow</h3>
          <p className="mb-2 text-[12.5px] text-slate">Inflow vs outflow, ₹ lakhs</p>
          <CashFlowChart data={MOCK_CASH_FLOW_SERIES} />
        </Card>
      </div>

      {/* Working capital + health score */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <WorkingCapitalCard data={MOCK_WORKING_CAPITAL} />
        <HealthScoreCard score={82} grade="A-" />
      </div>

      {/* Action tracker + board packs */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ActionTracker items={MOCK_ACTION_ITEMS} />
        <BoardPackWidget packs={MOCK_BOARD_PACKS} />
      </div>

      {/* Sidebar-style widgets */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NotificationsPanel items={MOCK_NOTIFICATIONS} />
        <RecentActivity items={MOCK_ACTIVITIES} />
        <TasksWidget items={MOCK_TASKS} />
        <DocumentsWidget items={MOCK_DOCUMENTS} />
      </div>

      <QuickActions items={MOCK_QUICK_ACTIONS} />
    </div>
  );
}
