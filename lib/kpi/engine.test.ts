import { describe, expect, it } from "vitest";
import {
  benchmarkPosition, kpiHealth, evaluateTrend, evaluateKpis,
  type KpiDefinition,
} from "./engine";

const def = (over: Partial<KpiDefinition>): KpiDefinition => ({
  id: "d1", key: "k", label: "K", unit: "%", category: "other",
  idealMin: null, idealMax: null, higherIsBetter: true, sortOrder: 100, ...over,
});

describe("benchmarkPosition", () => {
  it("no bounds → no_benchmark", () => expect(benchmarkPosition(50, null, null)).toBe("no_benchmark"));
  it("below min", () => expect(benchmarkPosition(10, 15, null)).toBe("below"));
  it("above max", () => expect(benchmarkPosition(50, null, 45)).toBe("above"));
  it("within band", () => expect(benchmarkPosition(30, 15, 45)).toBe("within"));
  it("boundary values are within (inclusive)", () => {
    expect(benchmarkPosition(15, 15, 45)).toBe("within");
    expect(benchmarkPosition(45, 15, 45)).toBe("within");
  });
});

describe("kpiHealth — direction-aware", () => {
  it("EBITDA below its min (higher better) → attention", () =>
    expect(kpiHealth("below", true)).toBe("attention"));
  it("EBITDA above band (higher better) → good, not a warning", () =>
    expect(kpiHealth("above", true)).toBe("good"));
  it("cash cycle above its max (lower better) → attention", () =>
    expect(kpiHealth("above", false)).toBe("attention"));
  it("cash cycle below band (lower better) → good", () =>
    expect(kpiHealth("below", false)).toBe("good"));
  it("no benchmark → neutral", () => expect(kpiHealth("no_benchmark", true)).toBe("neutral"));
});

describe("evaluateTrend", () => {
  it("no prior → null", () => expect(evaluateTrend(10, null, true)).toBeNull());
  it("up + higher-better → improving", () =>
    expect(evaluateTrend(20, 16, true)).toMatchObject({ direction: "up", delta: 4, percentChange: 25, improving: true }));
  it("up + lower-better → worsening (cash cycle grew)", () =>
    expect(evaluateTrend(40, 32, false)).toMatchObject({ direction: "up", improving: false }));
  it("down + lower-better → improving", () =>
    expect(evaluateTrend(30, 32, false)).toMatchObject({ direction: "down", improving: true }));
  it("flat → improving null", () =>
    expect(evaluateTrend(32, 32, false)).toMatchObject({ direction: "flat", improving: null }));
  it("prior of 0 → percentChange null, no div-by-zero", () =>
    expect(evaluateTrend(5, 0, true)).toMatchObject({ delta: 5, percentChange: null }));
  it("negative prior handled via abs (working capital -10 → 10 = +200%)", () =>
    expect(evaluateTrend(10, -10, true)).toMatchObject({ delta: 20, percentChange: 200, improving: true }));
});

describe("evaluateKpis", () => {
  const ebitda = def({ id: "e", key: "ebitda_margin", idealMin: 15, sortOrder: 20 });
  const cash = def({ id: "c", key: "cash_cycle_days", idealMax: 45, higherIsBetter: false, sortOrder: 30 });
  const revenue = def({ id: "r", key: "revenue", sortOrder: 10 });

  it("full evaluation: sorted, healths correct, trends attached", () => {
    const result = evaluateKpis({
      definitions: [ebitda, cash, revenue],
      current: [
        { definitionId: "c", value: 52, recordedAt: "2026-07-01" },
        { definitionId: "e", value: 18.6, recordedAt: "2026-07-01" },
        { definitionId: "r", value: 12_50_00_000, recordedAt: "2026-07-01" },
      ],
      prior: [
        { definitionId: "c", value: 45, recordedAt: "2026-06-01" },
        { definitionId: "e", value: 16.2, recordedAt: "2026-06-01" },
      ],
    });

    expect(result.map((k) => k.definition.key)).toEqual(["revenue", "ebitda_margin", "cash_cycle_days"]);
    expect(result[1]).toMatchObject({ health: "good", trend: { improving: true } });   // ebitda up
    expect(result[2]).toMatchObject({ health: "attention", trend: { improving: false } }); // cash cycle blew past 45
    expect(result[0]).toMatchObject({ health: "neutral", trend: null });               // revenue: no benchmark, no prior
  });

  it("reading with deactivated/unknown definition is skipped, not crashed", () => {
    const result = evaluateKpis({
      definitions: [revenue],
      current: [
        { definitionId: "r", value: 1, recordedAt: "x" },
        { definitionId: "ghost", value: 99, recordedAt: "x" },
      ],
    });
    expect(result).toHaveLength(1);
  });
});
