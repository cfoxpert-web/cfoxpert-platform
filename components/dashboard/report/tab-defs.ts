/**
 * Amendment A3 — the report tab registry. Lives in a shared (non-"use
 * client") module because BOTH sides need it: the client tab nav renders it,
 * and the server page validates ?tab= against it. Importing values from a
 * client module into server code yields an opaque client reference — which
 * is exactly the crash this file exists to prevent.
 */
export const REPORT_TABS = [
  { key: "overview", label: "Overview" },
  { key: "pnl", label: "P&L" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "ratios", label: "Key Ratios" },
  { key: "cost-structure", label: "Cost Structure" },
  { key: "segment", label: "Segment" },
  { key: "inventory", label: "Inventory" },
] as const;

export type ReportTabKey = (typeof REPORT_TABS)[number]["key"];
