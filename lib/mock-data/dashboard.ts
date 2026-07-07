import type {
  KPIData,
  TimeSeriesPoint,
  WorkingCapitalBreakdown,
  ActionItem,
  BoardPack,
  NotificationItem,
  ActivityItem,
  TaskItem,
  DocumentItem,
  QuickAction,
} from "@/types";

/**
 * All mock — no backend, no database, per the Phase 4 brief. Each export is
 * shaped exactly like the API response it will eventually be replaced by,
 * so components never need to change when real data arrives, only the
 * fetch call that produces this data does.
 */

export const MOCK_KPIS: KPIData[] = [
  { id: "revenue", label: "Revenue (MTD)", value: "₹1.54Cr", delta: { direction: "up", label: "12% YoY" }, icon: "revenue" },
  { id: "margin", label: "EBITDA Margin", value: "18.6%", delta: { direction: "up", label: "2.4%" }, icon: "margin" },
  { id: "cashcycle", label: "Cash Cycle", value: "32 days", delta: { direction: "up", label: "8 days faster" }, icon: "cashcycle" },
  { id: "workingcapital", label: "Working Capital", value: "₹4.1Cr", delta: { direction: "down", label: "optimizing" }, icon: "workingcapital" },
];

export const MOCK_REVENUE_SERIES: TimeSeriesPoint[] = [
  { month: "Feb", value: 128 },
  { month: "Mar", value: 134 },
  { month: "Apr", value: 141 },
  { month: "May", value: 138 },
  { month: "Jun", value: 149 },
  { month: "Jul", value: 154 },
];

export const MOCK_CASH_FLOW_SERIES: TimeSeriesPoint[] = [
  { month: "Feb", value: 62, secondaryValue: 54 },
  { month: "Mar", value: 68, secondaryValue: 59 },
  { month: "Apr", value: 71, secondaryValue: 65 },
  { month: "May", value: 66, secondaryValue: 70 },
  { month: "Jun", value: 75, secondaryValue: 63 },
  { month: "Jul", value: 79, secondaryValue: 68 },
];

export const MOCK_WORKING_CAPITAL: WorkingCapitalBreakdown = {
  receivablesDays: 41,
  payablesDays: 28,
  inventoryDays: 19,
  cashConversionCycle: 32,
  workingCapitalAmount: "₹4.1Cr",
};

export const MOCK_ACTION_ITEMS: ActionItem[] = [
  { id: "a1", title: "Renegotiate supplier payment terms", owner: "Finance Head", status: "overdue", dueDate: "4 days overdue" },
  { id: "a2", title: "Roll out new pricing structure", owner: "Sales Head", status: "in-progress", dueDate: "Due in 6 days" },
  { id: "a3", title: "Close FY25 statutory audit", owner: "CFOxpert", status: "done" },
  { id: "a4", title: "Reduce receivables ageing beyond 90 days", owner: "Finance Head", status: "in-progress", dueDate: "Due in 10 days" },
];

export const MOCK_BOARD_PACKS: BoardPack[] = [
  { id: "bp1", title: "FY26 Q4 Board Pack", meta: "18 pages · Financials + commentary", status: "ready" },
  { id: "bp2", title: "FY26 Q3 Board Pack", meta: "Sent to 4 board members", status: "sent" },
  { id: "bp3", title: "FY26 Q1 Annual Summary", meta: "In preparation", status: "draft" },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", message: "Receivables ageing beyond 90 days is rising", timeAgo: "2h ago", tone: "warning" },
  { id: "n2", message: "March board review notes are ready", timeAgo: "1d ago", tone: "info" },
  { id: "n3", message: "Health Score improved to 82 (+6 pts)", timeAgo: "2d ago", tone: "success" },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  { id: "act1", actor: "CFOxpert", action: "uploaded the Q4 board pack", timeAgo: "3h ago" },
  { id: "act2", actor: "Finance Head", action: "marked 'Close FY25 audit' as done", timeAgo: "1d ago" },
  { id: "act3", actor: "Sales Head", action: "updated the pricing rollout status", timeAgo: "2d ago" },
];

export const MOCK_TASKS: TaskItem[] = [
  { id: "t1", title: "Review April board pack draft", dueLabel: "Due tomorrow", done: false },
  { id: "t2", title: "Approve updated collection policy", dueLabel: "Due in 3 days", done: false },
  { id: "t3", title: "Sign off Q3 board minutes", dueLabel: "Completed", done: true },
];

export const MOCK_DOCUMENTS: DocumentItem[] = [
  { id: "d1", name: "FY26 Q4 Financial Statements.pdf", category: "Financial Statements", updatedLabel: "Updated 2 days ago" },
  { id: "d2", name: "March Board Pack.pdf", category: "Board Packs", updatedLabel: "Updated 1 week ago" },
  { id: "d3", name: "GST Return — June.pdf", category: "Compliance", updatedLabel: "Updated 2 weeks ago" },
];

export const MOCK_QUICK_ACTIONS: QuickAction[] = [
  { id: "qa1", label: "Upload Document", href: "#" },
  { id: "qa2", label: "Add Action Item", href: "#" },
  { id: "qa3", label: "Request Board Pack", href: "#" },
  { id: "qa4", label: "Message CFOxpert", href: "#" },
];
