import type { EntitlementKey } from "@/lib/entitlements";

/**
 * Amendment A3 — the report tab registry. Lives in a shared (non-"use
 * client") module because BOTH sides need it: the client tab nav renders it,
 * and the server page validates ?tab= against it. Importing values from a
 * client module into server code yields an opaque client reference — which
 * is exactly the crash this file exists to prevent.
 *
 * Amendment A6: each tab names the entitlement that unlocks it. Tabs the
 * org isn't entitled to stay VISIBLE but greyed out (single combined
 * package today; the map matters once real tiers are assigned).
 */
export const REPORT_TABS = [
  { key: "overview", label: "Overview", entitlement: "report.overview" },
  { key: "pnl", label: "P&L", entitlement: "report.pnl" },
  { key: "balance-sheet", label: "Balance Sheet", entitlement: "report.balance_sheet" },
  { key: "ratios", label: "Key Ratios", entitlement: "report.ratios" },
  { key: "health", label: "Health Score", entitlement: "report.health_score" },
  { key: "cost-structure", label: "Cost Structure", entitlement: "report.cost_structure" },
  { key: "segment", label: "Segment", entitlement: "report.segment" },
  { key: "inventory", label: "Inventory", entitlement: "report.inventory" },
] as const satisfies readonly {
  key: string;
  label: string;
  entitlement: EntitlementKey;
}[];

export type ReportTabKey = (typeof REPORT_TABS)[number]["key"];
