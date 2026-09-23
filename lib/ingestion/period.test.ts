import { describe, expect, it } from "vitest";
import { derivePeriod, findPeriodCollisions, fiscalYearLabel } from "./period";

describe("deriving a period from a column date", () => {
  it("reads 31 March as the financial year, not Q4", () => {
    const p = derivePeriod("2027-03-31");
    expect(p.type).toBe("yearly");
    expect(p.label).toBe("FY 2026-27");
    expect(p.start).toBe("2026-04-01");
    expect(p.end).toBe("2027-03-31");
  });

  it("produces the fixture's own period names", () => {
    expect(derivePeriod("2026-03-31").label).toBe("FY 2025-26");
    expect(derivePeriod("2027-03-31").label).toBe("FY 2026-27");
  });

  it("reads quarter ends as quarters of the right fiscal year", () => {
    const q1 = derivePeriod("2026-06-30");
    expect(q1.type).toBe("quarterly");
    expect(q1.label).toBe("Q1 FY 2026-27");
    expect(q1.start).toBe("2026-04-01");

    expect(derivePeriod("2026-09-30").label).toBe("Q2 FY 2026-27");
    // December falls in the SAME fiscal year that began the previous April.
    expect(derivePeriod("2026-12-31").label).toBe("Q3 FY 2026-27");
    expect(derivePeriod("2026-12-31").start).toBe("2026-10-01");
  });

  it("falls back to the month for anything else", () => {
    const m = derivePeriod("2026-05-31");
    expect(m.type).toBe("monthly");
    expect(m.label).toBe("May 2026");
    expect(m.start).toBe("2026-05-01");
  });

  it("says so when a date is not any period end", () => {
    const odd = derivePeriod("2026-05-17");
    expect(odd.type).toBe("monthly");
    expect(odd.derivedFrom).toMatch(/not a month, quarter or year end/);
  });

  it("never emits a label that contradicts its own range", () => {
    // The defect this replaces: a period labelled "Total · 31.03.2026" with
    // a range of 31/03/2026 to 31/03/2027. Label and range now come from
    // one date, so they cannot disagree.
    for (const date of [
      "2026-03-31", "2027-03-31", "2026-06-30",
      "2026-09-30", "2026-12-31", "2026-05-31", "2026-02-28",
    ]) {
      const p = derivePeriod(date);
      expect(p.end).toBe(date);
      expect(p.start < p.end).toBe(true);
      expect(p.key).toBe(date);
    }
  });

  it("carries no segment in the label", () => {
    // Segment has its own column. Leaking "Total" into a period name made
    // the unit part of the period's identity, which it is not.
    for (const date of ["2026-03-31", "2026-06-30", "2026-05-31"]) {
      expect(derivePeriod(date).label).not.toMatch(/Total|Dhaulana|·/);
    }
  });

  it("states what it derived and from what", () => {
    expect(derivePeriod("2027-03-31").derivedFrom).toBe(
      "column date 31.03.2027 — the financial year ending 31 Mar 2027",
    );
    expect(derivePeriod("2026-06-30").derivedFrom).toMatch(
      /column date 30\.06\.2026 — the quarter ending 30 Jun 2026/,
    );
  });

  it("handles a leap-year February as a month end", () => {
    expect(derivePeriod("2028-02-29").type).toBe("monthly");
    expect(derivePeriod("2028-02-29").derivedFrom).toMatch(/the month ending/);
  });

  it("labels fiscal years across a century boundary", () => {
    expect(fiscalYearLabel(2099)).toBe("FY 2099-00");
    expect(fiscalYearLabel(2009)).toBe("FY 2009-10");
  });
});

describe("the period-merge rail", () => {
  it("catches two staged periods pointing at one target", () => {
    // The blocker: FY 2025-26 and FY 2026-27 published into one period is
    // ~₹38,012 L of revenue for a company doing 20,200, in an insert-only
    // table where it can only be superseded, never removed.
    const collisions = findPeriodCollisions([
      { periodKey: "2026-03-31", targetPeriodId: "p1", label: "FY 2026-27" },
      { periodKey: "2027-03-31", targetPeriodId: "p1", label: "FY 2026-27" },
    ]);
    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.periodKeys).toEqual(["2026-03-31", "2027-03-31"]);
  });

  it("permits two SEGMENTS in one period — that is per-segment publishing", () => {
    // ADR-014 requires Dhaulana and Greater Noida to publish into the same
    // FY 2026-27 as separate segments. A rail keyed on (period, segment)
    // line-groups would block exactly what A7-e is being built to do.
    // Segment is a dimension WITHIN a period and never enters this check.
    const collisions = findPeriodCollisions([
      { periodKey: "2027-03-31", targetPeriodId: "p1", label: "FY 2026-27" },
      { periodKey: "2027-03-31", targetPeriodId: "p1", label: "FY 2026-27" },
    ]);
    expect(collisions).toEqual([]);
  });

  it("permits distinct periods in distinct targets", () => {
    expect(
      findPeriodCollisions([
        { periodKey: "2026-03-31", targetPeriodId: "p1", label: "FY 2025-26" },
        { periodKey: "2027-03-31", targetPeriodId: "p2", label: "FY 2026-27" },
      ]),
    ).toEqual([]);
  });

  it("reports every colliding target, not just the first", () => {
    const collisions = findPeriodCollisions([
      { periodKey: "2025-03-31", targetPeriodId: "a", label: "A" },
      { periodKey: "2026-03-31", targetPeriodId: "a", label: "A" },
      { periodKey: "2026-06-30", targetPeriodId: "b", label: "B" },
      { periodKey: "2026-09-30", targetPeriodId: "b", label: "B" },
    ]);
    expect(collisions).toHaveLength(2);
  });

  it("is quiet on an empty publish", () => {
    expect(findPeriodCollisions([])).toEqual([]);
  });
});
