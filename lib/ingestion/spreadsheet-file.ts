import ExcelJS from "exceljs";
import type { Cell, ParsedSheet } from "./parse-spreadsheet";

/**
 * Amendment A4-b — the ONLY file that touches exceljs. Converts an XLSX
 * workbook into the plain cell grid the pure parsing core consumes.
 * Bounded reads (rows/cols/sheets) because uploads are untrusted content.
 *
 * Legacy binary .xls is NOT supported (exceljs reads xlsx only; the
 * libraries that read .xls carry security baggage we refused) — callers
 * surface an honest "re-export as XLSX/CSV/PDF" failure instead.
 */

const MAX_SHEETS = 10;
const MAX_ROWS = 5000;
const MAX_COLS = 40;

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

export async function readXlsx(buffer: Buffer): Promise<ParsedSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheets: ParsedSheet[] = [];
  for (const worksheet of workbook.worksheets.slice(0, MAX_SHEETS)) {
    const rows: Cell[][] = [];
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
  return sheets;
}
