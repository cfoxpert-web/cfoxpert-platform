-- ============================================================================
-- Migration 0008: dated KPI periods (Amendment A1 — flexible comparison)
--
-- Adds real start/end dates to kpi_periods so the comparison resolver can
-- *find* a period by relationship ("same month last year", "prior quarter")
-- instead of only "the next one created". See docs/Integration Roadmap.md
-- Amendment A1 and lib/kpi/period-comparison.ts.
--
-- Nullable: existing/legacy rows may predate this; the resolver falls back
-- gracefully when a date is absent. New periods should always set them.
-- ============================================================================

alter table public.kpi_periods
  add column period_start date,
  add column period_end date;

-- Date-based comparator lookup: (org, type, start).
create index kpi_periods_org_type_start_idx
  on public.kpi_periods (organization_id, period_type, period_start)
  where deleted_at is null;

-- Backfill the seeded RPIL annual periods (Indian fiscal year: Apr–Mar).
update public.kpi_periods
  set period_start = date '2024-04-01', period_end = date '2025-03-31'
  where period_label = 'FY25' and period_start is null;

update public.kpi_periods
  set period_start = date '2025-04-01', period_end = date '2026-03-31'
  where period_label = 'FY26' and period_start is null;

comment on column public.kpi_periods.period_start is
  'Inclusive start date of the reporting period. Drives relationship-based comparison (MoM/QoQ/YoY) in lib/kpi/period-comparison.ts.';
comment on column public.kpi_periods.period_end is
  'Inclusive end date of the reporting period.';
