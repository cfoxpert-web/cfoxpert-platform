import { createClient } from "../supabase/server";
import {
  evaluateKpis,
  type EvaluatedKpi,
  type KpiDefinition,
  type KpiReading,
} from "./engine";

/**
 * Milestone 10 — KPI data access. Server-side only.
 *
 * Reads through the AUTHENTICATED client: RLS (period → org membership)
 * is the tenancy boundary, so this layer never filters by trust — a
 * caller without membership simply gets empty data.
 *
 * Reads kpi_current_values (the canonical latest-value view) — never
 * kpi_values directly, per the migration-0004 rule.
 */

type DefinitionRow = {
  id: string; key: string; label: string; unit: string; category: string;
  ideal_min: number | null; ideal_max: number | null;
  higher_is_better: boolean; sort_order: number;
};

type ValueRow = { kpi_definition_id: string; value: number; recorded_at: string };

export type KpiSnapshot = {
  periodId: string;
  periodLabel: string;
  priorPeriodLabel: string | null;
  kpis: EvaluatedKpi[];
};

export async function getKpiSnapshot(
  organizationId: string,
  periodLabel?: string,
): Promise<KpiSnapshot | null> {
  const supabase = await createClient();

  // 1. Resolve the target period (latest finalized-or-draft if unspecified)
  //    and the one immediately before it, in one ordered query.
  let periodsQuery = supabase
    .from("kpi_periods")
    .select("id, period_label, created_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(2);

  if (periodLabel) {
    // Explicit label: fetch it plus everything older, take the top two.
    periodsQuery = supabase
      .from("kpi_periods")
      .select("id, period_label, created_at")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
  }

  const { data: periods, error: pErr } = await periodsQuery;
  if (pErr || !periods || periods.length === 0) return null;

  let currentIdx = 0;
  if (periodLabel) {
    currentIdx = periods.findIndex((p) => p.period_label === periodLabel);
    if (currentIdx === -1) return null;
  }
  const current = periods[currentIdx];
  if (!current) return null; // defensive: index verified above, but the
  // repo's noUncheckedIndexedAccess is right to demand the guard.
  const prior = periods[currentIdx + 1] ?? null;

  // 2. Definitions (active only — RLS: any authenticated user).
  const { data: defRows, error: dErr } = await supabase
    .from("kpi_definitions")
    .select("id, key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order");
  if (dErr || !defRows) return null;

  const definitions: KpiDefinition[] = (defRows as DefinitionRow[]).map((d) => ({
    id: d.id, key: d.key, label: d.label, unit: d.unit, category: d.category,
    idealMin: d.ideal_min, idealMax: d.ideal_max,
    higherIsBetter: d.higher_is_better, sortOrder: d.sort_order,
  }));

  // 3. Current + prior values through the canonical view.
  const fetchValues = async (periodId: string): Promise<KpiReading[]> => {
    const { data } = await supabase
      .from("kpi_current_values")
      .select("kpi_definition_id, value, recorded_at")
      .eq("kpi_period_id", periodId);
    return ((data ?? []) as ValueRow[]).map((v) => ({
      definitionId: v.kpi_definition_id,
      value: Number(v.value),
      recordedAt: v.recorded_at,
    }));
  };

  const [currentValues, priorValues] = await Promise.all([
    fetchValues(current.id),
    prior ? fetchValues(prior.id) : Promise.resolve([]),
  ]);

  return {
    periodId: current.id,
    periodLabel: current.period_label,
    priorPeriodLabel: prior?.period_label ?? null,
    kpis: evaluateKpis({ definitions, current: currentValues, prior: priorValues }),
  };
}
