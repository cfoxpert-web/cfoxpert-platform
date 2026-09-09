/**
 * Amendment A4-d — the workbook scope model (pure). Stage 1 of ADR-011.
 *
 * Nothing reaches the review screen until scope is resolved: which sheet,
 * which columns, which period, which unit. This module INTROSPECTS a
 * workbook into the choices an operator picks from, and extracts the rows
 * for a chosen scope. It never writes anything and never decides for the
 * operator.
 *
 * What it replaces: `sheetsToLines()` `flatMap`ped every sheet in the
 * workbook into one list. On a 33-sheet working ledger that produced lines
 * from four sheets, two plants and three periods in a single flat list,
 * all publishing to one period label. Scope is the fix; the review screen
 * was never the problem.
 *
 * T-FORMAT. Real Indian SME statements put debits left and credits right
 * with TWO `Particulars` columns on one sheet. Every label column starts a
 * BLOCK, and the columns between it and the next label column belong to
 * that block. Sides are read from the `TO `/`BY ` bookkeeping prefixes the
 * rows themselves carry, falling back to left-to-right position.
 *
 * CANONICAL DATES. Header dates are hand-typed and disagree across sides:
 * this workbook really does carry `31.03.2026` in the debit header and
 * `31.03.026` in the credit header for the same column pair. Periods are
 * therefore matched on a parsed calendar date, never on header text.
 */

import type { Cell, ParsedSheet } from "./parse-spreadsheet";
import { classifyRow, cleanSourceLabel, isStageable, type RowKind } from "./row-class";

export type BlockSide = "debit" | "credit" | null;

export type PeriodColumn = {
  /** Zero-based column index into the row array. */
  columnIndex: number;
  /** Composed multi-tier label, e.g. "Total · 31.03.2027". */
  label: string;
  /** Upper header tier — the unit/segment, e.g. "Total", "Dhaulana". */
  segment: string | null;
  /** ISO date parsed from the lower tier; null when unparseable. */
  canonicalDate: string | null;
  /** The date text exactly as printed, kept for honest display. */
  printedDate: string | null;
};

export type LabelBlock = {
  labelColumnIndex: number;
  side: BlockSide;
  periodColumns: PeriodColumn[];
};

export const UNIT_BASES = ["rupees", "thousands", "lakhs", "crores"] as const;
export type UnitBasisName = (typeof UNIT_BASES)[number];

export const UNIT_MULTIPLIER: Record<UnitBasisName, number> = {
  rupees: 1,
  thousands: 1_000,
  lakhs: 100_000,
  crores: 10_000_000,
};

/**
 * THE HIGHEST-CONSEQUENCE FIELD IN SCOPE.
 *
 * Every other scope error produces a wrong line or a wrong column, which
 * something downstream will notice. Getting rupees-versus-lakhs wrong is a
 * 100,000× error that passes every internal consistency check we have — the
 * statement still balances, every ratio still reconciles — and only reveals
 * itself when a human reads the number. So the picker renders this at all
 * times with its evidence, never only on failure, and it is always
 * overridable in one control.
 */
export type UnitBasis = {
  basis: UnitBasisName;
  /** Multiply a printed figure by this to get rupees, the stored base. */
  multiplierToRupees: number;
  /** What the detection was based on — shown in the picker and provenance. */
  detectedFrom: string;
  /**
   * Largest absolute value printed in the sheet's period columns. The
   * evidence an operator judges the basis against: "rupees (largest value
   * 20,20,00,000)" reads very differently from "lakhs (largest 20,200)".
   */
  largestPrintedValue: number | null;
};

export type SheetScope = {
  sheetName: string;
  /** Row indices (zero-based) of the detected header tiers, top tier first. */
  headerRows: number[];
  twoSided: boolean;
  blocks: LabelBlock[];
  /** Rows classified `line` across all blocks — the picker's line count. */
  candidateLineCount: number;
  /** Distinct canonical dates offered by this sheet, ascending. */
  canonicalDates: string[];
  /** Distinct segment names offered, in header order. Null = unsegmented. */
  segments: (string | null)[];
  unit: UnitBasis;
  /** Enough real lines and dated columns to be worth offering as a scope. */
  plausible: boolean;
};

// ---------------------------------------------------------------------------
// Cell helpers
// ---------------------------------------------------------------------------

export function cellText(cell: Cell | undefined): string | null {
  if (typeof cell === "string") {
    const t = cell.trim();
    return t === "" ? null : t;
  }
  return null;
}

export function cellNumber(cell: Cell | undefined): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  return null;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Excel's day-zero is 1899-12-30 (the 1900 leap-year bug is baked in). */
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

/** Plausible statement dates: anything outside this is not a period header. */
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

function iso(y: number, m: number, d: number): string | null {
  if (y < MIN_YEAR || y > MAX_YEAR) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Expand a hand-typed year to four digits.
 *
 * `31.03.026` is a real header in this workbook — a dropped digit for 2026.
 * Leading zeros are stripped, then anything under 100 is read as 20xx.
 * A four-digit year is taken as written.
 */
function expandYear(raw: string): number | null {
  const digits = raw.trim();
  if (!/^\d{1,4}$/.test(digits)) return null;
  if (digits.length === 4) return Number(digits);
  const n = Number(digits.replace(/^0+/, "") || "0");
  if (n >= MIN_YEAR) return n;
  if (n <= 99) return 2000 + n;
  return null;
}

/**
 * Parse a header cell into an ISO date. Handles Excel serials, real Date
 * values coerced upstream to `YYYY-MM-DD`, and hand-typed dd.mm.yyyy /
 * dd-mm-yyyy / dd/mm/yyyy including short and malformed years.
 *
 * Day-first, because these are Indian statements. `03.31.2026` would be
 * rejected as an invalid day rather than silently read as March 31.
 */
export function parseHeaderDate(cell: Cell | undefined): string | null {
  if (cell === null || cell === undefined) return null;

  if (typeof cell === "number") {
    // Excel serial. Bounded to plausible statement dates so a stray
    // magnitude (an amount in a header row) is not read as a date.
    if (!Number.isFinite(cell) || cell < 30000 || cell > 80000) return null;
    const ms = EXCEL_EPOCH_UTC + Math.round(cell) * 86_400_000;
    const dt = new Date(ms);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  const text = cell.trim();
  if (text === "") return null;

  // Already ISO (exceljs coerces real Date cells to this upstream).
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
    return iso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const dmy = /^(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,4})$/.exec(text);
  if (dmy?.[1] && dmy[2] && dmy[3]) {
    const year = expandYear(dmy[3]);
    if (year === null) return null;
    return iso(year, Number(dmy[2]), Number(dmy[1]));
  }

  return null;
}

/** Render a canonical date back the way Indian statements print it. */
export function formatHeaderDate(isoDate: string): string {
  const y = isoDate.slice(0, 4);
  const m = isoDate.slice(5, 7);
  const d = isoDate.slice(8, 10);
  return `${d}.${m}.${y}`;
}

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

const UNIT_PATTERNS: { test: RegExp; basis: UnitBasisName; mult: number }[] = [
  { test: /\bin\s*(rs\.?|₹|inr)?\s*crores?\b|\bcr\.?\s*in\b|\(\s*₹?\s*in\s*crores?\s*\)/i, basis: "crores", mult: 10_000_000 },
  { test: /\bin\s*(rs\.?|₹|inr)?\s*lakhs?\b|\blacs?\b|\(\s*₹?\s*in\s*lakhs?\s*\)/i, basis: "lakhs", mult: 100_000 },
  { test: /\bin\s*(rs\.?|₹|inr)?\s*(thousands?|'?000s?)\b/i, basis: "thousands", mult: 1_000 },
];

/**
 * Detect the unit the sheet is printed in from its title rows.
 *
 * Conversion to the stored base (rupees) happens at exactly ONE boundary —
 * `extractScopedRows` — and the multiplier is recorded in provenance. A
 * silent divide applied twice is the classic version of this bug; naming
 * the divisor in the output is what makes it visible instead of mysterious.
 */
export function detectUnit(
  sheet: ParsedSheet,
  scanRows = 6,
  largestPrintedValue: number | null = null,
): UnitBasis {
  for (let r = 0; r < Math.min(sheet.rows.length, scanRows); r++) {
    const row = sheet.rows[r];
    if (!row) continue;
    for (const cell of row) {
      const text = cellText(cell);
      if (!text) continue;
      for (const p of UNIT_PATTERNS) {
        if (p.test.test(text)) {
          return {
            basis: p.basis,
            multiplierToRupees: p.mult,
            detectedFrom: `stated in the sheet title: "${text.slice(0, 80)}"`,
            largestPrintedValue,
          };
        }
      }
    }
  }
  return {
    basis: "rupees",
    multiplierToRupees: 1,
    // Deliberately NOT dressed up as a detection. Nothing stated a unit;
    // rupees is the assumption, and the operator confirms it against the
    // largest value the picker shows beside it.
    detectedFrom: "no unit stated in the sheet — assumed rupees",
    largestPrintedValue,
  };
}

/** Override a detected basis with an operator's choice, keeping the evidence. */
export function withUnitBasis(unit: UnitBasis, basis: UnitBasisName): UnitBasis {
  if (basis === unit.basis) return unit;
  return {
    basis,
    multiplierToRupees: UNIT_MULTIPLIER[basis],
    detectedFrom: `set by the operator (detected: ${unit.basis} — ${unit.detectedFrom})`,
    largestPrintedValue: unit.largestPrintedValue,
  };
}

// ---------------------------------------------------------------------------
// Header + block detection
// ---------------------------------------------------------------------------

const LABEL_HEADER = /^(particulars?|description|account\s*head|head|narration)$/i;

/**
 * Find the header tiers: the row carrying the most parseable dates is the
 * date tier, and the row directly above it (when it carries repeated text
 * spanning several columns) is the segment tier.
 */
function findHeaderRows(rows: Cell[][], scanRows: number): { dateRow: number; segmentRow: number | null } | null {
  let bestRow = -1;
  let bestCount = 0;
  for (let r = 0; r < Math.min(rows.length, scanRows); r++) {
    const row = rows[r];
    if (!row) continue;
    let count = 0;
    for (const cell of row) if (parseHeaderDate(cell) !== null) count++;
    if (count > bestCount) {
      bestCount = count;
      bestRow = r;
    }
  }
  if (bestRow === -1 || bestCount < 2) return null;

  const above = bestRow - 1;
  if (above >= 0) {
    const row = rows[above];
    const textCells = row ? row.filter((c) => cellText(c) !== null).length : 0;
    if (textCells >= 2) return { dateRow: bestRow, segmentRow: above };
  }
  return { dateRow: bestRow, segmentRow: null };
}

/**
 * Locate label columns. A column is a label column when a header row names
 * it (`Particulars`, `Description`…) or, failing that, when its body is
 * overwhelmingly text. Column 0 is always considered.
 */
function findLabelColumns(rows: Cell[][], headerRows: number[]): number[] {
  const named = new Set<number>();
  for (const r of headerRows) {
    const row = rows[r];
    if (!row) continue;
    for (let c = 0; c < row.length; c++) {
      const t = cellText(row[c]);
      if (t && LABEL_HEADER.test(t)) named.add(c);
    }
  }
  if (named.size > 0) return [...named].sort((a, b) => a - b);

  const width = rows.reduce((w, r) => Math.max(w, r?.length ?? 0), 0);
  const bodyStart = headerRows.length > 0 ? Math.max(...headerRows) + 1 : 0;
  const found: number[] = [];
  for (let c = 0; c < width; c++) {
    let text = 0;
    let numeric = 0;
    for (let r = bodyStart; r < rows.length; r++) {
      const cell = rows[r]?.[c];
      if (cellText(cell) !== null) text++;
      else if (cellNumber(cell) !== null) numeric++;
    }
    if (text >= 5 && text > numeric * 3) found.push(c);
  }
  return found.length > 0 ? found : [0];
}

/**
 * Read a block's side from the bookkeeping prefixes its own rows carry.
 * `TO ` marks debits, `BY ` marks credits — far more reliable than
 * position, which only holds for conventionally laid-out sheets.
 */
function detectSide(rows: Cell[][], labelCol: number, bodyStart: number, fallback: BlockSide): BlockSide {
  let to = 0;
  let by = 0;
  for (let r = bodyStart; r < rows.length; r++) {
    const t = cellText(rows[r]?.[labelCol]);
    if (!t) continue;
    if (/^to\s+/i.test(t)) to++;
    else if (/^by\s+/i.test(t)) by++;
  }
  if (to > by && to > 0) return "debit";
  if (by > to && by > 0) return "credit";
  return fallback;
}

const MAX_HEADER_SCAN_ROWS = 15;

/**
 * Introspect one sheet into the scope choices it offers. Returns null when
 * the sheet carries no dated period columns — a working sheet, a
 * depreciation register, an observations tab. The picker lists what this
 * returns; it never guesses on the operator's behalf.
 */
export function describeSheet(sheet: ParsedSheet): SheetScope | null {
  const rows = sheet.rows;
  const header = findHeaderRows(rows, MAX_HEADER_SCAN_ROWS);
  if (!header) return null;

  const headerRows =
    header.segmentRow === null ? [header.dateRow] : [header.segmentRow, header.dateRow];
  const bodyStart = header.dateRow + 1;
  const labelCols = findLabelColumns(rows, headerRows);
  const width = rows.reduce((w, r) => Math.max(w, r?.length ?? 0), 0);

  const dateRow = rows[header.dateRow] ?? [];
  const segmentRow = header.segmentRow === null ? [] : (rows[header.segmentRow] ?? []);

  const blocks: LabelBlock[] = [];
  for (let i = 0; i < labelCols.length; i++) {
    const labelCol = labelCols[i];
    if (labelCol === undefined) continue;
    const nextLabelCol = labelCols[i + 1] ?? width;

    const periodColumns: PeriodColumn[] = [];
    for (let c = labelCol + 1; c < nextLabelCol; c++) {
      const canonicalDate = parseHeaderDate(dateRow[c]);
      if (canonicalDate === null) continue;
      const segment = cellText(segmentRow[c]);
      const printedRaw = dateRow[c];
      const printedDate =
        typeof printedRaw === "string" ? printedRaw.trim() : formatHeaderDate(canonicalDate);
      periodColumns.push({
        columnIndex: c,
        // Compose the tiers, and render the date CANONICALLY so the two
        // sides of a T-format sheet produce the same label even when the
        // typed headers disagree (31.03.2026 vs 31.03.026).
        label: segment
          ? `${segment} · ${formatHeaderDate(canonicalDate)}`
          : formatHeaderDate(canonicalDate),
        segment,
        canonicalDate,
        printedDate,
      });
    }
    if (periodColumns.length === 0) continue;

    blocks.push({
      labelColumnIndex: labelCol,
      side: detectSide(rows, labelCol, bodyStart, i === 0 ? "debit" : "credit"),
      periodColumns,
    });
  }

  if (blocks.length === 0) return null;

  const dates = new Set<string>();
  const segments: (string | null)[] = [];
  let largest: number | null = null;
  for (const b of blocks) {
    for (const p of b.periodColumns) {
      if (p.canonicalDate) dates.add(p.canonicalDate);
      if (!segments.some((seg) => sameSegment(seg, p.segment))) {
        segments.push(p.segment);
      }
      for (let r = bodyStart; r < rows.length; r++) {
        const v = cellNumber(rows[r]?.[p.columnIndex]);
        if (v === null) continue;
        const abs = Math.abs(v);
        if (largest === null || abs > largest) largest = abs;
      }
    }
  }

  const candidateLineCount = countCandidateLines(rows, blocks, bodyStart);

  return {
    sheetName: sheet.name,
    headerRows,
    twoSided: blocks.length > 1,
    blocks,
    candidateLineCount,
    canonicalDates: [...dates].sort(),
    segments,
    unit: detectUnit(sheet, 6, largest),
    plausible: candidateLineCount >= MIN_PLAUSIBLE_LINES && dates.size > 0,
  };
}

/**
 * Below this a "sheet" is a working note, a register or an observations
 * tab, not a statement worth offering as a scope.
 */
const MIN_PLAUSIBLE_LINES = 3;

/** Describe every sheet that offers a dated scope. */
export function describeWorkbook(sheets: ParsedSheet[]): SheetScope[] {
  const out: SheetScope[] = [];
  for (const sheet of sheets) {
    const scope = describeSheet(sheet);
    if (scope) out.push(scope);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scoped extraction
// ---------------------------------------------------------------------------


function countCandidateLines(rows: Cell[][], blocks: LabelBlock[], bodyStart: number): number {
  let count = 0;
  for (const block of blocks) {
    for (let r = bodyStart; r < rows.length; r++) {
      const label = cellText(rows[r]?.[block.labelColumnIndex]);
      if (!label) continue;
      const carries = block.periodColumns.some(
        (p) => cellNumber(rows[r]?.[p.columnIndex]) !== null,
      );
      if (isStageable(classifyRow(label, carries).kind)) count++;
    }
  }
  return count;
}


const sameSegment = (a: string | null, b: string | null): boolean =>
  (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();

/** Resolve one requested (segment, date) to a column in this block. */
function matchColumn(block: LabelBlock, req: PeriodRequest): PeriodColumn | null {
  return (
    block.periodColumns.find(
      (p) => p.canonicalDate === req.canonicalDate && sameSegment(p.segment, req.segment),
    ) ?? null
  );
}

export type ScopedRow = {
  /** Label as printed. */
  rawLabel: string;
  /** Label with bookkeeping affixes removed — what gets stored. */
  sourceLabel: string;
  kind: RowKind;
  /** Why it was classified this way; shown in the excluded-lines list. */
  reason: string;
  side: BlockSide;
  /** Canonical section name from the heading above it, within this block. */
  section: string | null;
  /** One amount per requested period, IN RUPEES, aligned to `periods`. */
  amounts: (number | null)[];
  /** Sheet!Cell references, aligned to `periods`. */
  provenance: (string | null)[];
  rowIndex: number;
};

/**
 * A period is addressed by SEGMENT AND DATE, never by date alone: this
 * sheet carries `31.03.2026` three times per block — once for Dhaulana,
 * once for Greater Noida, once for the Total column. Requesting by date
 * alone would silently return the leftmost plant instead of the group.
 * Segment is a first-class dimension of scope (ADR-014).
 */
export type PeriodRequest = {
  /** Upper header tier, e.g. "Total" or "Dhaulana". Null = an unsegmented sheet. */
  segment: string | null;
  canonicalDate: string;
};

export type ScopedExtraction = {
  sheetName: string;
  /** The requested periods, in the order amounts are aligned to. */
  periods: PeriodRequest[];
  periodLabels: string[];
  unit: UnitBasis;
  rows: ScopedRow[];
};

const COLUMN_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function columnRef(index: number): string {
  if (index < 26) return COLUMN_LETTERS[index] ?? "?";
  const first = COLUMN_LETTERS[Math.floor(index / 26) - 1] ?? "?";
  const second = COLUMN_LETTERS[index % 26] ?? "?";
  return `${first}${second}`;
}

/**
 * Extract every row of a sheet under a chosen scope.
 *
 * Periods are requested as canonical ISO dates, so a column pair typed
 * `31.03.2026` on one side and `31.03.026` on the other resolves to the
 * same period in both blocks.
 *
 * THE SINGLE UNIT BOUNDARY: printed figures are multiplied to rupees here
 * and nowhere else. Every caller downstream works in rupees.
 *
 * Returns ALL rows with their classification, not just the stageable ones —
 * the caller stages `line` rows and shows the rest as excluded-with-reason,
 * so nothing is ever silently dropped.
 */
export function extractScopedRows(
  sheet: ParsedSheet,
  scope: SheetScope,
  requested: PeriodRequest[],
  /** Operator's unit override; defaults to what the sheet declared. */
  unitOverride?: UnitBasis,
): ScopedExtraction {
  const unit = unitOverride ?? scope.unit;
  const rows = sheet.rows;
  const bodyStart = Math.max(...scope.headerRows) + 1;
  const out: ScopedRow[] = [];
  const periodLabels: string[] = requested.map((req) =>
    req.segment
      ? `${req.segment} · ${formatHeaderDate(req.canonicalDate)}`
      : formatHeaderDate(req.canonicalDate),
  );

  for (const block of scope.blocks) {
    // Resolve this block's column for each requested period, by SEGMENT AND
    // DATE. Date-only matching would return Dhaulana's column when the
    // operator asked for Total.
    const columns = requested.map((req) => matchColumn(block, req));
    if (columns.every((c) => c === null)) continue;

    let section: string | null = null;

    for (let r = bodyStart; r < rows.length; r++) {
      const rawLabel = cellText(rows[r]?.[block.labelColumnIndex]);
      if (!rawLabel) continue;

      const rawAmounts = columns.map((col) =>
        col === null ? null : cellNumber(rows[r]?.[col.columnIndex]),
      );
      const carriesValue = rawAmounts.some((a) => a !== null);

      const classification = classifyRow(rawLabel, carriesValue);

      // A section heading sets context for the rows beneath it and
      // contributes its NAME only — its roll-up value is ignored.
      if (classification.kind === "section_heading") {
        section = classification.sectionName;
        continue;
      }

      out.push({
        rawLabel,
        sourceLabel: cleanSourceLabel(rawLabel),
        kind: classification.kind,
        reason: classification.reason,
        side: block.side,
        section,
        amounts: rawAmounts.map((a) =>
          a === null ? null : a * unit.multiplierToRupees,
        ),
        provenance: columns.map((col) =>
          col === null ? null : `${sheet.name}!${columnRef(col.columnIndex)}${r + 1}`,
        ),
        rowIndex: r,
      });
    }
  }

  return {
    sheetName: sheet.name,
    periods: requested,
    periodLabels,
    unit,
    rows: out,
  };
}

// ---------------------------------------------------------------------------
// Structural fingerprint
// ---------------------------------------------------------------------------

/**
 * A cheap structural signature of a workbook: sheet count, sheet names, and
 * each scoped sheet's header shape. Two monthly exports from the same Tally
 * template produce the same fingerprint even though every figure differs.
 *
 * NOTHING READS THIS YET. It exists so scope MEMORY is possible later — a
 * client uploading the same export every month should not meet the picker
 * every month, which is ADR-016's exception principle applied one level up.
 * Adding the column now is trivial; backfilling a fingerprint across
 * historical jobs after the fact is not.
 */
export type WorkbookFingerprint = {
  hash: string;
  sheetCount: number;
  sheetNames: string[];
  shape: string;
};

/** FNV-1a. Not a security hash — a stable structural identity. */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function fingerprintWorkbook(
  sheets: ParsedSheet[],
  scopes: SheetScope[],
): WorkbookFingerprint {
  const byName = new Map(scopes.map((s) => [s.sheetName, s]));
  const shape = sheets
    .map((sheet) => {
      const scope = byName.get(sheet.name);
      if (!scope) return `${sheet.name}:-`;
      const cols = scope.blocks.reduce((n, b) => n + b.periodColumns.length, 0);
      return `${sheet.name}:h${scope.headerRows.join(".")}/b${scope.blocks.length}/c${cols}`;
    })
    .join("|");
  return {
    hash: fnv1a(`${sheets.length}|${shape}`),
    sheetCount: sheets.length,
    sheetNames: sheets.map((s) => s.name),
    shape,
  };
}

// ---------------------------------------------------------------------------
// Auto-selection
// ---------------------------------------------------------------------------

export type ScopeChoice = {
  sheetName: string;
  periods: PeriodRequest[];
  /**
   * How this scope came to be. These are DIFFERENT FACTS and provenance
   * must tell them apart: asked about a figure six months on, "nobody chose
   * this, the system inferred it" and "the operator selected this on 12
   * September" point at different places to look.
   */
  source: "auto" | "operator";
};

export type AutoSelectResult =
  | { autoSelected: true; choice: ScopeChoice; because: string }
  | { autoSelected: false; because: string };

/**
 * Auto-select a scope ONLY where there is exactly one plausible reading, at
 * both levels: one plausible sheet, and one segment within it. Ambiguity is
 * precisely when inference is worth least — RPIL's projection sheet offers
 * Dhaulana, Greater Noida and Total, so it must NOT auto-select, and it
 * doesn't.
 *
 * This fills a field; it does not skip a step. The approve-to-process gate
 * still runs either way.
 */
export function autoSelectScope(scopes: SheetScope[]): AutoSelectResult {
  const plausible = scopes.filter((s) => s.plausible);
  if (plausible.length === 0) {
    return { autoSelected: false, because: "No sheet offers dated period columns." };
  }
  if (plausible.length > 1) {
    return {
      autoSelected: false,
      because: `${plausible.length} sheets could be the statement (${plausible
        .map((s) => s.sheetName)
        .join(", ")}).`,
    };
  }
  const sheet = plausible[0];
  if (!sheet) {
    return { autoSelected: false, because: "No sheet offers dated period columns." };
  }
  if (sheet.segments.length > 1) {
    return {
      autoSelected: false,
      because: `"${sheet.sheetName}" reports ${sheet.segments.length} units (${sheet.segments
        .map((seg) => seg ?? "unnamed")
        .join(", ")}) — which one is the statement is a decision.`,
    };
  }
  const segment = sheet.segments[0] ?? null;
  const periods = sheet.canonicalDates.map((canonicalDate) => ({
    segment,
    canonicalDate,
  }));
  return {
    autoSelected: true,
    choice: { sheetName: sheet.sheetName, periods, source: "auto" },
    because: `"${sheet.sheetName}" is the only sheet with dated columns, and it reports a single unit.`,
  };
}

/**
 * Validate an operator's choice against what the workbook actually offers.
 * A scope naming a sheet, segment or date that is not there is REFUSED, not
 * coerced to the nearest match — the same instinct that makes the
 * classifier trustworthy.
 */
/** Is this a unit basis we can convert from? Guards untrusted input. */
export function isUnitBasisName(value: unknown): value is UnitBasisName {
  return typeof value === "string" && (UNIT_BASES as readonly string[]).includes(value);
}

export function validateScopeChoice(
  scopes: SheetScope[],
  choice: ScopeChoice,
): { ok: true } | { ok: false; error: string } {
  const sheet = scopes.find((s) => s.sheetName === choice.sheetName);
  if (!sheet) {
    return { ok: false, error: `This workbook has no sheet named "${choice.sheetName}".` };
  }
  if (choice.periods.length === 0) {
    return { ok: false, error: "Choose at least one period column." };
  }
  const offered = sheet.blocks.flatMap((b) => b.periodColumns);
  for (const period of choice.periods) {
    const hit = offered.some(
      (p) =>
        p.canonicalDate === period.canonicalDate &&
        sameSegment(p.segment, period.segment),
    );
    if (!hit) {
      const label = period.segment
        ? `${period.segment} · ${formatHeaderDate(period.canonicalDate)}`
        : formatHeaderDate(period.canonicalDate);
      return {
        ok: false,
        error: `"${sheet.sheetName}" has no column for ${label}.`,
      };
    }
  }
  const seen = new Set<string>();
  for (const p of choice.periods) {
    const key = `${(p.segment ?? "").toLowerCase()}|${p.canonicalDate}`;
    if (seen.has(key)) {
      return { ok: false, error: "The same period column is selected twice." };
    }
    seen.add(key);
  }
  return { ok: true };
}
