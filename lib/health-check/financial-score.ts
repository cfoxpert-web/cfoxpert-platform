import { ENTERPRISE_VALUE_DRIVERS, type DriverKey } from "@/constants/drivers";
import { benchmarkPosition, type BenchmarkPosition } from "@/lib/kpi/engine";
import { computeRatios } from "@/lib/kpi/ratios";
import { gradeFromScore } from "./score-engine";
import type { HealthCheckResult } from "@/types";

/**
 * Amendment A2 — the CLIENT Business Health Score, computed from financial
 * evidence (pure; no React, no DB). Leads keep the questionnaire engine
 * (score-engine.ts); clients get this.
 *
 * Mechanics (approved 2026-07-13):
 *  - metric value vs its band (health_metric_bands, data) → bucket score:
 *    favorable side 90 / within band 75 / unfavorable breach 40
 *  - driver = weighted average of its scored metrics
 *  - Capital & Valuation is computed (same 75/25 rule as the lead engine),
 *    with the scale score from ACTUAL revenue, not a self-reported band
 *  - Governance & Technology are not in the numbers → "not_assessed";
 *    the overall score reweights across the drivers that ARE evidenced.
 *  - missing inputs are skipped, never fabricated.
 */

export type MetricBandRow = {
  driverKey: string;
  metricKey: string;
  label: string;
  unit: string; // '%', 'days', 'x'
  idealMin: number | null;
  idealMax: number | null;
  higherIsBetter: boolean;
  weight: number;
  sortOrder: number;
};

export type MetricScore = {
  metricKey: string;
  label: string;
  unit: string;
  value: number;
  idealMin: number | null;
  idealMax: number | null;
  higherIsBetter: boolean;
  position: BenchmarkPosition;
  score: number;
};

export type DriverSource = "financial" | "computed" | "not_assessed";

export type DriverResult = {
  key: DriverKey;
  label: string;
  weight: number;
  score: number | null;
  source: DriverSource;
  metrics: MetricScore[];
};

export type ClientHealthResult = {
  overallScore: number;
  grade: HealthCheckResult["grade"];
  drivers: DriverResult[];
};

/** Bucket score from band position (favorable 90 / within 75 / breach 40). */
export function bucketScore(
  position: BenchmarkPosition,
  higherIsBetter: boolean,
): number | null {
  if (position === "no_benchmark") return null;
  if (position === "within") return 75;
  const favorable = higherIsBetter ? position === "above" : position === "below";
  return favorable ? 90 : 40;
}

/** Scale score from actual annual-ish revenue (mirrors the lead engine's
 *  turnover bands; 1 Cr = 1e7). */
export function revenueScaleScore(revenueInr: number): number {
  const crore = revenueInr / 1_00_00_000;
  if (crore < 5) return 55;
  if (crore < 25) return 65;
  if (crore < 50) return 72;
  if (crore < 100) return 80;
  if (crore < 250) return 85;
  return 80;
}

/**
 * Derive the metric values the bands score against, from statement-line
 * primitives. Everything reuses the ratios module (single computation path);
 * missing inputs simply don't appear in the map.
 */
export function buildMetricValues(input: {
  /** statement-line values keyed by kpi_definitions.key */
  values: Partial<Record<string, number>>;
  /** revenue of the previous same-type period (growth basis); null = unknown */
  priorRevenue: number | null;
  periodDays: number | null;
  /** per-unit revenues for the period (for concentration); [] = no unit data */
  segmentRevenues: number[];
}): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  const v = input.values;

  for (const ratio of computeRatios({ values: v, periodDays: input.periodDays })) {
    if (ratio.value !== null) out[ratio.key] = ratio.value;
  }

  const revenue = v.revenue;
  if (revenue !== undefined && revenue !== 0) {
    out.revenue = revenue;
    if (v.indirect_expenses !== undefined) {
      out.indirect_expense_ratio = (v.indirect_expenses / revenue) * 100;
    }
    if (
      v.fixed_assets !== undefined &&
      v.fixed_assets !== 0 &&
      input.periodDays !== null &&
      input.periodDays > 0
    ) {
      out.asset_turnover = (revenue * 365) / input.periodDays / v.fixed_assets;
    }
    if (input.priorRevenue !== null && input.priorRevenue !== 0) {
      out.revenue_growth =
        ((revenue - input.priorRevenue) / Math.abs(input.priorRevenue)) * 100;
    }
  }

  if (input.segmentRevenues.length >= 2) {
    const total = input.segmentRevenues.reduce((sum, r) => sum + r, 0);
    if (total > 0) {
      out.segment_concentration =
        (Math.max(...input.segmentRevenues) / total) * 100;
    }
  }

  return out;
}

export function computeClientHealth(input: {
  metrics: Partial<Record<string, number>>;
  bands: MetricBandRow[];
}): ClientHealthResult | null {
  // Score every band whose metric value exists.
  const scoredByDriver = new Map<string, MetricScore[]>();
  for (const band of [...input.bands].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const value = input.metrics[band.metricKey];
    if (value === undefined) continue;
    const position = benchmarkPosition(value, band.idealMin, band.idealMax);
    const score = bucketScore(position, band.higherIsBetter);
    if (score === null) continue;
    const list = scoredByDriver.get(band.driverKey) ?? [];
    list.push({
      metricKey: band.metricKey,
      label: band.label,
      unit: band.unit,
      value,
      idealMin: band.idealMin,
      idealMax: band.idealMax,
      higherIsBetter: band.higherIsBetter,
      position,
      score,
    });
    scoredByDriver.set(band.driverKey, list);
  }

  // Driver scores (weighted average of scored metrics).
  const drivers: DriverResult[] = ENTERPRISE_VALUE_DRIVERS.map((driver) => {
    const metrics = scoredByDriver.get(driver.key) ?? [];
    if (driver.key === "capital" || metrics.length === 0) {
      return {
        key: driver.key,
        label: driver.label,
        weight: driver.defaultWeight,
        score: null,
        source: driver.key === "capital" ? "computed" : "not_assessed",
        metrics: [],
      };
    }
    const weighted = metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length;
    return {
      key: driver.key,
      label: driver.label,
      weight: driver.defaultWeight,
      score: Math.round(weighted),
      source: "financial" as DriverSource,
      metrics,
    };
  });

  // Capital & Valuation: 75% average of the evidenced drivers + 25% scale
  // score from actual revenue (lead-engine rule, real evidence).
  const evidenced = drivers.filter((d) => d.key !== "capital" && d.score !== null);
  const capital = drivers.find((d) => d.key === "capital");
  const revenue = input.metrics.revenue;
  if (capital && evidenced.length > 0 && revenue !== undefined) {
    const avgOthers =
      evidenced.reduce((sum, d) => sum + (d.score ?? 0), 0) / evidenced.length;
    capital.score = Math.round(avgOthers * 0.75 + revenueScaleScore(revenue) * 0.25);
  }

  // Overall: reweight across present drivers only (never score the absent).
  const present = drivers.filter((d) => d.score !== null);
  if (present.length === 0) return null;
  const totalWeight = present.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) return null;
  const overallScore = Math.round(
    present.reduce((sum, d) => sum + (d.score ?? 0) * d.weight, 0) / totalWeight,
  );

  return { overallScore, grade: gradeFromScore(overallScore), drivers };
}
