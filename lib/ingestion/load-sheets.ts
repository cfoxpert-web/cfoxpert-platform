import { parseCsv, type ParsedSheet } from "./parse-spreadsheet";
import { readWorkbook } from "./spreadsheet-file";

/**
 * Amendment A4-d-2 — the ONE place bytes become cell grids.
 *
 * Extracted from run.ts because scope introspection and extraction must
 * read a workbook identically: if the picker offered sheets the extractor
 * then read differently, an operator's choice would silently miss.
 *
 * Returns null sheets for anything that has no sheet scope at all (a PDF),
 * which callers treat as "no scope to resolve", not as a failure.
 */
export type LoadedSheets = {
  sheets: ParsedSheet[] | null;
  warnings: string[];
};

export async function loadSheetsForScope(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<LoadedSheets> {
  if (mimeType === "application/pdf" || /\.pdf$/i.test(fileName)) {
    return { sheets: null, warnings: [] };
  }

  if (mimeType === "text/csv" || /\.csv$/i.test(fileName)) {
    const text = buffer.toString("utf8").replace(/^﻿/, "");
    return { sheets: [{ name: "CSV", rows: parseCsv(text) }], warnings: [] };
  }

  try {
    return await readWorkbook(buffer);
  } catch (err) {
    // A too-large workbook REFUSES with a specific, actionable reason
    // (A4-d). Pass it through rather than burying it under generic advice.
    if (err instanceof Error && /sheets, beyond the/.test(err.message)) throw err;
    throw new Error(
      "Could not read this spreadsheet. If it is a legacy .xls file, re-export it from Tally/Excel as .xlsx, .csv, or PDF and upload again.",
    );
  }
}
