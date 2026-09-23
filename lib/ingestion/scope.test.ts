import { describe, expect, it } from "vitest";
import type { Cell, ParsedSheet } from "./parse-spreadsheet";
import {
  autoSelectScope,
  describeSheet,
  describeWorkbook,
  fingerprintWorkbook,
  isUnitBasisName,
  validateScopeChoice,
  withUnitBasis,
  type ScopeChoice,
} from "./workbook";

function sheet(
  name: string,
  header: { segments?: (string | null)[]; dates: string[] },
  bodyLabels: string[],
  title?: string,
): ParsedSheet {
  const rows: Cell[][] = [];
  if (title) rows.push([title]);
  else rows.push(["SOME COMPANY LIMITED"]);
  const segRow: Cell[] = ["PARTICULARS"];
  const dateRow: Cell[] = ["PARTICULARS"];
  for (const [i, d] of header.dates.entries()) {
    segRow.push(header.segments?.[i] ?? null);
    dateRow.push(d);
  }
  if (header.segments) rows.push(segRow);
  rows.push(dateRow);
  for (const [i, label] of bodyLabels.entries()) {
    rows.push([label, ...header.dates.map((_, j) => (i + 1) * 100 + j)]);
  }
  return { name, rows };
}

/** One sheet, one unit, dated columns — the common single-export case. */
const simple = sheet("P&L", { dates: ["31.03.2026", "31.03.2027"] }, [
  "Sales",
  "Purchases",
  "Salary Exp.",
  "Rent",
]);

/** Same shape, but reporting three units side by side. */
const multiUnit = sheet(
  "Projection",
  {
    segments: ["Plant A", "Plant A", "Total", "Total"],
    dates: ["31.03.2026", "31.03.2027", "31.03.2026", "31.03.2027"],
  },
  ["Sales", "Purchases", "Salary Exp.", "Rent"],
);

const register: ParsedSheet = {
  name: "Depreciation Register",
  rows: [["Asset"], ["Machine A", 100], ["Machine B", 200]],
};

describe("auto-selection", () => {
  it("auto-selects when one sheet reports one unit", () => {
    const result = autoSelectScope(describeWorkbook([simple, register]));
    expect(result.autoSelected).toBe(true);
    if (!result.autoSelected) return;
    expect(result.choice.sheetName).toBe("P&L");
    expect(result.choice.source).toBe("auto");
    expect(result.choice.periods.map((p) => p.canonicalDate)).toEqual([
      "2026-03-31",
      "2027-03-31",
    ]);
  });

  it("REFUSES to auto-select when a sheet reports several units", () => {
    // Ambiguity is exactly when inference is worth least: picking one of
    // Plant A / Total would label one plant's figures as the company's.
    const result = autoSelectScope(describeWorkbook([multiUnit]));
    expect(result.autoSelected).toBe(false);
    expect(result.because).toMatch(/units/i);
  });

  it("REFUSES to auto-select when two sheets could be the statement", () => {
    const result = autoSelectScope(describeWorkbook([simple, { ...simple, name: "P&L (2)" }]));
    expect(result.autoSelected).toBe(false);
    expect(result.because).toMatch(/2 sheets/i);
  });

  it("REFUSES when no sheet offers dated columns", () => {
    const result = autoSelectScope(describeWorkbook([register]));
    expect(result.autoSelected).toBe(false);
    expect(result.because).toMatch(/no sheet/i);
  });

  it("marks a register as implausible rather than hiding it", () => {
    // This test's NAME always described the intent; its assertion used to
    // require the opposite, and describeWorkbook dropped undescribable
    // sheets entirely. On a real 33-sheet workbook that listed 7 and
    // silently lost 26, including sheets with real content.
    const described = describeWorkbook([simple, register]);
    expect(described.map((d) => d.sheetName)).toEqual([
      "P&L",
      "Depreciation Register",
    ]);
    const reg = described.find((d) => d.sheetName === "Depreciation Register");
    expect(reg?.plausible).toBe(false);
    expect(reg?.reason).toMatch(/No header row with two or more readable dates/);
    // And it never becomes a scope option by accident.
    expect(autoSelectScope(described).autoSelected).toBe(true);
  });

  it("returns one entry per sheet, always — the count the picker shows", () => {
    const described = describeWorkbook([simple, register, multiUnit]);
    expect(described).toHaveLength(3);
    for (const d of described) {
      expect(d.plausible ? d.reason : d.reason ?? "").not.toBe(undefined);
      if (!d.plausible) expect(d.reason).toBeTruthy();
    }
  });
});

describe("scope validation refuses rather than coerces", () => {
  const options = describeWorkbook([multiUnit]);
  const valid: ScopeChoice = {
    sheetName: "Projection",
    periods: [{ segment: "Total", canonicalDate: "2027-03-31" }],
    source: "operator",
  };

  it("accepts a scope the workbook actually offers", () => {
    expect(validateScopeChoice(options, valid)).toEqual({ ok: true });
  });

  it("refuses an unknown sheet", () => {
    const r = validateScopeChoice(options, { ...valid, sheetName: "Nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no sheet named/i);
  });

  it("refuses a date the sheet does not carry", () => {
    const r = validateScopeChoice(options, {
      ...valid,
      periods: [{ segment: "Total", canonicalDate: "2030-03-31" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no column for/i);
  });

  it("refuses a segment the sheet does not carry, rather than picking the nearest", () => {
    const r = validateScopeChoice(options, {
      ...valid,
      periods: [{ segment: "Plant Z", canonicalDate: "2027-03-31" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Plant Z/);
  });

  it("refuses an empty period list and a duplicated column", () => {
    expect(validateScopeChoice(options, { ...valid, periods: [] }).ok).toBe(false);
    const dup = validateScopeChoice(options, {
      ...valid,
      periods: [
        { segment: "Total", canonicalDate: "2027-03-31" },
        { segment: "Total", canonicalDate: "2027-03-31" },
      ],
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toMatch(/twice/i);
  });
});

describe("unit basis", () => {
  it("reports the largest printed value as evidence, always", () => {
    const described = describeSheet(simple);
    expect(described?.unit.basis).toBe("rupees");
    expect(described?.unit.detectedFrom).toMatch(/no unit stated/);
    expect(described?.unit.largestPrintedValue).toBeGreaterThan(0);
  });

  it("keeps the evidence when an operator overrides the basis", () => {
    const described = describeSheet(simple)!;
    const overridden = withUnitBasis(described.unit, "lakhs");
    expect(overridden.multiplierToRupees).toBe(100_000);
    expect(overridden.detectedFrom).toMatch(/set by the operator/);
    expect(overridden.detectedFrom).toMatch(/detected: rupees/);
    expect(overridden.largestPrintedValue).toBe(described.unit.largestPrintedValue);
  });

  it("is a no-op when the override matches what was detected", () => {
    const described = describeSheet(simple)!;
    expect(withUnitBasis(described.unit, "rupees")).toBe(described.unit);
  });

  it("guards untrusted input before it can scale every figure", () => {
    expect(isUnitBasisName("lakhs")).toBe(true);
    expect(isUnitBasisName("crores")).toBe(true);
    expect(isUnitBasisName("millions")).toBe(false);
    expect(isUnitBasisName("")).toBe(false);
    expect(isUnitBasisName(null)).toBe(false);
    expect(isUnitBasisName(100000)).toBe(false);
  });

  it("is no longer part of sheet scope — it applies to CSVs too", () => {
    // A CSV has no sheet to choose, but rupees-versus-lakhs matters to it
    // exactly as much, so the basis lives on the job, not in the scope.
    const choice: ScopeChoice = {
      sheetName: "P&L",
      periods: [{ segment: null, canonicalDate: "2027-03-31" }],
      source: "operator",
    };
    expect("unitBasis" in choice).toBe(false);
  });
});

describe("workbook fingerprint", () => {
  it("is stable across two exports of the same template", () => {
    // Same structure, entirely different figures.
    const january = sheet("P&L", { dates: ["31.03.2026", "31.03.2027"] }, [
      "Sales", "Purchases", "Salary Exp.", "Rent",
    ]);
    const february: ParsedSheet = {
      name: "P&L",
      rows: january.rows.map((r, i) =>
        i < 2 ? r : r.map((c) => (typeof c === "number" ? c * 7 + 13 : c)),
      ),
    };
    const a = fingerprintWorkbook([january], describeWorkbook([january]));
    const b = fingerprintWorkbook([february], describeWorkbook([february]));
    expect(a.hash).toBe(b.hash);
  });

  it("differs when the structure differs", () => {
    const a = fingerprintWorkbook([simple], describeWorkbook([simple]));
    const b = fingerprintWorkbook([multiUnit], describeWorkbook([multiUnit]));
    expect(a.hash).not.toBe(b.hash);
  });

  it("records sheet names and count for later scope memory", () => {
    const fp = fingerprintWorkbook([simple, register], describeWorkbook([simple, register]));
    expect(fp.sheetCount).toBe(2);
    expect(fp.sheetNames).toEqual(["P&L", "Depreciation Register"]);
  });
});
