import { describe, expect, it } from "vitest";
import { findConsolidatedSegment, normalizeSegment } from "./workbook";

/**
 * ONE marker for consolidated figures: `segment IS NULL` (migration 0009).
 *
 * A7-a-2 published 121 statement lines and 19 KPI values carrying the
 * string "Total", taken straight from the workbook's column header. Every
 * figure was correct and reconciled, and every report tab showed "No data
 * recorded" — because consolidated reads filter `segment is null`, and a
 * second marker for the same concept matches nothing. Worse, a segment-wise
 * view would have rendered "Total" as though it were a plant alongside
 * Dhaulana and Greater Noida.
 *
 * A source document's column header is not this platform's vocabulary.
 * Translation happens at one boundary, and these are its rules.
 */

describe("consolidated column names translate to NULL", () => {
  it("maps the names an Indian statement uses for its total column", () => {
    for (const name of [
      "Total", "total", "TOTAL", "  Total  ",
      "Consolidated", "Combined", "Grand Total", "Company", "All Units",
    ]) {
      expect(normalizeSegment(name), `"${name}" should mean consolidated`).toBeNull();
    }
  });

  it("leaves a real unit name alone", () => {
    expect(normalizeSegment("Dhaulana")).toBe("Dhaulana");
    expect(normalizeSegment("Greater Noida")).toBe("Greater Noida");
    expect(normalizeSegment("Telangana")).toBe("Telangana");
    // Trimmed, but not otherwise rewritten — it has to keep matching the
    // segment names already published for this client.
    expect(normalizeSegment("  Dhaulana ")).toBe("Dhaulana");
  });

  it("treats absence and blank as consolidated", () => {
    expect(normalizeSegment(null)).toBeNull();
    expect(normalizeSegment(undefined)).toBeNull();
    expect(normalizeSegment("")).toBeNull();
    expect(normalizeSegment("   ")).toBeNull();
  });

  it("never invents a unit called Total", () => {
    // The specific defect: "Total" surviving as a segment would appear in
    // segment-wise reporting as a fourth plant, double-counting the group.
    expect(normalizeSegment("Total")).not.toBe("Total");
  });
});

describe("choosing a default unit in the picker", () => {
  it("prefers the consolidated column when the sheet names one", () => {
    expect(findConsolidatedSegment(["Dhaulana", "Greater Noida", "Total"])).toBe("Total");
  });

  it("returns undefined when several units exist and none is the total", () => {
    // undefined means "the operator must choose" — distinct from null,
    // which means "this sheet is unsegmented". Defaulting to the leftmost
    // would publish one plant's figures as the whole company's.
    expect(findConsolidatedSegment(["Dhaulana", "Greater Noida"])).toBeUndefined();
  });

  it("passes through a single unsegmented sheet", () => {
    expect(findConsolidatedSegment([null])).toBeNull();
    expect(findConsolidatedSegment([])).toBeNull();
  });
});
