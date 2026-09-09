import { describe, expect, it } from "vitest";
import type { Cell, ParsedSheet } from "./parse-spreadsheet";
import {
  describeSheet,
  detectUnit,
  extractScopedRows,
  formatHeaderDate,
  parseHeaderDate,
} from "./workbook";

/**
 * A miniature T-format sheet with the traits that broke the old parser:
 * two label columns, two header tiers, three units × two dates, a
 * hand-typed year on the credit side that disagrees with the debit side,
 * a section heading carrying a roll-up, a ratio row and a footnote.
 */
function tFormatSheet(): ParsedSheet {
  const rows: Cell[][] = [];
  const put = (r: number, cells: Record<number, Cell>) => {
    const row: Cell[] = [];
    for (const [c, v] of Object.entries(cells)) row[Number(c)] = v;
    rows[r] = row;
  };
  put(0, { 0: "ACME MANUFACTURING LIMITED" });
  // tier 1 — unit; tier 2 — date. Credit side's 2026 is typed "026".
  put(2, { 0: "PARTICULARS", 1: "Plant A", 2: "Plant A", 3: "Total", 4: "Total", 6: "Particulars", 7: "Plant A", 8: "Plant A", 9: "Total", 10: "Total" });
  put(3, { 0: "PARTICULARS", 1: "31.03.2026", 2: "31.03.2027", 3: "31.03.2026", 4: "31.03.2027", 6: "Particulars", 7: "31.03.026", 8: "31.03.2027", 9: "31.03.026", 10: "31.03.2027" });
  put(4, { 0: "TO OPENING STOCK", 1: 10, 2: 20, 3: 100, 4: 200, 6: "BY SALES ACCOUNT" });
  put(5, { 0: "TO PURCHASE A/C", 1: 50, 2: 60, 3: 500, 4: 600, 6: "Sales", 7: 90, 8: 95, 9: 900, 10: 950 });
  put(6, { 0: "TO DIRECT EXPENSES", 6: "By CLOSING STOCK", 7: 20, 8: 25, 9: 200, 10: 250 });
  put(7, { 0: "% Total Direct Exp", 1: 7, 2: 8, 3: 70, 4: 80, 6: "Closing Stock (% of Sale)", 9: 22.2, 10: 26.3 });
  put(8, { 0: "Freight Inward", 1: 3, 2: 4, 3: 30, 4: 40 });
  put(9, { 0: "Electricity  Exp.", 1: 4, 2: 4, 3: 40, 4: 40 });
  put(10, { 0: "TO GROSS PROFIT C/F", 3: 330, 4: 330 });
  put(11, { 0: "TOTAL", 3: 1000, 4: 1100, 6: "TOTAL", 9: 1000, 10: 1100 });
  put(12, { 0: "TO INDIRECT EXPS", 3: 55, 4: 60, 6: "BY INDIRECT INCOME" });
  put(13, { 0: "Director remuneration", 3: 25, 4: 25, 6: "Interest on FDR", 9: 5, 10: 6 });
  put(14, { 0: "Salary Exp.", 3: 30, 4: 35 });
  put(15, { 0: "1.The unbold figures represent the actual figures for the year" });
  return { name: "26-27 Projection", rows };
}

describe("header date parsing", () => {
  it("parses day-first Indian dates", () => {
    expect(parseHeaderDate("31.03.2027")).toBe("2027-03-31");
    expect(parseHeaderDate("30/06/2026")).toBe("2026-06-30");
    expect(parseHeaderDate("01-04-2025")).toBe("2025-04-01");
  });

  it("repairs a hand-typed short year", () => {
    // Real header from the client workbook: a dropped digit for 2026.
    expect(parseHeaderDate("31.03.026")).toBe("2026-03-31");
    expect(parseHeaderDate("31.03.26")).toBe("2026-03-31");
  });

  it("renders Excel serials as dates", () => {
    expect(parseHeaderDate(46112)).toBe("2026-03-31");
  });

  it("rejects non-dates rather than guessing", () => {
    expect(parseHeaderDate("Total")).toBeNull();
    expect(parseHeaderDate(null)).toBeNull();
    expect(parseHeaderDate("")).toBeNull();
    expect(parseHeaderDate(1719000000)).toBeNull(); // an amount, not a serial
    expect(parseHeaderDate("31.13.2026")).toBeNull(); // month 13
    expect(parseHeaderDate("32.03.2026")).toBeNull(); // day 32
  });

  it("round-trips through the printed Indian format", () => {
    expect(formatHeaderDate("2027-03-31")).toBe("31.03.2027");
  });
});

describe("unit detection", () => {
  const withTitle = (title: string): ParsedSheet => ({
    name: "S",
    rows: [[title]],
  });

  it("defaults to rupees and says so", () => {
    const u = detectUnit(withTitle("PROJECTED PROFIT & LOSS FY 2026-27"));
    expect(u.basis).toBe("rupees");
    expect(u.multiplierToRupees).toBe(1);
    expect(u.detectedFrom).toMatch(/assumed rupees/);
  });

  it("detects lakhs and crores from the title", () => {
    expect(detectUnit(withTitle("Balance Sheet (₹ in lakhs)")).multiplierToRupees).toBe(100_000);
    expect(detectUnit(withTitle("Profit & Loss in Rs. Crores")).multiplierToRupees).toBe(10_000_000);
    expect(detectUnit(withTitle("Trial Balance in '000")).multiplierToRupees).toBe(1_000);
  });
});

describe("T-format scope model", () => {
  const scope = describeSheet(tFormatSheet());

  it("finds both label columns and both header tiers", () => {
    expect(scope).not.toBeNull();
    expect(scope?.twoSided).toBe(true);
    expect(scope?.blocks.map((b) => b.labelColumnIndex)).toEqual([0, 6]);
    expect(scope?.headerRows).toEqual([2, 3]);
  });

  it("reads each block's side from the TO/BY prefixes its own rows carry", () => {
    expect(scope?.blocks[0]?.side).toBe("debit");
    expect(scope?.blocks[1]?.side).toBe("credit");
  });

  it("composes multi-tier labels and canonicalises disagreeing dates", () => {
    // Debit header says 31.03.2026, credit says 31.03.026 — both must
    // resolve to the same period, and both must LABEL as 31.03.2026.
    const debitTotal = scope?.blocks[0]?.periodColumns.find(
      (p) => p.segment === "Total" && p.canonicalDate === "2026-03-31",
    );
    const creditTotal = scope?.blocks[1]?.periodColumns.find(
      (p) => p.segment === "Total" && p.canonicalDate === "2026-03-31",
    );
    expect(debitTotal?.label).toBe("Total · 31.03.2026");
    expect(creditTotal?.label).toBe("Total · 31.03.2026");
    expect(creditTotal?.printedDate).toBe("31.03.026");
  });
});

describe("scoped extraction", () => {
  const sheet = tFormatSheet();
  const scope = describeSheet(sheet)!;
  const extraction = extractScopedRows(sheet, scope, [
    { segment: "Total", canonicalDate: "2026-03-31" },
    { segment: "Total", canonicalDate: "2027-03-31" },
  ]);
  const staged = extraction.rows.filter((r) => r.kind === "line");
  const labels = staged.map((r) => r.sourceLabel);

  it("stages only real financial lines from both sides", () => {
    expect(labels).toEqual([
      "OPENING STOCK",
      "PURCHASE",
      "Freight Inward",
      "Electricity Exp.",
      "Director remuneration",
      "Salary Exp.",
      "Sales",
      "CLOSING STOCK",
      "Interest on FDR",
    ]);
  });

  it("excludes totals, subtotals, ratios, derived lines and footnotes with a reason", () => {
    const excluded = extraction.rows.filter((r) => r.kind !== "line");
    const byLabel = new Map(excluded.map((r) => [r.rawLabel, r.kind]));
    expect(byLabel.get("TOTAL")).toBe("total");
    expect(byLabel.get("% Total Direct Exp")).toBe("subtotal");
    expect(byLabel.get("TO GROSS PROFIT C/F")).toBe("derived");
    expect(byLabel.get("Closing Stock (% of Sale)")).toBe("ratio");
    expect(
      byLabel.get("1.The unbold figures represent the actual figures for the year"),
    ).toBe("note");
    // Nothing is dropped without an explanation.
    for (const row of excluded) expect(row.reason.length).toBeGreaterThan(0);
  });

  it("attributes each line to the section heading above it, within its block", () => {
    const section = (label: string) =>
      staged.find((r) => r.sourceLabel === label)?.section;
    expect(section("OPENING STOCK")).toBeNull(); // before any heading
    expect(section("Freight Inward")).toBe("DIRECT EXPENSES");
    expect(section("Director remuneration")).toBe("INDIRECT EXPS");
    expect(section("Sales")).toBe("SALES");
    expect(section("Interest on FDR")).toBe("INDIRECT INCOME");
  });

  it("resolves the Total columns, not the leftmost plant's", () => {
    const sales = staged.find((r) => r.sourceLabel === "Sales");
    expect(sales?.amounts).toEqual([900, 950]); // Plant A is 90/95
  });

  it("converts to rupees at a single boundary", () => {
    const lakhSheet: ParsedSheet = {
      ...sheet,
      rows: sheet.rows.map((r, i) =>
        i === 0 ? ["ACME MANUFACTURING LIMITED (₹ in lakhs)"] : r,
      ),
    };
    const lakhScope = describeSheet(lakhSheet)!;
    expect(lakhScope.unit.multiplierToRupees).toBe(100_000);
    const converted = extractScopedRows(lakhSheet, lakhScope, [
      { segment: "Total", canonicalDate: "2026-03-31" },
    ]);
    const sales = converted.rows.find((r) => r.sourceLabel === "Sales");
    expect(sales?.amounts).toEqual([900 * 100_000]);
  });

  it("carries cell-level provenance per period", () => {
    const sales = staged.find((r) => r.sourceLabel === "Sales");
    expect(sales?.provenance).toEqual([
      "26-27 Projection!J6",
      "26-27 Projection!K6",
    ]);
  });

  it("returns an empty extraction rather than throwing on an unscoped sheet", () => {
    const blank: ParsedSheet = { name: "Empty", rows: [[], []] };
    expect(describeSheet(blank)).toBeNull();
  });
});
