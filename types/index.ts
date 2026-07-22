import type { DriverKey } from "@/constants/drivers";

export interface MetricTileData {
  label: string;
  value: string;
  delta?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
}

export interface DriverScore {
  key: DriverKey;
  score: number; // 0-100
  weight: number; // 0-1
}

export interface HealthCheckResult {
  overallScore: number;
  grade: "A" | "A-" | "B" | "C" | "D";
  driverScores: DriverScore[];
  completedAt: string; // ISO date
}

export interface ContactDetails {
  name: string;
  phone: string;
  email: string;
}

export type ArticleCategory =
  | "CEO Guides"
  | "Business Intelligence"
  | "Cash Flow"
  | "Working Capital"
  | "Enterprise Value"
  | "Manufacturing"
  | "Governance"
  | "Growth"
  | "Financial Strategy"
  | "KPI Library"
  | "Industry Insights";

/**
 * No markdown parser is in the approved stack, so article bodies are typed
 * content blocks rendered by components/knowledge/article-body.tsx — each
 * block type maps to one presentational component, same pattern as the
 * rest of the design system (data in, component renders it, no raw HTML
 * strings floating around).
 */
export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "quote"; text: string }
  | { type: "stats"; items: { value: string; label: string }[] }
  | { type: "list"; items: string[] };

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  readingTimeMinutes: number;
  featured?: boolean;
  publishedAt: string; // ISO date
  author: string;
  /** Present only for fully-written articles; teaser-only cards omit this. */
  blocks?: ArticleBlock[];
}

export type ActionStatus = "overdue" | "in-progress" | "done";

export interface ActionItem {
  id: string;
  title: string;
  owner: string;
  status: ActionStatus;
  dueDate?: string;
}

export interface KPIData {
  id: string;
  label: string;
  value: string;
  delta?: {
    direction: "up" | "down" | "flat";
    label: string;
  };
  icon:
    | "revenue"
    | "margin"
    | "cashcycle"
    | "workingcapital"
    | "healthscore"
    | "actions"
    | "grossprofit"
    | "otherincome"
    | "netprofit"
    | "receivables"
    | "payables"
    | "cashbank"
    | "inventory";
}

export interface TimeSeriesPoint {
  month: string;
  value: number;
  secondaryValue?: number;
}

export interface WorkingCapitalBreakdown {
  receivablesDays: number;
  payablesDays: number;
  inventoryDays: number;
  cashConversionCycle: number;
  workingCapitalAmount: string;
}

export type BoardPackStatus = "ready" | "sent" | "draft";

export interface BoardPack {
  id: string;
  title: string;
  meta: string;
  status: BoardPackStatus;
}

export type NotificationTone = "info" | "warning" | "success";

export interface NotificationItem {
  id: string;
  message: string;
  timeAgo: string;
  tone: NotificationTone;
}

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  timeAgo: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueLabel: string;
  done: boolean;
}

export type DocumentCategory = "Financial Statements" | "Board Packs" | "Compliance" | "Contracts";

export interface DocumentItem {
  id: string;
  name: string;
  category: DocumentCategory;
  updatedLabel: string;
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role: "owner" | "admin" | "member";
  avatarInitial: string;
}

export interface Session {
  user: User;
  /** ISO date string. Structure only — nothing currently checks this. */
  expiresAt: string;
}
