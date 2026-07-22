import { describe, expect, it } from "vitest";
import { computeRatios, periodDaysBetween } from "./ratios";

// RPIL FY2025-26 actuals (restated GP basis) — known-good reference values.
const FY26 = {
  revenue: 1781249181.12,
  gross_profit: 300171344.67,
  net_profit: 58072839.11,
  trade_receivables: 236658128.45,
  trade_payables: 116095035.0,
  inventory: 123311128.0,
  secured_borrowings: 249642130.0,
  unsecured_borrowings: 93618265.0,
};

const byKey = (ratios: ReturnType<typeof computeRatios>) =>
  new Map(ratios.map((r) => [r.key, r.value]));

describe("periodDaysBetween", () => {
  it("full fiscal year = 365", () =>
    expect(periodDaysBetween("2025-04-01", "2026-03-31")).toBe(365));
  it("Q1 = 91", () =>
    expect(periodDaysBetween("2026-04-01", "2026-06-30")).toBe(91));
  it("null-safe", () => expect(periodDaysBetween(null, "2026-06-30")).toBeNull());
  it("reversed range → null", () =>
    expect(periodDaysBetween("2026-06-30", "2026-04-01")).toBeNull());
});

describe("computeRatios — FY26 reference values", () => {
  const r = byKey(computeRatios({ values: FY26, periodDays: 365 }));

  it("GP margin ≈ 16.85%", () => expect(r.get("gp_margin")).toBeCloseTo(16.85, 1));
  it("NP margin ≈ 3.26%", () => expect(r.get("np_margin")).toBeCloseTo(3.26, 1));
  it("DSO ≈ 48.5 days", () => expect(r.get("dso")).toBeCloseTo(48.5, 0));
  it("DIO ≈ 30.4 days", () => expect(r.get("dio")).toBeCloseTo(30.4, 0));
  it("DPO ≈ 28.6 days", () => expect(r.get("dpo")).toBeCloseTo(28.6, 0));
  it("CCC = DSO + DIO − DPO", () => {
    const ccc = r.get("ccc");
    expect(ccc).not.toBeNull();
    expect(ccc!).toBeCloseTo(r.get("dso")! + r.get("dio")! - r.get("dpo")!, 6);
  });
  it("borrowings/revenue ≈ 0.19x", () =>
    expect(r.get("borrowings_to_revenue")).toBeCloseTo(0.193, 2));
});

describe("computeRatios — honest nulls", () => {
  it("missing revenue → margins and DSO null", () => {
    const r = byKey(computeRatios({
      values: { gross_profit: 100, trade_receivables: 50 }, periodDays: 365,
    }));
    expect(r.get("gp_margin")).toBeNull();
    expect(r.get("dso")).toBeNull();
  });

  it("no period days → day ratios null, margins still compute", () => {
    const r = byKey(computeRatios({ values: FY26, periodDays: null }));
    expect(r.get("dso")).toBeNull();
    expect(r.get("ccc")).toBeNull();
    expect(r.get("gp_margin")).not.toBeNull();
  });

  it("quarter scales day ratios by 91, not 365", () => {
    const year = byKey(computeRatios({ values: FY26, periodDays: 365 }));
    const quarter = byKey(computeRatios({ values: FY26, periodDays: 91 }));
    expect(quarter.get("dso")!).toBeCloseTo((year.get("dso")! * 91) / 365, 6);
  });

  it("zero revenue never divides", () => {
    const r = byKey(computeRatios({
      values: { revenue: 0, gross_profit: 10 }, periodDays: 365,
    }));
    expect(r.get("gp_margin")).toBeNull();
  });
});
