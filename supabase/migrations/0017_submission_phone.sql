-- ============================================================================
-- Migration 0017: capture the lead's phone number
--
-- The health-check contact form has always ASKED for a mobile number, but
-- the submissions table never had a column for it — the most actionable
-- contact channel for an Indian SME lead was silently dropped at insert.
-- Found during the lead-workflow build (2026-07-27).
-- ============================================================================

alter table public.health_check_submissions
  add column submitted_phone text;

comment on column public.health_check_submissions.submitted_phone is
  'Lead mobile number from the health-check contact form. Nullable: rows predating migration 0017 never stored it.';
