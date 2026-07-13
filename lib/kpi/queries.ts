import { createClient } from "../supabase/server";
import {
  evaluateKpis,
  type EvaluatedKpi,
  type KpiDefinition,
  type KpiReading,
} from "./engine";
import {
  resolveComparator,
  type ComparablePeriod,
  type ComparisonMode,
} from "./period-comparison";

/**
 * Milestone 10 — KPI data access. Server-side only.
 * Amendment A1 — relationship-based period comparison (MoM/QoQ/YoY/custom).
 *
 * Reads through the AUTHENTICATED client: RLS (period → org membership)
 * is the tenancy boundary, so this layer never filters by trust — a
 * caller without membership simply gets empty data.
 *
 * Reads kpi_current_values (the canonical latest-value view) — never
 * kpi_values directly, per the migration-0004 rule. The KPI Engine stays
 * the single computation path; this layer only selects which two periods
 * to feed it (via the pure resolver in period-comparison.ts).
 */

type DefinitionRow = {
  id: string; key: string; label: string; unit: string; category: string;
  ideal_min: number | null; ideal_max: number | null;
  higher_is_better: boolean; sort_order: number;
};

type ValueRow = { kpi_definition_id: string; value: number; recorded_at: string };

type PeriodRow = {
  id: string; period_label: string; period_type: string;
  period_start: string | null; created_at: string;
};

export type KpiSnapshot = {
  periodId: string;
  periodLabel: string;
  comparisonMode: ComparisonMode;
  comparisonLabel: string | null; // comparator period label, null when none applies
  kpis: EvaluatedKpi[];
};

export type PeriodOption = { label: string; type: string };

/** The org's periods, newest-first, for the dashboard's period selector. */
export async function getOrgPeriods(organizationId: string): Promise<PeriodOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kpi_periods")
    .select("period_label, period_type, period_start, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("period_start", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as { period_label: string; period_type: string }[];
  return rows.map((r) => ({ label: r.period_label, type: r.period_type }));
}

export async function getKpiSnapshot(
  organizationId: string,
  options?: {
    periodLabel?: string;
    compare?: ComparisonMode;
    comparePeriodLabel?: string;
  },
): Promise<KpiSnapshot | null> {
  const supabase = await createClient();
  const mode: ComparisonMode = options?.compare ?? "previous";

  // 1. All live periods for the org; newest-created is the default "current".
  const { data: periods, error: pErr } = await supabase
    .from("kpi_periods")
    .select("id, period_label, period_type, period_start, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (pErr || !periods || periods.length === 0) return null;

  const periodRows = periods as PeriodRow[];
  const current = options?.periodLabel
    ? periodRows.find((p) => p.period_label === options.periodLabel)
    : periodRows[0];
  if (!current) return null;

  // 2. Resolve the comparator by relationship (pure resolver — no math here).
  const candidates: ComparablePeriod[] = periodRows.map((p) => ({
    id: p.id, label: p.period_label, type: p.period_type, start: p.period_start,
  }));
  const currentComparable = candidates.find((c) => c.id === current.id);
  if (!currentComparable) return null; // defensive; current came from this list
  const comparator = resolveComparator(
    currentComparable, mode, candidates, options?.comparePeriodLabel,
  );

  // 3. Definitions (active only — RLS: any authenticated user).
  const { data: defRows, error: dErr } = await supabase
    .from("kpi_definitions")
    .select("id, key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order");
  if (dErr || !defRows) return null;

  const definitions: KpiDefinition[] = (defRows as DefinitionRow[]).map((d) => ({
    id: d.id, key: d.key, label: d.label, unit: d.unit, category: d.category,
    idealMin: d.ideal_min, idealMax: d.ideal_max,
    higherIsBetter: d.higher_is_better, sortOrder: d.sort_order,
  }));

  // 4. Current + comparator values through the canonical view.
  const fetchValues = async (periodId: string): Promise<KpiReading[]> => {
    const { data } = await supabase
      .from("kpi_current_values")
      .select("kpi_definition_id, value, recorded_at")
      .eq("kpi_period_id", periodId)
      // Consolidated figures only: NULL segment = whole-organization
      // (migration 0009). Branch-level rows feed the future Segment tab.
      .is("segment", null);
    return ((data ?? []) as ValueRow[]).map((v) => ({
      definitionId: v.kpi_definition_id,
      value: Number(v.value),
      recordedAt: v.recorded_at,
    }));
  };

  const [currentValues, priorValues] = await Promise.all([
    fetchValues(current.id),
    comparator ? fetchValues(comparator.id) : Promise.resolve([]),
  ]);

  return {
    periodId: current.id,
    periodLabel: current.period_label,
    comparisonMode: mode,
    comparisonLabel: comparator?.label ?? null,
    kpis: evaluateKpis({ definitions, current: currentValues, prior: priorValues }),
  };
}
