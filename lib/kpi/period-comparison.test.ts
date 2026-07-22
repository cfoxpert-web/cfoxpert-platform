import { describe, expect, it } from "vitest";
import {
  shiftMonthsBack,
  resolveComparator,
  isComparisonMode,
  type ComparablePeriod,
} from "./period-comparison";

const p = (over: Partial<ComparablePeriod>): ComparablePeriod => ({
  id: "x", label: "L", type: "yearly", start: null, ...over,
});

describe("shiftMonthsBack", () => {
  it("yoy: −12 months keeps month/day, drops a year", () =>
    expect(shiftMonthsBack("2025-04-01", 12)).toBe("2024-04-01"));
  it("qoq: −3 months", () =>
    expect(shiftMonthsBack("2026-04-01", 3)).toBe("2026-01-01"));
  it("mom: −1 month", () =>
    expect(shiftMonthsBack("2026-06-01", 1)).toBe("2026-05-01"));
  it("mom across a year boundary", () =>
    expect(shiftMonthsBack("2026-01-01", 1)).toBe("2025-12-01"));
  it("qoq across a year boundary", () =>
    expect(shiftMonthsBack("2026-02-01", 3)).toBe("2025-11-01"));
});

describe("isComparisonMode", () => {
  it("accepts known modes", () => {
    expect(isComparisonMode("yoy")).toBe(true);
    expect(isComparisonMode("custom")).toBe(true);
  });
  it("rejects junk / undefined", () => {
    expect(isComparisonMode("wat")).toBe(false);
    expect(isComparisonMode(undefined)).toBe(false);
  });
});

describe("resolveComparator", () => {
  const fy25 = p({ id: "25", label: "FY25", type: "yearly", start: "2024-04-01" });
  const fy26 = p({ id: "26", label: "FY26", type: "yearly", start: "2025-04-01" });
  const jun25 = p({ id: "j25", label: "Jun 2025", type: "monthly", start: "2025-06-01" });
  const jun26 = p({ id: "j26", label: "Jun 2026", type: "monthly", start: "2026-06-01" });

  it("yoy: FY26 → FY25", () =>
    expect(resolveComparator(fy26, "yoy", [fy25, fy26])?.label).toBe("FY25"));

  it("yoy on a month: Jun 2026 → Jun 2025", () =>
    expect(resolveComparator(jun26, "yoy", [jun25, jun26])?.label).toBe("Jun 2025"));

  it("yoy with no matching prior year → null (no fabricated delta)", () =>
    expect(resolveComparator(fy25, "yoy", [fy25, fy26])).toBeNull());

  it("yoy does not cross period types", () =>
    // a monthly period 12 months before a yearly one must not match
    expect(resolveComparator(fy26, "yoy", [fy26, p({ id: "m", label: "Apr 2024", type: "monthly", start: "2024-04-01" })])).toBeNull());

  it("previous: FY26 → FY25 by start date", () =>
    expect(resolveComparator(fy26, "previous", [fy25, fy26])?.label).toBe("FY25"));

  it("previous: earliest period has no prior → null", () =>
    expect(resolveComparator(fy25, "previous", [fy25, fy26])).toBeNull());

  it("custom: picks the named period", () =>
    expect(resolveComparator(fy26, "custom", [fy25, fy26], "FY25")?.label).toBe("FY25"));

  it("custom: unknown label → null", () =>
    expect(resolveComparator(fy26, "custom", [fy25, fy26], "FY99")).toBeNull());

  it("never returns the current period itself", () =>
    expect(resolveComparator(fy26, "custom", [fy26], "FY26")).toBeNull());

  it("mom: Jun 2026 → May 2026", () => {
    const may26 = p({ id: "m26", label: "May 2026", type: "monthly", start: "2026-05-01" });
    expect(resolveComparator(jun26, "mom", [may26, jun26])?.label).toBe("May 2026");
  });
});
