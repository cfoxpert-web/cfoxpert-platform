import { describe, expect, it } from "vitest";
import { isTotalLabel, normalizeLabel, parseAmount } from "./normalize";
import {
  parseCsv,
  sheetToLines,
  sheetsToCsv,
  sheetsToLines,
  type ParsedSheet,
} from "./parse-spreadsheet";
import { gateFailures, runValidationGates } from "./validate";
import { applyMappingMemory, type MappingEntry } from "./mapping";
import type { CandidateLine } from "./types";

describe("normalizeLabel", () => {
  it("lowercases, collapses whitespace, strips trailing punctuation", () => {
    expect(normalizeLabel("  Trade   Receivables : ")).toBe("trade receivables");
    expect(normalizeLabel("Sales A/c —")).toBe("sales a/c");
  });
  it("is stable for already-normal labels", () =>
    expect(normalizeLabel("gross profit")).toBe("gross profit"));
});

describe("parseAmount", () => {
  it("Indian comma grouping", () =>
    expect(parseAmount("1,23,456.78")).toBe(123456.78));
  it("accounting parentheses are negative", () =>
    expect(parseAmount("(1,234.00)")).toBe(-1234));
  it("currency symbol stripped", () => expect(parseAmount("₹ 5,000")).toBe(5000));
  it("dash/blank/NA are null, not zero", () => {
    expect(parseAmount("-")).toBeNull();
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("N.A.")).toBeNull();
  });
  it("Dr/Cr suffixes only in TB context", () => {
    expect(parseAmount("1,200 Dr", { drCr: true })).toBe(1200);
    expect(parseAmount("1,200 Cr", { drCr: true })).toBe(-1200);
    // Outside TB context "Cr" means crore — refuse to guess a number.
    expect(parseAmount("1,200 Cr")).toBeNull();
  });
  it("numbers pass through; garbage is null", () => {
    expect(parseAmount(42.5)).toBe(42.5);
    expect(parseAmount("12 apples")).toBeNull();
  });
});

describe("isTotalLabel", () => {
  it("matches totals and grand totals", () => {
    expect(isTotalLabel("Total")).toBe(true);
    expect(isTotalLabel("Grand Total")).toBe(true);
    expect(isTotalLabel("Total Assets")).toBe(true);
    expect(isTotalLabel("Subtotal")).toBe(false);
  });
});

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, CRLF, empty rows", () => {
    const rows = parseCsv('a,"b,1","say ""hi"""\r\n\r\nc,2,');
    expect(rows).toEqual([
      ["a", "b,1", 'say "hi"'],
      ["c", "2", null],
    ]);
  });
});

describe("sheetToLines — trial balance layout", () => {
  const tb: ParsedSheet = {
    name: "TB",
    rows: [
      ["Trial Balance as on 31-Mar-2026", null, null],
      ["Particulars", "Debit", "Credit"],
      ["Cash-in-hand", 5000, null],
      ["Sales A/c", null, 20000],
      ["Purchases", 15000, null],
      ["Total", 20000, 20000],
    ],
  };

  it("computes signed amounts (debit − credit) with cell provenance", () => {
    const lines = sheetToLines(tb, "trial_balance");
    const byLabel = new Map(lines.map((l) => [l.sourceLabel, l]));
    expect(byLabel.get("Cash-in-hand")?.amount).toBe(5000);
    expect(byLabel.get("Sales A/c")?.amount).toBe(-20000);
    expect(byLabel.get("Purchases")?.amount).toBe(15000);
    expect(byLabel.get("Cash-in-hand")?.provenance).toBe("TB!B3");
    expect(byLabel.get("Cash-in-hand")?.confidence).toBe(1);
  });
});

describe("sheetToLines — simple label/amount layout", () => {
  const pnl: ParsedSheet = {
    name: "PL",
    rows: [
      ["Profit & Loss — FY26", null],
      ["Revenue from operations", "1,78,12,49,181.12"],
      ["Gross Profit", "30,01,71,344.67"],
      ["Notes", null],
    ],
  };

  it("pairs each label with its single amount", () => {
    const lines = sheetToLines(pnl, "pnl");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.amount).toBeCloseTo(1781249181.12);
    expect(lines[1]?.sourceLabel).toBe("Gross Profit");
  });

  it("skips comparative rows with two numeric columns (ambiguous)", () => {
    const comparative: ParsedSheet = {
      name: "S",
      rows: [["Revenue", 100, 90]],
    };
    expect(sheetToLines(comparative, "pnl")).toHaveLength(0);
  });
});

describe("sheetsToLines threshold + CSV serialization", () => {
  it("returns null under the minimum line count (falls to Claude rung)", () => {
    const sparse: ParsedSheet = { name: "S", rows: [["Only line", 1]] };
    expect(sheetsToLines([sparse], "other")).toBeNull();
  });
  it("serializes grids to CSV with quoting", () => {
    const csv = sheetsToCsv([
      { name: "S", rows: [["a,b", 1], [null, null]] },
    ]);
    expect(csv).toContain('# Sheet: S');
    expect(csv).toContain('"a,b",1');
  });
});

const line = (over: Partial<CandidateLine>): CandidateLine => ({
  statement: "trial_balance",
  sourceLabel: "x",
  amount: 0,
  periodLabel: null,
  segment: null,
  provenance: "t",
  proposedKpiKey: null,
  confidence: 1,
  ...over,
});

describe("validation gates", () => {
  it("balanced TB passes; unbalanced fails with the delta", () => {
    const balanced = runValidationGates({
      kind: "trial_balance",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ sourceLabel: "Cash", amount: 5000 }),
        line({ sourceLabel: "Sales", amount: -20000 }),
        line({ sourceLabel: "Purchases", amount: 15000 }),
      ],
    });
    expect(balanced.find((g) => g.gate === "tb_balance")?.status).toBe("pass");

    const unbalanced = runValidationGates({
      kind: "trial_balance",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ sourceLabel: "Cash", amount: 5000 }),
        line({ sourceLabel: "Sales", amount: -4000 }),
      ],
    });
    const tb = unbalanced.find((g) => g.gate === "tb_balance");
    expect(tb?.status).toBe("fail");
    expect(tb?.detail).toContain("≠");
  });

  it("stated total: pass when lines add up, fail when they don't", () => {
    const pass = runValidationGates({
      kind: "pnl",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ statement: "pnl", sourceLabel: "A", amount: 60 }),
        line({ statement: "pnl", sourceLabel: "B", amount: 40 }),
        line({ statement: "pnl", sourceLabel: "Total", amount: 100 }),
      ],
    });
    expect(pass.find((g) => g.gate === "stated_total")?.status).toBe("pass");

    const fail = runValidationGates({
      kind: "pnl",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ statement: "pnl", sourceLabel: "A", amount: 60 }),
        line({ statement: "pnl", sourceLabel: "Total", amount: 100 }),
      ],
    });
    expect(fail.find((g) => g.gate === "stated_total")?.status).toBe("fail");
  });

  it("BS equation checks stated side totals", () => {
    const results = runValidationGates({
      kind: "balance_sheet",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ statement: "balance_sheet", sourceLabel: "Total Assets", amount: 500 }),
        line({ statement: "balance_sheet", sourceLabel: "Total Equity and Liabilities", amount: 500 }),
      ],
    });
    // Two total lines → stated_total gate skips; bs_equation takes over.
    expect(results.find((g) => g.gate === "bs_equation")?.status).toBe("pass");
  });

  it("P&L consistency: GP > revenue fails; unmapped lines skip", () => {
    const fail = runValidationGates({
      kind: "pnl",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ statement: "pnl", sourceLabel: "Revenue", amount: 100, proposedKpiKey: "revenue" }),
        line({ statement: "pnl", sourceLabel: "GP", amount: 150, proposedKpiKey: "gross_profit" }),
      ],
    });
    expect(fail.find((g) => g.gate === "pnl_consistency")?.status).toBe("fail");

    const skipped = runValidationGates({
      kind: "pnl",
      periodStart: null,
      periodEnd: null,
      lines: [line({ statement: "pnl", sourceLabel: "Revenue", amount: 100 })],
    });
    expect(skipped.find((g) => g.gate === "pnl_consistency")?.status).toBe(
      "skipped",
    );
  });

  it("period gate: plausible passes, reversed fails, absent skips", () => {
    const ok = runValidationGates({
      kind: "other", periodStart: "2025-04-01", periodEnd: "2026-03-31", lines: [],
    });
    expect(ok.find((g) => g.gate === "period_dates")?.status).toBe("pass");

    const reversed = runValidationGates({
      kind: "other", periodStart: "2026-03-31", periodEnd: "2025-04-01", lines: [],
    });
    expect(reversed.find((g) => g.gate === "period_dates")?.status).toBe("fail");

    const absent = runValidationGates({
      kind: "other", periodStart: null, periodEnd: null, lines: [],
    });
    expect(absent.find((g) => g.gate === "period_dates")?.status).toBe("skipped");
  });

  it("mapping memory overrides model proposals at confidence 1", () => {
    const mappings = new Map<string, MappingEntry>([
      ["trade receivables", { kpiKey: "trade_receivables", segment: null }],
    ]);
    const { lines, fromMemory } = applyMappingMemory(
      [
        line({
          sourceLabel: "  Trade   Receivables : ",
          proposedKpiKey: "cash_bank", // model's (wrong) guess
          confidence: 0.6,
        }),
        line({ sourceLabel: "Unknown Ledger", proposedKpiKey: null }),
      ],
      mappings,
    );
    expect(fromMemory).toBe(1);
    expect(lines[0]?.proposedKpiKey).toBe("trade_receivables");
    expect(lines[0]?.confidence).toBe(1);
    expect(lines[1]?.proposedKpiKey).toBeNull();
  });

  it("gateFailures filters to fails only", () => {
    const results = runValidationGates({
      kind: "trial_balance",
      periodStart: null,
      periodEnd: null,
      lines: [
        line({ sourceLabel: "Cash", amount: 5000 }),
        line({ sourceLabel: "Sales", amount: -4000 }),
      ],
    });
    expect(gateFailures(results).every((g) => g.status === "fail")).toBe(true);
    expect(gateFailures(results).length).toBeGreaterThan(0);
  });
});
