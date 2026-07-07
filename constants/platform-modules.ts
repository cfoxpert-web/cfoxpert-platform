import type { LucideIcon } from "lucide-react";
import {
  Gauge,
  Target,
  CalendarCheck,
  FileStack,
  ListChecks,
  Sparkles,
  Archive,
  KeyRound,
} from "lucide-react";
import type { MetricTileData } from "@/types";

export type ModulePreviewType = "grid" | "list" | "pills";

export interface ModuleListRow {
  status: "green" | "amber" | "red";
  title: string;
  subtitle: string;
  tag: string;
}

export interface PlatformModule {
  key: string;
  name: string;
  tagline: string;
  icon: LucideIcon;
  iconGradient: string;
  comingSoon?: boolean;
  preview: {
    eyebrow: string;
    title: string;
    description: string;
  } & (
    | { type: "grid"; tiles: MetricTileData[] }
    | { type: "list"; rows: ModuleListRow[] }
    | { type: "pills"; pills: string[] }
  );
}

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    key: "command",
    name: "CEO Command Center",
    tagline: "Every critical metric, one view.",
    icon: Gauge,
    iconGradient: "linear-gradient(135deg,#4C5FD5,#3C8CD9)",
    preview: {
      eyebrow: "Executive Dashboard",
      title: "CEO Command Center",
      description:
        "Revenue, profitability, cash flow, working capital, and health score — all in one live view, updated monthly.",
      type: "grid",
      tiles: [
        { label: "Revenue Trend", value: "₹18.4Cr", delta: { direction: "up", label: "12% YoY" } },
        { label: "EBITDA Margin", value: "18.6%", delta: { direction: "up", label: "2.4%" } },
        { label: "Cash Cycle", value: "32 days", delta: { direction: "up", label: "8 days faster" } },
        { label: "Working Capital", value: "₹4.1Cr", delta: { direction: "down", label: "optimizing" } },
        { label: "Health Score", value: "82 / A-", delta: { direction: "up", label: "6 pts" } },
        { label: "Open Actions", value: "3 of 14", delta: { direction: "flat", label: "On track" } },
      ],
    },
  },
  {
    key: "score",
    name: "Business Health Score",
    tagline: "One number for your whole business.",
    icon: Target,
    iconGradient: "linear-gradient(135deg,#1FB894,#0E8C77)",
    preview: {
      eyebrow: "Diagnostic",
      title: "Business Health Score",
      description:
        "A single, benchmarked score across all six enterprise value drivers — recalculated every quarter as the business changes.",
      type: "grid",
      tiles: [
        { label: "Overall Score", value: "82 / 100", delta: { direction: "up", label: "Grade A-" } },
        { label: "Financial Strength", value: "88", delta: { direction: "up", label: "Strong" } },
        { label: "Operational Excellence", value: "71", delta: { direction: "up", label: "Improving" } },
        { label: "Strategic Growth", value: "64", delta: { direction: "down", label: "Watch" } },
        { label: "Governance", value: "77", delta: { direction: "flat", label: "Stable" } },
        { label: "Capital & Valuation", value: "80", delta: { direction: "up", label: "Investor ready" } },
      ],
    },
  },
  {
    key: "reviews",
    name: "Monthly Board Reviews",
    tagline: "A structured review, every month.",
    icon: CalendarCheck,
    iconGradient: "linear-gradient(135deg,#D9A441,#B4863F)",
    preview: {
      eyebrow: "Cadence",
      title: "Monthly Board Reviews",
      description:
        "A standing 60-minute session each month walking through performance, risks, and decisions — not just numbers.",
      type: "list",
      rows: [
        { status: "green", title: "March Review — Completed", subtitle: "Cash flow, margin recovery plan approved", tag: "Closed" },
        { status: "amber", title: "April Review — Scheduled", subtitle: "Working capital deep-dive on agenda", tag: "Apr 18" },
        { status: "green", title: "February Review — Completed", subtitle: "Pricing revision approved, +2.1% margin", tag: "Closed" },
      ],
    },
  },
  {
    key: "boardpacks",
    name: "Board Packs",
    tagline: "Investor-grade reporting, ready every month.",
    icon: FileStack,
    iconGradient: "linear-gradient(135deg,#D97757,#B4863F)",
    preview: {
      eyebrow: "Reporting",
      title: "Board Packs",
      description:
        "A polished, board-ready pack — financials, KPIs, commentary, and action items — generated automatically each cycle.",
      type: "list",
      rows: [
        { status: "green", title: "FY26 Q4 Board Pack", subtitle: "18 pages · Financials + commentary", tag: "Ready" },
        { status: "green", title: "FY26 Q3 Board Pack", subtitle: "Sent to 4 board members", tag: "Sent" },
        { status: "amber", title: "FY26 Q1 Annual Summary", subtitle: "In preparation", tag: "Draft" },
      ],
    },
  },
  {
    key: "actions",
    name: "Action Tracker",
    tagline: "Decisions don't disappear after the meeting.",
    icon: ListChecks,
    iconGradient: "linear-gradient(135deg,#3C8CD9,#4C5FD5)",
    preview: {
      eyebrow: "Accountability",
      title: "Action Tracker",
      description:
        "Every commitment from every review gets an owner, a deadline, and a status — so nothing gets decided twice.",
      type: "list",
      rows: [
        { status: "red", title: "Renegotiate supplier payment terms", subtitle: "Owner: Finance Head · Overdue 4 days", tag: "Overdue" },
        { status: "amber", title: "Roll out new pricing structure", subtitle: "Owner: Sales Head · Due in 6 days", tag: "In progress" },
        { status: "green", title: "Close FY25 statutory audit", subtitle: "Owner: CFOxpert · Completed", tag: "Done" },
      ],
    },
  },
  {
    key: "ai",
    name: "AI Insights & Recommendations",
    tagline: "The system flags what matters before you ask.",
    icon: Sparkles,
    iconGradient: "linear-gradient(135deg,#4C5FD5,#1FB894)",
    preview: {
      eyebrow: "Intelligence",
      title: "AI Insights & Recommendations",
      description:
        "Pattern detection across your financials surfaces risks and opportunities automatically, with a plain-language recommendation attached.",
      type: "list",
      rows: [
        { status: "red", title: "Receivables ageing beyond 90 days rising", subtitle: "Recommendation: tighten collection terms with 3 accounts", tag: "Alert" },
        { status: "amber", title: "Raw material cost up 6% this quarter", subtitle: "Recommendation: revisit vendor contracts", tag: "Watch" },
        { status: "green", title: "Margin improved in exports segment", subtitle: "Recommendation: reallocate capacity toward exports", tag: "Opportunity" },
      ],
    },
  },
  {
    key: "vault",
    name: "Document Vault",
    tagline: "Every statutory and financial document, in one place.",
    icon: Archive,
    iconGradient: "linear-gradient(135deg,#8B98AC,#5B6B85)",
    preview: {
      eyebrow: "Records",
      title: "Document Vault",
      description:
        "Financial statements, board packs, compliance filings, and contracts — organized, version-controlled, and instantly retrievable.",
      type: "pills",
      pills: ["Financial Statements", "Board Packs", "GST & TDS Filings", "ROC Filings", "Loan Agreements", "Insurance Policies", "Audit Reports", "Cap Table"],
    },
  },
  {
    key: "portal",
    name: "Client Portal",
    tagline: "Your own login to the platform.",
    icon: KeyRound,
    iconGradient: "linear-gradient(135deg,#E6C88A,#B4863F)",
    comingSoon: true,
    preview: {
      eyebrow: "Coming Soon",
      title: "Client Portal",
      description:
        "A dedicated, secure login where you and your leadership team access dashboards, board packs, and the action tracker anytime — not just in meetings.",
      type: "pills",
      pills: ["Secure Login", "Team Access Levels", "Live Dashboard Access", "Document Downloads", "Mobile Ready"],
    },
  },
];
