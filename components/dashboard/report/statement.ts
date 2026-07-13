import type { EvaluatedKpi } from "@/lib/kpi/engine";
import { formatInrTable, formatPercent } from "@/lib/dashboard/map-kpis";
import type { ComparisonRow } from "./comparison-table";

/**
 * Amendment A3 — pure glue between the KPI engine's evaluated output and the
 * comparison table's formatted rows. No math beyond arithmetic on values the
 * engine already produced (prior = current − trend.delta).
 */

export type KpiByKey = Map<string, EvaluatedKpi>;

export const kpiMap = (kpis: EvaluatedKpi[]): KpiByKey =>
  new Map(kpis.map((k) => [k.definition.key, k]));

export const priorValue = (k: EvaluatedKpi): number | null =>
  k.trend ? k.value - k.trend.delta : null;

export function movementFor(
  k: EvaluatedKpi,
  opts?: { withDelta?: boolean },
): ComparisonRow["movement"] {
  const t = k.trend;
  if (!t) return null;
  const symbol = t.direction === "up" ? "▲" : t.direction === "down" ? "▼" : "→";
  const tone = t.improving === null ? "flat" : t.improving ? "good" : "bad";
  const pct =
    t.percentChange !== null ? `${Math.abs(t.percentChange).toFixed(1)}%` : null;
  const label = opts?.withDelta
    ? `${t.delta >= 0 ? "+" : ""}${formatInrTable(t.delta)}${pct ? ` (${pct})` : ""}`
    : pct ?? formatInrTable(t.delta);
  return { symbol, label, tone };
}

/** One statement line from the snapshot; null when the period lacks it. */
export function statementLine(
  map: KpiByKey,
  key: string,
  opts?: { emphasis?: boolean; withDelta?: boolean; labelOverride?: string },
): ComparisonRow | null {
  const k = map.get(key);
  if (!k) return null;
  const prior = priorValue(k);
  return {
    label: opts?.labelOverride ?? k.definition.label,
    current: formatInrTable(k.value),
    prior: prior === null ? "—" : formatInrTable(prior),
    movement: movementFor(k, opts),
    emphasis: opts?.emphasis,
  };
}

/** Indented "% of revenue" sub-row (e.g. Gross Profit %). */
export function marginSubRow(
  map: KpiByKey,
  numeratorKey: string,
  label: string,
): ComparisonRow | null {
  const numerator = map.get(numeratorKey);
  const revenue = map.get("revenue");
  if (!numerator || !revenue || revenue.value === 0) return null;

  const current = (numerator.value / revenue.value) * 100;
  const priorNum = priorValue(numerator);
  const priorRev = priorValue(revenue);
  const prior =
    priorNum !== null && priorRev !== null && priorRev !== 0
      ? (priorNum / priorRev) * 100
      : null;

  return {
    label,
    current: formatPercent(current),
    prior: prior === null ? "—" : formatPercent(prior),
    sub: true,
  };
}
