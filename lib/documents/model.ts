/**
 * Amendment A4 — shared document/ingestion vocabulary. Non-"use client",
 * non-"use server": both the server actions and the UI import from here
 * (same reasoning as report/tab-defs.ts — values crossing the module
 * boundary must live in a plain shared module).
 */

export const DOCUMENT_KINDS = [
  { key: "trial_balance", label: "Trial Balance" },
  { key: "pnl", label: "Profit & Loss" },
  { key: "balance_sheet", label: "Balance Sheet" },
  { key: "stock_statement", label: "Stock Statement" },
  { key: "other", label: "Other" },
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]["key"];

export function isDocumentKind(value: string): value is DocumentKind {
  return DOCUMENT_KINDS.some((k) => k.key === value);
}

/**
 * Pipeline stages (ADR-010) with the member-facing label — clients see the
 * coarse state only; analyst notes stay in the staff-only event history.
 */
export const INGESTION_STAGES = {
  received: "Awaiting review",
  approved: "Queued for processing",
  extracting: "Processing",
  needs_review: "Being verified",
  published: "Published to report",
  rejected: "Rejected",
  failed: "Processing failed",
} as const;

export type IngestionStage = keyof typeof INGESTION_STAGES;

export function stageLabel(stage: string): string {
  return stage in INGESTION_STAGES
    ? INGESTION_STAGES[stage as IngestionStage]
    : stage;
}

/** Accepted upload types (v1: spreadsheets + PDFs; scans arrive as PDF). */
export const ACCEPTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "text/csv": ".csv",
};

export const ACCEPT_ATTRIBUTE = ".pdf,.xlsx,.xls,.csv";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // keep next.config.ts limit above this
