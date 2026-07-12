import type { KPIData } from "@/types";
import type { EvaluatedKpi } from "../kpi/engine";

/**
 * Milestone 11 — maps the KPI Engine's evaluated output onto the exact
 * KPIData shape the existing KPICard widget renders. Pure; no math here
 * (the engine is the single computation path) — only formatting.
 */

const ICON_BY_KEY: Record<string, KPIData["icon"]> = {
  revenue: "revenue",
  gross_profit: "grossprofit",
  other_income: "otherincome",
  net_profit: "netprofit",
  trade_receivables: "receivables",
  trade_payables: "payables",
  cash_bank: "cashbank",
  inventory: "inventory",
};

/** ₹ compact formatting matching the mock convention (₹1.54Cr / ₹4.1L). */
export function formatInrCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 2).replace(/\.00$/, "")}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
}

export function formatKpiValue(value: number, unit: string): string {
  switch (unit) {
    case "%":
      return `${value.toFixed(1).replace(/\.0$/, "")}%`;
    case "days":
      return `${Math.round(value)} days`;
    case "INR":
      return formatInrCompact(value);
    default:
      return `${value}`;
  }
}

function deltaLabel(kpi: EvaluatedKpi, comparisonLabel: string): string {
  const t = kpi.trend;
  if (!t) return "";
  if (t.percentChange !== null) {
    const pct = Math.abs(t.percentChange).toFixed(1).replace(/\.0$/, "");
    return `${pct}% vs ${comparisonLabel}`;
  }
  return `${t.delta > 0 ? "+" : ""}${t.delta} vs ${comparisonLabel}`;
}

export function toKpiCardData(
  kpis: EvaluatedKpi[],
  comparisonLabel?: string | null,
): KPIData[] {
  const label = comparisonLabel ?? "prior";
  return kpis
    .filter((k) => k.definition.key in ICON_BY_KEY)
    .map((k) => ({
      id: k.definition.key,
      label: k.definition.label,
      value: formatKpiValue(k.value, k.definition.unit),
      delta: k.trend
        ? { direction: k.trend.direction, label: deltaLabel(k, label) }
        : undefined,
      icon: ICON_BY_KEY[k.definition.key]!,
    }));
}
