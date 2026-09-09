import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import fixture from "./__fixtures__/rpil-projection-fixture.v2.json";
import { classifyHead, applySignConvention, type ProjectionHead } from "./head-classify";
import { isStageable } from "./row-class";
import { extractUnderScope } from "./scoped-extract";
import { readWorkbook } from "./spreadsheet-file";
import { describeSheet, extractScopedRows, type ScopeChoice } from "./workbook";

/**
 * A4-d golden test — the real client workbook end to end.
 *
 * THE WORKBOOK IS NOT COMMITTED. It is a client's full working ledger,
 * 33 sheets of internal papers, and it does not belong in version control
 * even though the derived figures already do (migration 0010, the /r/rpil
 * artefact). So this suite reads it from disk and SKIPS when it is absent:
 * CI runs the synthetic-grid suites in workbook.test.ts and
 * row-class.test.ts, which cover the same rules on fixture data.
 *
 * Point RPIL_WORKBOOK at the file to run it locally.
 *
 * The committed v2 fixture is the expected output. It is a REGRESSION
 * record, never classifier logic — nothing in lib/ingestion reads it, and
 * a label that classified only because it appeared here would mean the
 * test had stopped testing anything.
 */

const DEFAULT_PATH = path.join(
  os.homedir(),
  "Downloads",
  "Projected Profit & loss FY 2026-27 (1) (1).xlsx",
);
const WORKBOOK_PATH = process.env.RPIL_WORKBOOK ?? DEFAULT_PATH;
const available = fs.existsSync(WORKBOOK_PATH);

/** Reconciliation figures read in lakhs; amounts are stored in rupees. */
const LAKH = 100_000;
const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;

describe.skipIf(!available)("RPIL golden extraction", async () => {
  const { sheets, warnings } = await readWorkbook(
    fs.readFileSync(WORKBOOK_PATH),
  );
  const sheet = sheets.find((s) => s.name === "26-27 Projection");
  if (!sheet) throw new Error("Scope sheet '26-27 Projection' not found.");
  const scope = describeSheet(sheet);
  if (!scope) throw new Error("Sheet offered no dated period columns.");

  const extraction = extractScopedRows(sheet, scope, [
    { segment: "Total", canonicalDate: "2026-03-31" },
    { segment: "Total", canonicalDate: "2027-03-31" },
  ]);

  const staged = extraction.rows
    .filter((r) => isStageable(r.kind) && r.amounts.some((a) => a !== null))
    .map((r) => {
      const head = classifyHead({
        label: r.sourceLabel,
        section: r.section,
        side: r.side,
      });
      return {
        ...r,
        head: head.head,
        amounts: r.amounts.map((a) =>
          a === null
            ? null
            : applySignConvention({
                amount: a,
                head: head.head,
                side: r.side,
                label: r.sourceLabel,
              }).amount,
        ),
      };
    });

  const sum = (head: ProjectionHead, p: number) =>
    staged
      .filter((s) => s.head === head)
      .reduce((acc, s) => acc + (s.amounts[p] ?? 0) / LAKH, 0);
  const unclassified = (p: number) =>
    staged
      .filter((s) => s.head === null)
      .reduce((acc, s) => acc + (s.amounts[p] ?? 0) / LAKH, 0);

  const pnl = (p: number) => {
    const revenue = sum("revenue", p);
    const direct = sum("stockChange", p) + sum("cogs", p) + sum("directExp", p);
    const grossProfit = revenue - direct;
    const indirect =
      sum("adminExp", p) + sum("sellingExp", p) + sum("employee", p) + sum("otherExp", p);
    const otherIncome = sum("otherIncome", p);
    const ebitda = grossProfit - indirect + otherIncome;
    const pbt = ebitda - sum("depreciation", p) - sum("interest", p);
    return { revenue, direct, grossProfit, indirect, otherIncome, ebitda, pbt };
  };

  it("reads all 33 sheets without silently discarding any", () => {
    expect(sheets.length).toBe(33);
    expect(warnings).toEqual([]);
  });

  it("resolves the T-format scope: two blocks, two header tiers, three units", () => {
    expect(scope.twoSided).toBe(true);
    expect(scope.blocks).toHaveLength(2);
    expect(scope.blocks[0]?.side).toBe("debit");
    expect(scope.blocks[1]?.side).toBe("credit");
    expect(scope.headerRows).toHaveLength(2);
    expect(scope.canonicalDates).toEqual(["2026-03-31", "2026-06-30", "2027-03-31"]);
    expect(scope.unit.basis).toBe("rupees");
  });

  it("matches the two sides on canonical date despite disagreeing headers", () => {
    // Debit header reads 31.03.2026; credit header reads 31.03.026.
    const credit = scope.blocks[1]?.periodColumns.find(
      (p) => p.segment === "Total" && p.canonicalDate === "2026-03-31",
    );
    expect(credit?.printedDate).toBe("31.03.026");
    expect(credit?.label).toBe("Total · 31.03.2026");
  });

  it("yields 66 lines, 58 auto-classified, 8 exceptions", () => {
    expect(staged).toHaveLength(fixture.expected.line_count);
    expect(staged.filter((s) => s.head !== null)).toHaveLength(
      fixture.expected.auto_classified,
    );
    expect(staged.filter((s) => s.head === null)).toHaveLength(
      fixture.expected.unmatched,
    );
  });

  it("leaves exactly the eight genuine expenses for the operator to place", () => {
    expect(staged.filter((s) => s.head === null).map((s) => s.sourceLabel)).toEqual([
      "Diwali Exps.",
      "Bad debt",
      "Donation",
      "Waste Disposal",
      "Short and Excess",
      "Pestseal Service Fee",
      "Annual Fee",
      "Service Fee for MSME Certification",
    ]);
  });

  it("restores Director remuneration, which the previous parser deleted", () => {
    const line = staged.find((s) => s.sourceLabel === "Director remuneration");
    expect(line).toBeDefined();
    expect(line?.head).toBe("employee");
    expect(line?.amounts.map((a) => (a ?? 0) / LAKH)).toEqual([223.8, 223.8]);
  });

  it("stages no footnote, total, subtotal, ratio or derived row", () => {
    const stagedLabels = new Set(staged.map((s) => s.rawLabel));
    for (const forbidden of [
      "TOTAL",
      "TO GROSS PROFIT C/F",
      "BY GROSS PROFIT B/F",
      "GP RATIO (%)",
      "NET PROFIT",
      "NET PROFIT (%)",
      "% Total Direct Exp",
      "TO INDIRECT EXPS",
      "Consumption of raw material",
      "Consumption % as per sale",
      "Purchase % As per Sale",
      "Closing Stock (% of Purchase)",
      "Closing Stock (% of Sale)",
      "Closing Stock (% of Material Consumed)",
    ]) {
      expect(stagedLabels.has(forbidden)).toBe(false);
    }
    for (const s of staged) expect(s.rawLabel).not.toMatch(/^\d+\s*\./);
  });

  it("carries closing stock as a negative contra against cost", () => {
    const closing = staged.find((s) => s.sourceLabel === "CLOSING STOCK");
    expect(closing?.side).toBe("credit");
    expect(closing?.head).toBe("stockChange");
    expect(closing?.amounts.every((a) => (a ?? 0) < 0)).toBe(true);
  });

  it("reclassifies credit-side lines the matcher reads as costs to other income", () => {
    for (const label of [
      "Interest on FDR",
      "Interest on IT Refund",
      "Interest on Security Deposit with UPPCL",
      "Profit on sale of FA",
      "Account Write off",
      "Difference in Exch Rate",
    ]) {
      expect(staged.find((s) => s.sourceLabel === label)?.head).toBe("otherIncome");
    }
  });

  it("reconciles gross profit to the client's own stated figures", () => {
    const fy26 = pnl(0);
    expect(near(fy26.grossProfit, 3111.17)).toBe(true);
    expect(near((fy26.grossProfit / fy26.revenue) * 100, 17.47)).toBe(true);
    // Client's sheet states 3,111.2 at 17.5%.
    expect(near(fy26.grossProfit, 3111.2, 0.05)).toBe(true);

    const fy27 = pnl(1);
    expect(near(fy27.revenue, 20200)).toBe(true);
    expect(near(fy27.grossProfit, 3579.48)).toBe(true);
    expect(near((fy27.grossProfit / fy27.revenue) * 100, 17.72)).toBe(true);
    // Client's sheet states 3,579.5 at 17.7%.
    expect(near(fy27.grossProfit, 3579.5, 0.05)).toBe(true);
  });

  it("reconciles the FULL P&L: PBT less the exceptions equals stated net profit", () => {
    // Gross profit alone tests the top half. This tests the whole
    // statement — the credit-side handling and the indirect block included.
    const stated = fixture.expected.workbook_stated_net_profit;
    expect(near(pnl(0).pbt - unclassified(0), stated["FY 2025-26"])).toBe(true);
    expect(near(pnl(1).pbt - unclassified(1), stated["FY 2026-27"])).toBe(true);
  });

  it("matches every line in the v2 fixture", () => {
    expect(staged.map((s) => s.sourceLabel)).toEqual(
      fixture.lines.map((l) => l.source_label),
    );
    for (const [i, expected] of fixture.lines.entries()) {
      const actual = staged[i];
      expect(actual?.head ?? null).toBe(expected.key);
      expect(actual?.section ?? null).toBe(expected.parent);
      for (const [p, value] of expected.vals.entries()) {
        const got = actual?.amounts[p] ?? null;
        if (value === null) expect(got).toBeNull();
        else expect(near(got ?? 0, value, 0.01)).toBe(true);
      }
    }
  });

  it("never parents a line to a zero-valued expense head", () => {
    // v1 read "no values" as "section", so `Bad debt` parented to
    // `Renewal Fee`. Every section must come from the vocabulary.
    const sections = new Set(staged.map((s) => s.section).filter(Boolean));
    expect([...sections].sort()).toEqual([
      "DIRECT EXPENSES",
      "INDIRECT EXPS",
      "INDIRECT INCOME",
      "SALES",
    ]);
  });

  it("produces no NaN and no undefined amount", () => {
    for (const s of staged) {
      for (const a of s.amounts) {
        expect(a === null || Number.isFinite(a)).toBe(true);
      }
    }
  });

  // -------------------------------------------------------------------------
  // Through the PRODUCTION path. Everything above drives the scope model
  // directly; this drives `extractUnderScope`, the function runExtraction
  // actually calls — the path that was broken, and therefore the one worth
  // asserting.
  // -------------------------------------------------------------------------
  describe("through runExtraction's scoped path", () => {
    const scope: ScopeChoice = {
      sheetName: "26-27 Projection",
      periods: [
        { segment: "Total", canonicalDate: "2026-03-31" },
        { segment: "Total", canonicalDate: "2027-03-31" },
      ],
      source: "operator",
    };
    const result = extractUnderScope(sheets, scope, "pnl");
    if ("error" in result) throw new Error(result.error);

    it("stages one figure per (line, period) that actually carries one", () => {
      // 66 lines across 2 periods is not 132 figures: a head can be blank
      // in one year. Expected counts are DERIVED from the fixture rather
      // than hard-coded, so this asserts the production path agrees with
      // the recorded extraction instead of with a number I typed.
      const expected = [0, 1].map(
        (p) => fixture.lines.filter((l) => l.vals[p] !== null).length,
      );
      const perPeriod = new Map<string, number>();
      for (const l of result.lines) {
        perPeriod.set(l.periodLabel ?? "?", (perPeriod.get(l.periodLabel ?? "?") ?? 0) + 1);
      }
      expect([...perPeriod.keys()].sort()).toEqual([
        "Total · 31.03.2026",
        "Total · 31.03.2027",
      ]);
      expect(perPeriod.get("Total · 31.03.2026")).toBe(expected[0]);
      expect(perPeriod.get("Total · 31.03.2027")).toBe(expected[1]);
      expect(result.lines).toHaveLength((expected[0] ?? 0) + (expected[1] ?? 0));
    });

    it("reads ONE sheet — no line comes from anywhere else", () => {
      // The defect this whole amendment exists for: provenance spanning
      // '25-26 Actual', 'Dhaulana' and 'Upto June Dh' in one flat list.
      for (const line of result.lines) {
        expect(line.provenance).toMatch(/^26-27 Projection!/);
      }
    });

    it("tags every staged figure with its own segment and period", () => {
      for (const line of result.lines) {
        expect(line.segment).toBe("Total");
        expect(line.periodLabel).toMatch(/^Total · 31\.03\.202[67]$/);
      }
    });

    it("reconciles gross profit through the production path", () => {
      const at = (label: string, period: string) =>
        (result.lines.find(
          (l) => l.sourceLabel === label && l.periodLabel === period,
        )?.amount ?? 0) / LAKH;
      expect(near(at("Sales", "Total · 31.03.2027"), 20200)).toBe(true);
      expect(near(at("OPENING STOCK", "Total · 31.03.2026"), 932.35)).toBe(true);
      // Closing stock keeps its contra sign through this path too.
      expect(at("CLOSING STOCK", "Total · 31.03.2026")).toBeLessThan(0);
    });

    it("carries the classifier's head onto every staged line", () => {
      // A4-d-2 computed the head, used it for the contra sign, then threw
      // it away — so a correctly classified line reached the review screen
      // showing nothing but "not mapped". Same row, opposite impression.
      const withHead = result.lines.filter((l) => l.proposedHead !== null);
      const without = result.lines.filter((l) => l.proposedHead === null);
      expect(withHead.length).toBeGreaterThan(0);
      expect(
        result.lines.find(
          (l) => l.sourceLabel === "Director remuneration",
        )?.proposedHead,
      ).toBe("employee");
      expect(result.lines.find((l) => l.sourceLabel === "Sales")?.proposedHead).toBe(
        "revenue",
      );
      expect(
        result.lines.find((l) => l.sourceLabel === "Interest on FDR")?.proposedHead,
      ).toBe("otherIncome");
      // Only the genuine exceptions carry no head.
      const exceptionLabels = new Set(without.map((l) => l.sourceLabel));
      expect([...exceptionLabels].sort()).toEqual([
        "Annual Fee",
        "Bad debt",
        "Diwali Exps.",
        "Donation",
        "Pestseal Service Fee",
        "Service Fee for MSME Certification",
        "Short and Excess",
        "Waste Disposal",
      ]);
    });

    it("records the scope and the unit conversion in its notes", () => {
      expect(result.notes.join(" ")).toMatch(/Scoped to "26-27 Projection" · Total/);
      expect(result.notes.join(" ")).toMatch(/operator-selected/);
      expect(result.notes.join(" ")).toMatch(/read in rupees/);
    });

    it("refuses a scope naming a sheet the workbook lacks", () => {
      const bad = extractUnderScope(sheets, { ...scope, sheetName: "Nope" }, "pnl");
      expect("error" in bad).toBe(true);
    });

    it("applies an operator's unit override at the single boundary", () => {
      const asLakhs = extractUnderScope(sheets, scope, "pnl", "lakhs");
      if ("error" in asLakhs) throw new Error(asLakhs.error);
      const sales = asLakhs.lines.find(
        (l) => l.sourceLabel === "Sales" && l.periodLabel === "Total · 31.03.2027",
      );
      // Same printed figure, read as lakhs: 100,000x the rupee reading.
      expect(sales?.amount).toBe(20200 * LAKH * LAKH);
    });
  });
});
