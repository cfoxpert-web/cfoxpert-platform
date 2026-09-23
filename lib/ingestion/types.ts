import type { DocumentKind } from "../documents/model";

/**
 * Amendment A4-b — shared extraction types. Everything here is a PROPOSAL
 * bound for the extracted_lines staging table; nothing in lib/ingestion
 * can write kpi_values (ADR-010 — that verb ships with A4-c's
 * staff-confirmed publish action, and only there).
 */

export type CandidateLine = {
  statement: DocumentKind;
  /** The label exactly as printed in the source. */
  sourceLabel: string;
  /** Signed amount. Trial balance convention: debit positive, credit negative. */
  amount: number | null;
  /**
   * Period label for THIS line. Carries no segment — segment has its own
   * column, and leaking it into the period name produced "Total ·
   * 31.03.2026" as a period, which also contradicted its own date range.
   */
  periodLabel: string | null;
  /**
   * This line's own period, derived from the column it came from. Written
   * per line, NOT per scope: a two-column scope previously stamped the
   * whole span (2026-03-31 → 2027-03-31) onto every row, so publishing
   * merged both years into one period.
   */
  periodStart: string | null;
  periodEnd: string | null;
  segment: string | null;
  /** Where in the source this came from ("Sheet1!B14", "page 3"). */
  provenance: string;
  /** Proposed kpi_definitions.key — null when unmapped (analyst decides). */
  proposedKpiKey: string | null;
  /**
   * Projection head the classifier assigned, or null when no rule matched.
   * NOT a kpi_definitions key — the head → KPI roll-up lands in A7-a
   * (ADR-018). Until then this is what lets the review screen say "head
   * assigned, mapping pending" instead of the flatly misleading "not
   * mapped" for a line the classifier read correctly.
   */
  proposedHead: string | null;
  /**
   * 0..1 confidence in the AMOUNT — that the figure was read correctly
   * from the source. 1.0 for a parsed cell: no model was involved.
   */
  confidence: number | null;
  /**
   * 0..1 confidence in the KPI MAPPING. NULL when nothing is mapped —
   * which is why a review screen can never again show "100%" beside
   * "— not mapped —". A confirmed account_mappings hit is 1.0.
   */
  mappingConfidence: number | null;
};

export type ExtractionOutput = {
  method: "parser" | "claude";
  lines: CandidateLine[];
  periodLabel: string | null;
  /** ISO dates when the document states its period. */
  periodStart: string | null;
  periodEnd: string | null;
  /** Extractor remarks worth surfacing to the analyst (unit assumptions…). */
  notes: string[];
};

export type GateStatus = "pass" | "fail" | "skipped";

export type GateResult = {
  gate: string;
  status: GateStatus;
  detail: string;
};

/** A KPI the extractor may propose (never invent) — from kpi_definitions. */
export type KpiCatalogueEntry = { key: string; label: string };
