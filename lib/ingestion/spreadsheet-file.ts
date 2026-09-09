import ExcelJS from "exceljs";
import type { Cell, ParsedSheet } from "./parse-spreadsheet";

/**
 * Amendment A4-b — the ONLY file that touches exceljs. Converts an XLSX
 * workbook into the plain cell grid the pure parsing core consumes.
 * Bounded reads (rows/cols/sheets) because uploads are untrusted content.
 *
 * A4-d: the bounds no longer TRUNCATE SILENTLY. The old `MAX_SHEETS = 10`
 * discarded 23 of a real client's 33 sheets without a word — and a
 * 33-sheet working ledger is normal for this client base, not an attack.
 * The sheet bound is now a refusal, not a trim: too many sheets fails the
 * job with a reason the operator can act on. Row and column bounds report
 * what they clipped through `warnings`, which the caller surfaces.
 *
 * Legacy binary .xls is NOT supported (exceljs reads xlsx only; the
 * libraries that read .xls carry security baggage we refused) — callers
 * surface an honest "re-export as XLSX/CSV/PDF" failure instead.
 */

/** A refusal threshold, not a trim. Real ledgers run to ~35 sheets. */
const MAX_SHEETS = 100;
const MAX_ROWS = 5000;
const MAX_COLS = 60;

function coerceCell(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("result" in value && value.result !== undefined) {
      return coerceCell(value.result as ExcelJS.CellValue);
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      const text = value.richText.map((rt) => rt.text ?? "").join("");
      return text === "" ? null : text;
    }
    if ("text" in value && typeof value.text === "string") {
      return value.text;
    }
  }
  return null;
}

export type WorkbookRead = {
  sheets: ParsedSheet[];
  /** Non-fatal notes about what the bounds clipped. Never silent. */
  warnings: string[];
};

export async function readWorkbook(buffer: Buffer): Promise<WorkbookRead> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  if (workbook.worksheets.length > MAX_SHEETS) {
    throw new Error(
      `This workbook has ${workbook.worksheets.length} sheets, beyond the ${MAX_SHEETS}-sheet limit. Split it or remove unused sheets and upload again.`,
    );
  }

  const warnings: string[] = [];
  const sheets: ParsedSheet[] = [];
  for (const worksheet of workbook.worksheets) {
    const rows: Cell[][] = [];
    if (worksheet.rowCount > MAX_ROWS) {
      warnings.push(
        `Sheet "${worksheet.name}" has ${worksheet.rowCount} rows; only the first ${MAX_ROWS} were read.`,
      );
    }
    if (worksheet.columnCount > MAX_COLS) {
      warnings.push(
        `Sheet "${worksheet.name}" has ${worksheet.columnCount} columns; only the first ${MAX_COLS} were read.`,
      );
    }
    // includeEmpty keeps row indexes aligned with the sheet's real row
    // numbers — provenance ("Sheet1!B14") must point at the actual cell.
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (rowNumber > MAX_ROWS) return;
      const cells: Cell[] = [];
      for (let c = 1; c <= Math.min(row.cellCount, MAX_COLS); c++) {
        cells.push(coerceCell(row.getCell(c).value));
      }
      rows[rowNumber - 1] = cells;
    });
    // eachRow can leave holes for fully-empty rows; normalize to [].
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]) rows[i] = [];
    }
    sheets.push({ name: worksheet.name || "Sheet", rows });
  }
  return { sheets, warnings };
}

/** Back-compat shim for callers that only need the grids. */
export async function readXlsx(buffer: Buffer): Promise<ParsedSheet[]> {
  return (await readWorkbook(buffer)).sheets;
}
