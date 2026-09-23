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
  awaiting_scope: "Needs a scope decision",
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

/**
 * Stages where the analyst's action is "run it" — the Process/Retry button.
 * Moved here from document-list.tsx so it sits beside the reviewable rule
 * and the two can be checked for completeness together.
 */
export const PROCESSABLE_STAGES: ReadonlySet<string> = new Set([
  "received",
  "approved",
  "failed",
]);

/** Work is under way; the analyst waits rather than acts. */
export const IN_FLIGHT_STAGES: ReadonlySet<string> = new Set(["extracting"]);

/** The job is finished, one way or the other. */
export const TERMINAL_STAGES: ReadonlySet<string> = new Set([
  "published",
  "rejected",
]);

/**
 * Stages that have something for an analyst to DO on the review screen.
 *
 * A4-d-2 introduced `awaiting_scope` and the picker that resolves it, but
 * both action cells still tested `stage === "needs_review"` as a literal.
 * The result: a parked job appeared in the queue and on the documents page
 * with a badge, no Review link, and no Process button — visible, correct,
 * and completely unreachable. The picker existed and nothing routed to it.
 *
 * The rule lives here, once, so the two call sites cannot drift again.
 */
export function isReviewableStage(stage: string | null | undefined): boolean {
  return stage === "needs_review" || stage === "awaiting_scope";
}

/** What the analyst is being asked to do — the two stages differ. */
export function reviewActionLabel(stage: string | null | undefined): string {
  return stage === "awaiting_scope" ? "Choose scope" : "Review";
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

/** Private bucket holding document bytes — service-role access only (0013). */
export const STORAGE_BUCKET = "client-documents";
