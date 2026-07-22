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
  periodLabel: string | null;
  segment: string | null;
  /** Where in the source this came from ("Sheet1!B14", "page 3"). */
  provenance: string;
  /** Proposed kpi_definitions.key — null when unmapped (analyst decides). */
  proposedKpiKey: string | null;
  /** 0..1; 1.0 = deterministic (parser cell or confirmed mapping). */
  confidence: number | null;
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
