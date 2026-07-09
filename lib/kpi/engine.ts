/**
 * Milestone 10 — KPI Engine (pure computation core).
 *
 * THE single place KPI evaluation logic lives (frozen roadmap standing
 * rule #3): the Dashboard and the future Board Pack Generator both call
 * this; neither reimplements it. Pure functions, zero React, zero DB —
 * the score-engine.ts pattern.
 *
 * Definitions come from the kpi_definitions table (ADR-004): benchmark
 * bands and direction are DATA, so this module contains no per-KPI
 * special cases and never needs a deploy when a KPI is added.
 */

export type KpiDefinition = {
  id: string;
  key: string;
  label: string;
  unit: string;
  category: string;
  idealMin: number | null;
  idealMax: number | null;
  higherIsBetter: boolean;
  sortOrder: number;
};

export type KpiReading = {
  definitionId: string;
  value: number;
  recordedAt: string;
};

export type BenchmarkPosition = "below" | "within" | "above" | "no_benchmark";
export type KpiHealth = "good" | "attention" | "neutral";
export type TrendDirection = "up" | "down" | "flat";

export type EvaluatedKpi = {
  definition: KpiDefinition;
  value: number;
  recordedAt: string;
  benchmark: {
    position: BenchmarkPosition;
    idealMin: number | null;
    idealMax: number | null;
  };
  health: KpiHealth;
  trend: {
    direction: TrendDirection;
    delta: number;
    percentChange: number | null; // null when prior is 0 or absent
    improving: boolean | null;    // null when direction is flat or no prior
  } | null;                        // null when no prior reading exists
};

export function benchmarkPosition(
  value: number,
  idealMin: number | null,
  idealMax: number | null,
): BenchmarkPosition {
  if (idealMin === null && idealMax === null) return "no_benchmark";
  if (idealMin !== null && value < idealMin) return "below";
  if (idealMax !== null && value > idealMax) return "above";
  return "within";
}

/**
 * Direction-aware health. A KPI needs attention when it violates its
 * band in the direction that matters:
 *   higher_is_better  → below idealMin is the violation
 *   lower_is_better   → above idealMax is the violation
 * Being "outside" the band on the FAVORABLE side (e.g. EBITDA far above
 * min, cash cycle far below max) is good, not a warning.
 */
export function kpiHealth(
  position: BenchmarkPosition,
  higherIsBetter: boolean,
): KpiHealth {
  if (position === "no_benchmark") return "neutral";
  if (higherIsBetter && position === "below") return "attention";
  if (!higherIsBetter && position === "above") return "attention";
  return "good";
}

export function evaluateTrend(
  current: number,
  prior: number | null | undefined,
  higherIsBetter: boolean,
): EvaluatedKpi["trend"] {
  if (prior === null || prior === undefined) return null;

  const delta = current - prior;
  const direction: TrendDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const percentChange = prior !== 0 ? (delta / Math.abs(prior)) * 100 : null;
  const improving =
    direction === "flat" ? null : (direction === "up") === higherIsBetter;

  return { direction, delta, percentChange, improving };
}

/**
 * Evaluate one period's readings against definitions, with an optional
 * prior period for trends. Readings without a matching active
 * definition are skipped (a definition deactivated after values were
 * recorded should not crash historic evaluation). Output is sorted by
 * the definitions' sortOrder.
 */
export function evaluateKpis(input: {
  definitions: KpiDefinition[];
  current: KpiReading[];
  prior?: KpiReading[];
}): EvaluatedKpi[] {
  const defById = new Map(input.definitions.map((d) => [d.id, d]));
  const priorById = new Map((input.prior ?? []).map((r) => [r.definitionId, r]));

  const out: EvaluatedKpi[] = [];
  for (const reading of input.current) {
    const definition = defById.get(reading.definitionId);
    if (!definition) continue;

    const position = benchmarkPosition(
      reading.value,
      definition.idealMin,
      definition.idealMax,
    );

    out.push({
      definition,
      value: reading.value,
      recordedAt: reading.recordedAt,
      benchmark: {
        position,
        idealMin: definition.idealMin,
        idealMax: definition.idealMax,
      },
      health: kpiHealth(position, definition.higherIsBetter),
      trend: evaluateTrend(
        reading.value,
        priorById.get(reading.definitionId)?.value ?? null,
        definition.higherIsBetter,
      ),
    });
  }

  return out.sort((a, b) => a.definition.sortOrder - b.definition.sortOrder);
}
