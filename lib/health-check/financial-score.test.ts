import { describe, expect, it } from "vitest";
import {
  bucketScore,
  buildMetricValues,
  computeClientHealth,
  revenueScaleScore,
  type MetricBandRow,
} from "./financial-score";

// Mirrors the migration 0011 seed exactly.
const BANDS: MetricBandRow[] = [
  { driverKey: "financial", metricKey: "gp_margin", label: "Gross Profit Margin", unit: "%", idealMin: 15, idealMax: null, higherIsBetter: true, weight: 1, sortOrder: 10 },
  { driverKey: "financial", metricKey: "np_margin", label: "Net Profit Margin", unit: "%", idealMin: 5, idealMax: null, higherIsBetter: true, weight: 1, sortOrder: 20 },
  { driverKey: "financial", metricKey: "ccc", label: "Cash Conversion Cycle", unit: "days", idealMin: null, idealMax: 60, higherIsBetter: false, weight: 1, sortOrder: 30 },
  { driverKey: "financial", metricKey: "borrowings_to_revenue", label: "Borrowings / Revenue", unit: "x", idealMin: null, idealMax: 0.3, higherIsBetter: false, weight: 1, sortOrder: 40 },
  { driverKey: "operational", metricKey: "indirect_expense_ratio", label: "Indirect / Revenue", unit: "%", idealMin: null, idealMax: 15, higherIsBetter: false, weight: 1, sortOrder: 50 },
  { driverKey: "operational", metricKey: "asset_turnover", label: "Asset Turnover", unit: "x", idealMin: 2, idealMax: null, higherIsBetter: true, weight: 1, sortOrder: 60 },
  { driverKey: "growth", metricKey: "revenue_growth", label: "Revenue Growth", unit: "%", idealMin: 10, idealMax: null, higherIsBetter: true, weight: 1, sortOrder: 70 },
  { driverKey: "growth", metricKey: "segment_concentration", label: "Largest Unit Share", unit: "%", idealMin: null, idealMax: 70, higherIsBetter: false, weight: 1, sortOrder: 80 },
];

// RPIL FY2025-26 actuals (restated GP basis).
const FY26_VALUES = {
  revenue: 1781249181.12,
  gross_profit: 300171344.67,
  net_profit: 58072839.11,
  indirect_expenses: 224000826.49,
  fixed_assets: 290265131.22,
  trade_receivables: 236658128.45,
  trade_payables: 116095035.0,
  inventory: 123311128.0,
  secured_borrowings: 249642130.0,
  unsecured_borrowings: 93618265.0,
};

const FY26_METRICS = buildMetricValues({
  values: FY26_VALUES,
  priorRevenue: 1454258007.02,
  periodDays: 365,
  segmentRevenues: [1392604527.86, 372700608.63, 15944044.63],
});

describe("bucketScore", () => {
  it("within band → 75", () => expect(bucketScore("within", true)).toBe(75));
  it("favorable side → 90", () => {
    expect(bucketScore("above", true)).toBe(90);
    expect(bucketScore("below", false)).toBe(90);
  });
  it("unfavorable breach → 40", () => {
    expect(bucketScore("below", true)).toBe(40);
    expect(bucketScore("above", false)).toBe(40);
  });
  it("no benchmark → null (skip, never fabricate)", () =>
    expect(bucketScore("no_benchmark", true)).toBeNull());
});

describe("revenueScaleScore (mirrors lead-engine turnover bands)", () => {
  it("RPIL ~178Cr → 85", () => expect(revenueScaleScore(1781249181.12)).toBe(85));
  it("tiny → 55, giant → 80", () => {
    expect(revenueScaleScore(2_00_00_000)).toBe(55);
    expect(revenueScaleScore(300 * 1_00_00_000)).toBe(80);
  });
});

describe("buildMetricValues — RPIL FY26", () => {
  it("derives ratio metrics", () => {
    expect(FY26_METRICS.gp_margin).toBeCloseTo(16.85, 1);
    expect(FY26_METRICS.np_margin).toBeCloseTo(3.26, 1);
    expect(FY26_METRICS.ccc).toBeCloseTo(50.2, 0);
    expect(FY26_METRICS.borrowings_to_revenue).toBeCloseTo(0.193, 2);
  });
  it("derives operational + growth metrics", () => {
    expect(FY26_METRICS.indirect_expense_ratio).toBeCloseTo(12.58, 1);
    expect(FY26_METRICS.asset_turnover).toBeCloseTo(6.14, 1);
    expect(FY26_METRICS.revenue_growth).toBeCloseTo(22.49, 1);
    expect(FY26_METRICS.segment_concentration).toBeCloseTo(78.18, 1);
  });
  it("skips concentration with fewer than two units", () => {
    const m = buildMetricValues({
      values: FY26_VALUES, priorRevenue: null, periodDays: 365, segmentRevenues: [1],
    });
    expect(m.segment_concentration).toBeUndefined();
    expect(m.revenue_growth).toBeUndefined();
  });
});

describe("computeClientHealth — RPIL FY26 end to end", () => {
  const result = computeClientHealth({ metrics: FY26_METRICS, bands: BANDS });
  const driver = (key: string) => result!.drivers.find((d) => d.key === key)!;

  it("computes (not null)", () => expect(result).not.toBeNull());

  it("driver scores: financial 66, operational 75, growth 58, capital 71", () => {
    expect(driver("financial").score).toBe(66);   // 75/40/75/75
    expect(driver("operational").score).toBe(75); // 75/75
    expect(driver("growth").score).toBe(58);      // 75/40 (concentration breach)
    expect(driver("capital").score).toBe(71);     // 0.75*avg(66,75,58) + 0.25*85
  });

  it("governance & technology are not_assessed with no score", () => {
    expect(driver("governance").score).toBeNull();
    expect(driver("governance").source).toBe("not_assessed");
    expect(driver("technology").score).toBeNull();
    expect(driver("technology").source).toBe("not_assessed");
  });

  it("overall reweights across evidenced drivers: 68 / grade B", () => {
    expect(result!.overallScore).toBe(68); // (66+75+58+71)*0.2 / 0.8 = 67.5 → 68
    expect(result!.grade).toBe("B");
  });

  it("flags the real diagnostic: unit concentration breach", () => {
    const concentration = driver("growth").metrics.find(
      (m) => m.metricKey === "segment_concentration",
    );
    expect(concentration?.position).toBe("above");
    expect(concentration?.score).toBe(40);
  });

  it("no metrics at all → null, never a default score", () =>
    expect(computeClientHealth({ metrics: {}, bands: BANDS })).toBeNull());
});
