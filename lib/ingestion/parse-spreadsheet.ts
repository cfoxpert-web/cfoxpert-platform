import type { DocumentKind } from "../documents/model";
import { parseAmount } from "./normalize";
import type { CandidateLine } from "./types";

/**
 * Amendment A4-b — deterministic spreadsheet parsing (extraction rung 1).
 *
 * The heuristic core works on a plain cell grid so it is unit-testable
 * without files; exceljs touches only the file boundary in
 * `spreadsheet-file.ts`. Handles the two layouts Tally-style exports
 * actually use:
 *   [Particulars | Debit | Credit]   → trial-balance mode (debit − credit)
 *   [Particulars | Amount]           → simple label/amount statements
 *
 * Parsed cells get CELL-level provenance and confidence 1.0 — this rung
 * involves no model. If the grid doesn't fit either layout, the caller
 * falls to the Claude rung (which sees the same grid serialized as CSV).
 */

export type Cell = string | number | null;

export type ParsedSheet = {
  name: string;
  rows: Cell[][];
};

const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function columnRef(index: number): string {
  // Sheets we parse are narrow; two letters covers 702 columns.
  if (index < 26) return COLUMN_LETTERS[index] ?? "?";
  const first = COLUMN_LETTERS[Math.floor(index / 26) - 1] ?? "?";
  const second = COLUMN_LETTERS[index % 26] ?? "?";
  return `${first}${second}`;
}

function cellText(cell: Cell): string | null {
  if (typeof cell === "string") {
    const t = cell.trim();
    return t === "" ? null : t;
  }
  return null;
}

function cellAmount(cell: Cell, drCr: boolean): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (typeof cell === "string") return parseAmount(cell, { drCr });
  return null;
}

/** Find the header row declaring a Debit/Credit column pair, if any. */
function findDebitCreditColumns(
  rows: Cell[][],
): { headerRow: number; labelCol: number; debitCol: number; creditCol: number } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];
    if (!row) continue;
    let debitCol = -1;
    let creditCol = -1;
    for (let c = 0; c < row.length; c++) {
      const t = cellText(row[c] ?? null)?.toLowerCase() ?? "";
      if (debitCol === -1 && /\bdebit\b|\bdr\.?\b/.test(t)) debitCol = c;
      if (creditCol === -1 && /\bcredit\b|\bcr\.?\b/.test(t)) creditCol = c;
    }
    if (debitCol !== -1 && creditCol !== -1 && debitCol !== creditCol) {
      // Tally-style TBs put Particulars in the first column.
      return { headerRow: r, labelCol: 0, debitCol, creditCol };
    }
  }
  return null;
}

/**
 * Extract candidate lines from one sheet. Returns [] when the layout
 * doesn't fit — the caller decides whether other sheets (or the Claude
 * rung) take over.
 */
export function sheetToLines(
  sheet: ParsedSheet,
  kind: DocumentKind,
): CandidateLine[] {
  const { rows, name } = sheet;
  const lines: CandidateLine[] = [];

  const dc = findDebitCreditColumns(rows);
  if (dc) {
    // Trial-balance layout: amount = debit − credit (debit positive).
    for (let r = dc.headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      const label = cellText(row[dc.labelCol] ?? null);
      if (!label) continue;
      const debit = cellAmount(row[dc.debitCol] ?? null, true);
      const credit = cellAmount(row[dc.creditCol] ?? null, true);
      if (debit === null && credit === null) continue;
      const amount = (debit ?? 0) - Math.abs(credit ?? 0);
      lines.push({
        statement: kind === "other" ? "trial_balance" : kind,
        sourceLabel: label,
        amount,
        periodLabel: null,
        segment: null,
        provenance: `${name}!${columnRef(dc.debitCol)}${r + 1}`,
        proposedKpiKey: null,
        confidence: 1,
      });
    }
    return lines;
  }

  // Simple label/amount layout: a text cell followed (anywhere right of it)
  // by exactly one parseable amount cell in the same row.
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;

    let label: string | null = null;
    let labelCol = -1;
    for (let c = 0; c < row.length; c++) {
      const t = cellText(row[c] ?? null);
      if (t) {
        label = t;
        labelCol = c;
        break;
      }
    }
    if (!label) continue;

    const amounts: { col: number; value: number }[] = [];
    for (let c = labelCol + 1; c < row.length; c++) {
      const v = cellAmount(row[c] ?? null, false);
      if (v !== null) amounts.push({ col: c, value: v });
    }
    // Multiple numeric columns = comparative statement (this yr / last yr):
    // ambiguous for a deterministic rung — skip the row; Claude rung reads
    // the layout in context instead of us guessing which column is current.
    if (amounts.length !== 1) continue;

    const amt = amounts[0];
    if (!amt) continue;
    lines.push({
      statement: kind,
      sourceLabel: label,
      amount: amt.value,
      periodLabel: null,
      segment: null,
      provenance: `${name}!${columnRef(amt.col)}${r + 1}`,
      proposedKpiKey: null,
      confidence: 1,
    });
  }
  return lines;
}

/** Minimum plausible lines for the deterministic rung to claim the document. */
const MIN_PARSED_LINES = 3;

export function sheetsToLines(
  sheets: ParsedSheet[],
  kind: DocumentKind,
): CandidateLine[] | null {
  const all = sheets.flatMap((s) => sheetToLines(s, kind));
  return all.length >= MIN_PARSED_LINES ? all : null;
}

/** Serialize the grid to CSV text — what the Claude rung sees on fallback. */
export function sheetsToCsv(sheets: ParsedSheet[]): string {
  const parts: string[] = [];
  for (const sheet of sheets) {
    parts.push(`# Sheet: ${sheet.name}`);
    for (const row of sheet.rows) {
      const cells = row.map((c) => {
        if (c === null) return "";
        const s = String(c);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      parts.push(cells.join(","));
    }
  }
  return parts.join("\n");
}

/**
 * Minimal CSV parser (quotes, escaped quotes, CRLF). Hand-rolled on
 * purpose — no dependency for a format this small.
 */
export function parseCsv(text: string): Cell[][] {
  const rows: Cell[][] = [];
  let row: Cell[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    const trimmed = field.trim();
    row.push(trimmed === "" ? null : trimmed);
    field = "";
  };
  const pushRow = () => {
    pushField();
    if (row.some((c) => c !== null)) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text.charAt(i); // charAt: always a string, even at bounds
    if (inQuotes) {
      if (ch === '"') {
        if (text.charAt(i + 1) === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) pushRow();
  return rows;
}
