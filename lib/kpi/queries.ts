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
  period_start: string | null; period_end: string | null; created_at: string;
};

export type KpiSnapshot = {
  periodId: string;
  periodLabel: string;
  periodType: string;
  periodStart: string | null;
  periodEnd: string | null;
  comparisonMode: ComparisonMode;
  comparisonLabel: string | null; // comparator period label, null when none applies
  comparisonStart: string | null;
  comparisonEnd: string | null;
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
    .select("id, period_label, period_type, period_start, period_end, created_at")
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

  // Comparator's full row (for its date range — ratio math needs both
  // period lengths, since e.g. a quarter's DSO scales by 91 days, a year's
  // by 365).
  const comparatorRow = comparator
    ? periodRows.find((p) => p.id === comparator.id) ?? null
    : null;

  return {
    periodId: current.id,
    periodLabel: current.period_label,
    periodType: current.period_type,
    periodStart: current.period_start,
    periodEnd: current.period_end,
    comparisonMode: mode,
    comparisonLabel: comparator?.label ?? null,
    comparisonStart: comparatorRow?.period_start ?? null,
    comparisonEnd: comparatorRow?.period_end ?? null,
    kpis: evaluateKpis({ definitions, current: currentValues, prior: priorValues }),
  };
}

// ----------------------------------------------------------------------------
// Amendment A3 — segment (unit/branch) and series reads. Same tenancy model:
// authenticated client, RLS via the period → org membership join.
// ----------------------------------------------------------------------------

export type SegmentValue = {
  segment: string;
  definitionKey: string;
  definitionLabel: string;
  sortOrder: number;
  value: number;
  note: string | null;
};

/** Unit-level values for one period (segment IS NOT NULL rows). */
export async function getSegmentValues(periodId: string): Promise<SegmentValue[]> {
  const supabase = await createClient();

  const [{ data: defRows }, { data: valueRows }] = await Promise.all([
    supabase.from("kpi_definitions").select("id, key, label, sort_order"),
    supabase
      .from("kpi_current_values")
      .select("kpi_definition_id, segment, value, note")
      .eq("kpi_period_id", periodId)
      .not("segment", "is", null),
  ]);

  const defs = new Map(
    ((defRows ?? []) as { id: string; key: string; label: string; sort_order: number }[])
      .map((d) => [d.id, d]),
  );

  const out: SegmentValue[] = [];
  for (const row of (valueRows ?? []) as {
    kpi_definition_id: string; segment: string | null; value: number; note: string | null;
  }[]) {
    const def = defs.get(row.kpi_definition_id);
    if (!def || row.segment === null) continue;
    out.push({
      segment: row.segment,
      definitionKey: def.key,
      definitionLabel: def.label,
      sortOrder: def.sort_order,
      value: Number(row.value),
      note: row.note,
    });
  }
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

export type SeriesPoint = {
  periodLabel: string;
  periodStart: string | null;
  segment: string | null; // null = consolidated
  value: number;
  note: string | null;
};

/** One definition's values across all monthly periods, oldest first. */
export async function getMonthlySeries(
  organizationId: string,
  definitionKey: string,
): Promise<SeriesPoint[]> {
  const supabase = await createClient();

  const [{ data: defRows }, { data: periodRows }] = await Promise.all([
    supabase.from("kpi_definitions").select("id").eq("key", definitionKey).limit(1),
    supabase
      .from("kpi_periods")
      .select("id, period_label, period_start")
      .eq("organization_id", organizationId)
      .eq("period_type", "monthly")
      .is("deleted_at", null)
      .order("period_start", { ascending: true }),
  ]);

  const defId = (defRows as { id: string }[] | null)?.[0]?.id;
  const periods = (periodRows ?? []) as {
    id: string; period_label: string; period_start: string | null;
  }[];
  if (!defId || periods.length === 0) return [];

  const { data: valueRows } = await supabase
    .from("kpi_current_values")
    .select("kpi_period_id, segment, value, note")
    .eq("kpi_definition_id", defId)
    .in("kpi_period_id", periods.map((p) => p.id));

  const byPeriod = new Map(periods.map((p) => [p.id, p]));
  const out: SeriesPoint[] = [];
  for (const row of (valueRows ?? []) as {
    kpi_period_id: string; segment: string | null; value: number; note: string | null;
  }[]) {
    const period = byPeriod.get(row.kpi_period_id);
    if (!period) continue;
    out.push({
      periodLabel: period.period_label,
      periodStart: period.period_start,
      segment: row.segment,
      value: Number(row.value),
      note: row.note,
    });
  }
  return out.sort((a, b) => ((a.periodStart ?? "") < (b.periodStart ?? "") ? -1 : 1));
}
