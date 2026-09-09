import { describe, expect, it } from "vitest";
import {
  reconcileRollup,
  rollUpToKpis,
  UNCLASSIFIED_KPI_KEY,
  type HeadKpiMap,
  type StatementLineInput,
} from "./rollup";

const V1: HeadKpiMap = {
  version: 1,
  entries: {
    revenue: "revenue",
    cogs: "cost_of_goods_sold",
    directExp: "direct_expenses",
    adminExp: "indirect_expenses",
    employee: "employee_cost",
    interest: "finance_cost",
    depreciation: "depreciation",
    otherIncome: "other_income",
  },
};

const line = (over: Partial<StatementLineInput>): StatementLineInput => ({
  id: "l1",
  segment: null,
  sourceLabel: "x",
  head: "adminExp",
  headStatus: "classified",
  amount: 100,
  ...over,
});

describe("many lines to one KPI is the normal case", () => {
  it("sums every line sharing a head and names its sources", () => {
    // The old KPI-level publish REFUSED this: a second line mapping to the
    // same KPI would silently supersede the first. At line level it is the
    // ordinary shape of a P&L — 23 admin lines, one Indirect Expenses total.
    const lines = [
      line({ id: "a", head: "adminExp", amount: 10 }),
      line({ id: "b", head: "adminExp", amount: 20 }),
      line({ id: "c", head: "adminExp", amount: 30.5 }),
    ];
    const { values } = rollUpToKpis(lines, V1);
    expect(values).toHaveLength(1);
    expect(values[0]?.kpiKey).toBe("indirect_expenses");
    expect(values[0]?.value).toBe(60.5);
    expect(values[0]?.sourceLineIds).toEqual(["a", "b", "c"]);
    expect(values[0]?.headMapVersion).toBe(1);
  });

  it("keeps segments apart", () => {
    const { values } = rollUpToKpis(
      [
        line({ id: "a", segment: "Dhaulana", amount: 10 }),
        line({ id: "b", segment: "Greater Noida", amount: 25 }),
        line({ id: "c", segment: null, amount: 35 }),
      ],
      V1,
    );
    expect(values.map((v) => [v.segment, v.value])).toEqual([
      [null, 35],
      ["Dhaulana", 10],
      ["Greater Noida", 25],
    ]);
  });
});

describe("unclassified lines are skipped LOUDLY, never silently", () => {
  const lines = [
    line({ id: "a", head: "revenue", amount: 1000 }),
    line({ id: "b", head: null, headStatus: "unclassified", sourceLabel: "Donation", amount: 4 }),
    line({ id: "c", head: null, headStatus: "unclassified", sourceLabel: "Bad debt", amount: 19.16 }),
  ];

  it("reports the total, the count and the labels", () => {
    // Every unclassified line is an EXPENSE. Dropping them quietly
    // understates cost, overstates profit, and moves every margin and ratio
    // in the flattering direction — the worst failure this system can have.
    const { unclassified } = rollUpToKpis(lines, V1);
    expect(unclassified.total).toBe(23.16);
    expect(unclassified.lineCount).toBe(2);
    expect(unclassified.labels).toEqual(["Donation", "Bad debt"]);
  });

  it("emits the figure as a KPI so it reaches the report", () => {
    const { values } = rollUpToKpis(lines, V1);
    const flag = values.find((v) => v.kpiKey === UNCLASSIFIED_KPI_KEY);
    expect(flag).toBeDefined();
    expect(flag?.value).toBe(23.16);
  });

  it("breaks the figure down per segment", () => {
    const { unclassified } = rollUpToKpis(
      [
        line({ id: "a", head: null, headStatus: "unclassified", segment: "Dhaulana", amount: 5 }),
        line({ id: "b", head: null, headStatus: "unclassified", segment: "Greater Noida", amount: 7 }),
      ],
      V1,
    );
    expect(unclassified.bySegment).toEqual([
      { segment: "Dhaulana", total: 5, lineCount: 1 },
      { segment: "Greater Noida", total: 7, lineCount: 1 },
    ]);
  });

  it("distinguishes 'not yet classified' from 'deliberately no head'", () => {
    // Both roll up to nothing, but only one is an open question. If they
    // looked alike, nobody could tell an untouched line from a decision.
    const { unclassified, values } = rollUpToKpis(
      [
        line({ id: "a", head: "revenue", amount: 100 }),
        line({ id: "b", head: null, headStatus: "not_applicable", amount: 50 }),
      ],
      V1,
    );
    expect(unclassified.total).toBe(0);
    expect(unclassified.lineCount).toBe(0);
    expect(values.find((v) => v.kpiKey === UNCLASSIFIED_KPI_KEY)).toBeUndefined();
  });

  it("treats a head with no mapping as unclassified rather than dropping it", () => {
    const { unclassified } = rollUpToKpis(
      [line({ id: "a", head: "somethingNew", amount: 42 })],
      V1,
    );
    expect(unclassified.total).toBe(42);
    expect(unclassified.lineCount).toBe(1);
  });
});

describe("the reconciliation invariant", () => {
  const lines = [
    line({ id: "a", head: "revenue", amount: 1000 }),
    line({ id: "b", head: "adminExp", amount: 300 }),
    line({ id: "c", head: "adminExp", amount: 200 }),
  ];

  it("passes when published values reproduce from their lines", () => {
    const published = rollUpToKpis(lines, V1).values.map((v) => ({
      kpiKey: v.kpiKey,
      segment: v.segment,
      value: v.value,
    }));
    expect(reconcileRollup({ lines, map: V1, published })).toEqual({ ok: true });
  });

  it("catches a published value that no line supports", () => {
    const result = reconcileRollup({
      lines,
      map: V1,
      published: [
        { kpiKey: "revenue", segment: null, value: 1000 },
        { kpiKey: "indirect_expenses", segment: null, value: 500 },
        { kpiKey: "finance_cost", segment: null, value: 75 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.differences.join(" ")).toMatch(/finance_cost.*no line rolls up/);
    }
  });

  it("catches a value that drifted from its lines", () => {
    const result = reconcileRollup({
      lines,
      map: V1,
      published: [
        { kpiKey: "revenue", segment: null, value: 1000 },
        { kpiKey: "indirect_expenses", segment: null, value: 499 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.differences.join(" ")).toMatch(/published 499, lines give 500/);
    }
  });

  it("recomputes under the version a period was PUBLISHED with, not the latest", () => {
    // The hole this closes: head_kpi_map is data, and data changes. Remap a
    // head and every historical period recomputed under the NEW map
    // disagrees with rows that are insert-only and will not move. The test
    // would go red on correct history, and the pressure would be to weaken
    // it — which is how a real reconciliation failure gets waved through.
    const published = rollUpToKpis(lines, V1).values.map((v) => ({
      kpiKey: v.kpiKey,
      segment: v.segment,
      value: v.value,
    }));

    const V2: HeadKpiMap = {
      version: 2,
      entries: { ...V1.entries, adminExp: "other_expenses" },
    };

    // Under the CURRENT map this period looks broken...
    expect(reconcileRollup({ lines, map: V2, published }).ok).toBe(false);
    // ...and under the map it was actually published with, it is correct.
    expect(reconcileRollup({ lines, map: V1, published }).ok).toBe(true);
  });
});

describe("degenerate inputs never throw", () => {
  it("handles no lines at all", () => {
    const result = rollUpToKpis([], V1);
    expect(result.values).toEqual([]);
    expect(result.unclassified.total).toBe(0);
  });

  it("handles all-zero amounts, returning zeroes rather than nothing", () => {
    const { values } = rollUpToKpis(
      [
        line({ id: "a", head: "revenue", amount: 0 }),
        line({ id: "b", head: "adminExp", amount: 0 }),
      ],
      V1,
    );
    expect(values.map((v) => v.value)).toEqual([0, 0]);
  });

  it("coerces a non-finite amount to zero instead of poisoning the total", () => {
    const { values } = rollUpToKpis(
      [
        line({ id: "a", head: "revenue", amount: Number.NaN }),
        line({ id: "b", head: "revenue", amount: 10 }),
      ],
      V1,
    );
    expect(values[0]?.value).toBe(10);
    expect(Number.isNaN(values[0]?.value ?? 0)).toBe(false);
  });

  it("handles an empty map without inventing values", () => {
    const { values, unclassified } = rollUpToKpis(
      [line({ id: "a", head: "revenue", amount: 5 })],
      { version: 1, entries: {} },
    );
    expect(values.filter((v) => v.kpiKey !== UNCLASSIFIED_KPI_KEY)).toEqual([]);
    expect(unclassified.total).toBe(5);
  });

  it("keeps negative amounts, which are real (Gratuity reversal, contras)", () => {
    const { values } = rollUpToKpis(
      [
        line({ id: "a", head: "employee", amount: -8.64 }),
        line({ id: "b", head: "employee", amount: 100 }),
      ],
      V1,
    );
    expect(values[0]?.value).toBe(91.36);
  });
});
