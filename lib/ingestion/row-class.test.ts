import { describe, expect, it } from "vitest";
import {
  canonicalSectionName,
  classifyRow,
  cleanSourceLabel,
  isStageable,
} from "./row-class";

const kindOf = (label: string, carriesValue = true) =>
  classifyRow(label, carriesValue).kind;

describe("noise class is gated on absence of a value", () => {
  // The regression this whole class exists for: a NOISE rule carrying
  // `director\b` as a PREFIX deleted `Director remuneration`, a ₹223.80 L
  // expense, on a real client file.
  it("never discards a value-carrying row that merely starts with a signatory word", () => {
    expect(kindOf("Director remuneration", true)).toBe("line");
    expect(kindOf("Director sitting fees", true)).toBe("line");
    expect(kindOf("Partner salary", true)).toBe("line");
    expect(kindOf("Date expenses", true)).toBe("line");
  });

  it("still recognises a bare signatory label when it carries no value", () => {
    expect(kindOf("Director", false)).toBe("note");
    expect(kindOf("Partner", false)).toBe("note");
    expect(kindOf("Place :", false)).toBe("note");
    expect(kindOf("For and on behalf", false)).toBe("note");
    expect(kindOf("Chartered Accountants", false)).toBe("note");
  });

  it("treats a bare signatory label that DOES carry a value as unclear, not deleted", () => {
    const result = classifyRow("Director", true);
    expect(result.kind).toBe("unclear");
    expect(isStageable(result.kind)).toBe(false);
    expect(result.reason).toMatch(/human decision/i);
  });

  it("recognises numbered footnotes and prose when they carry no value", () => {
    expect(
      kindOf("1.The unbold figures represent the actual figures", false),
    ).toBe("note");
    expect(kindOf("3.Projected turnover are Rs.202 Crore (Dhaulana)", false)).toBe(
      "note",
    );
    expect(kindOf("Notes:-", false)).toBe("note");
  });
});

describe("pattern-gated exclusions hold even when the row carries a value", () => {
  it("excludes stated totals", () => {
    expect(kindOf("TOTAL")).toBe("total");
    expect(kindOf("Grand Total")).toBe("total");
    expect(kindOf("Total Assets")).toBe("total");
  });

  it("excludes a percentage-prefixed section subtotal", () => {
    // Carries ₹1,612.79 L — the sum of the six direct lines beneath it.
    expect(kindOf("% Total Direct Exp")).toBe("subtotal");
  });

  it("excludes ratio and percentage rows", () => {
    expect(kindOf("GP RATIO (%)")).toBe("ratio");
    expect(kindOf("Consumption % as per sale")).toBe("ratio");
    expect(kindOf("Closing Stock (% of Purchase)")).toBe("ratio");
    expect(kindOf("NET PROFIT (%)")).toBe("ratio");
  });

  it("excludes derived lines", () => {
    expect(kindOf("TO GROSS PROFIT C/F")).toBe("derived");
    expect(kindOf("BY GROSS PROFIT B/F")).toBe("derived");
    expect(kindOf("NET PROFIT")).toBe("derived");
    expect(kindOf("Consumption of raw material")).toBe("derived");
  });
});

describe("section headings need vocabulary AND a structural signal", () => {
  it("promotes a vocabulary match carrying a bookkeeping prefix", () => {
    const r = classifyRow("TO INDIRECT EXPS", true);
    expect(r.kind).toBe("section_heading");
    expect(r.sectionName).toBe("INDIRECT EXPS");
  });

  it("promotes a vocabulary match even when it carries a roll-up figure", () => {
    // TO INDIRECT EXPS holds ₹2,338.86 L. The name is used, the value is not.
    expect(classifyRow("TO DIRECT EXPENSES", false).sectionName).toBe(
      "DIRECT EXPENSES",
    );
    expect(classifyRow("TO INDIRECT EXPS", true).sectionName).toBe("INDIRECT EXPS");
  });

  it("resolves BY SALES ACCOUNT to the section and leaves Sales as a line", () => {
    // Both canonicalise to SALES. Promoting on vocabulary alone swallowed
    // the revenue line and the P&L lost its top line entirely.
    expect(classifyRow("BY SALES ACCOUNT", false).sectionName).toBe("SALES");
    expect(kindOf("Sales", true)).toBe("line");
  });

  it("never promotes an all-caps line that is not in the vocabulary", () => {
    expect(kindOf("PURCHASE INKS")).toBe("line");
    expect(kindOf("TO PURCHASE A/C")).toBe("line");
    expect(kindOf("TO OPENING STOCK")).toBe("line");
    expect(kindOf("BONUS/INCENTIVE A/C")).toBe("line");
  });
});

describe("label handling", () => {
  it("strips bookkeeping affixes but keeps the label as printed", () => {
    expect(cleanSourceLabel("TO OPENING STOCK")).toBe("OPENING STOCK");
    expect(cleanSourceLabel("BY SALES ACCOUNT")).toBe("SALES ACCOUNT");
    expect(cleanSourceLabel("Rent A/c")).toBe("Rent");
    expect(cleanSourceLabel("Electricity  Exp.")).toBe("Electricity Exp.");
    // Trailing punctuation survives — it is part of the printed label.
    expect(cleanSourceLabel("Bonus Exp.")).toBe("Bonus Exp.");
    expect(cleanSourceLabel("Vehicle Running & Mant.")).toBe(
      "Vehicle Running & Mant.",
    );
  });

  it("canonicalises section names consistently across sides", () => {
    expect(canonicalSectionName("TO INDIRECT EXPS")).toBe("INDIRECT EXPS");
    expect(canonicalSectionName("BY INDIRECT INCOME")).toBe("INDIRECT INCOME");
    expect(canonicalSectionName("BY SALES ACCOUNT")).toBe("SALES");
  });

  it("handles empty and whitespace labels without throwing", () => {
    expect(kindOf("", false)).toBe("blank");
    expect(classifyRow(null, false).kind).toBe("blank");
    expect(classifyRow(undefined, true).kind).toBe("blank");
    expect(kindOf("   ", false)).toBe("blank");
  });
});
