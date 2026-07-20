-- ============================================================================
-- Migration 0014: validation results on ingestion jobs (Amendment A4-b)
--
-- The extraction service runs deterministic gates (TB debits = credits,
-- BS equation, P&L recompute, stated-total checks) BEFORE a job reaches
-- needs_review. Results are stored on the job so the A4-c review UI must
-- show them — a gate failure flags the job, it never silently stages
-- (ADR-010). Shape (interpreted in application code only, never SQL):
--   [{ "gate": "tb_balance", "status": "pass|fail|skipped", "detail": "…" }]
-- ============================================================================

alter table public.ingestion_jobs
  add column validation jsonb;

comment on column public.ingestion_jobs.validation is
  'A4-b gate results: array of {gate, status: pass|fail|skipped, detail}. Written by the extraction service; displayed by the A4-c review UI. App-code interpretation only.';
