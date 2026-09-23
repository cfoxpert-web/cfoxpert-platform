import type { DocumentKind } from "../documents/model";
import { classifyHead, applySignConvention } from "./head-classify";
import { isStageable } from "./row-class";
import { derivePeriod } from "./period";
import type { ParsedSheet } from "./parse-spreadsheet";
import type { CandidateLine, ExtractionOutput } from "./types";
import {
  describeSheet,
  extractScopedRows,
  withUnitBasis,
  type ScopeChoice,
  type UnitBasisName,
} from "./workbook";

/**
 * A4-d-2 — extraction under a RESOLVED scope: one sheet, one segment, the
 * chosen period columns. This is what replaces `sheetsToLines()`'s flatMap
 * over every sheet in the workbook, which is what produced lines from four
 * sheets, two plants and three periods in a single flat list all publishing
 * to one period label.
 *
 * Jobs with no scope (PDFs, CSVs, and every job that predates A4-d-2) fall
 * through to the legacy path untouched.
 */
export function extractUnderScope(
  sheets: ParsedSheet[],
  scope: ScopeChoice,
  kind: DocumentKind,
  /** Job-level unit basis; falls back to what the sheet declared. */
  unitBasis?: UnitBasisName,
): ExtractionOutput | { error: string } {
  const sheet = sheets.find((s) => s.name === scope.sheetName);
  if (!sheet) {
    return {
      error: `The chosen sheet "${scope.sheetName}" is not in this workbook. Re-read the document and choose a scope again.`,
    };
  }
  const described = describeSheet(sheet);
  if (!described) {
    return {
      error: `Sheet "${scope.sheetName}" no longer offers dated period columns.`,
    };
  }

  const unit = unitBasis ? withUnitBasis(described.unit, unitBasis) : described.unit;

  // One proposal per requested column. The period is a property of the
  // COLUMN, so it is resolved once here and stamped on every line from it.
  const periods = scope.periods.map((p) => derivePeriod(p.canonicalDate));
  const extraction = extractScopedRows(sheet, described, scope.periods, unit);

  const lines: CandidateLine[] = [];
  for (const row of extraction.rows) {
    if (!isStageable(row.kind)) continue;
    if (!row.amounts.some((a) => a !== null)) continue;

    const head = classifyHead({
      label: row.sourceLabel,
      section: row.section,
      side: row.side,
    });

    // One staged line per (row, period): the review screen publishes into a
    // period, so a row spanning two periods is two staged figures.
    for (const [i, raw] of row.amounts.entries()) {
      if (raw === null) continue;
      const period = scope.periods[i];
      if (!period) continue;
      const { amount } = applySignConvention({
        amount: raw,
        head: head.head,
        side: row.side,
        label: row.sourceLabel,
      });
      const derived = periods[i];
      lines.push({
        statement: kind === "other" ? "pnl" : kind,
        sourceLabel: row.sourceLabel,
        amount,
        // Segment-free: "FY 2026-27", not "Total · 31.03.2027".
        periodLabel: derived?.label ?? null,
        periodStart: derived?.start ?? null,
        periodEnd: derived?.end ?? null,
        segment: period.segment,
        provenance: row.provenance[i] ?? extraction.sheetName,
        // The head matcher proposes a PROJECTION head, not a kpi_definitions
        // key. Mapping memory and the analyst still decide the KPI, so the
        // proposal stays null here and the head rides in the note.
        proposedKpiKey: null,
        // The classifier's answer, carried through instead of discarded.
        proposedHead: head.head,
        confidence: 1,
        mappingConfidence: null,
      });
    }
  }

  const first = scope.periods[0];
  const last = scope.periods[scope.periods.length - 1];
  const notes = [
    periods.length > 1
      ? `${periods.length} periods staged separately: ${periods.map((p) => p.label).join(", ")}. Each publishes into its own period.`
      : null,
    `Scoped to "${scope.sheetName}"${first?.segment ? ` · ${first.segment}` : ""} (${scope.source === "auto" ? "auto-selected" : "operator-selected"}).`,
    `Amounts read in ${unit.basis}${unit.multiplierToRupees === 1 ? "" : ` × ${unit.multiplierToRupees.toLocaleString("en-IN")}`} — ${unit.detectedFrom}.`,
  ].filter((n): n is string => n !== null);

  return {
    method: "parser",
    lines,
    periodLabel: extraction.periodLabels[extraction.periodLabels.length - 1] ?? null,
    periodStart: first ? first.canonicalDate : null,
    periodEnd: last ? last.canonicalDate : null,
    notes,
  };
}
