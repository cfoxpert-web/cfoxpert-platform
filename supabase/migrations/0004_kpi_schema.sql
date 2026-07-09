-- ============================================================================
-- Migration 0004: KPI schema
-- Milestone 7 (part 2 of 3) of the frozen Platform Roadmap v1.0.
--
--   kpi_definitions — KPIs as data, not code (ADR-004).
--   kpi_periods     — a reporting period for one organization.
--   kpi_values      — INSERT-ONLY recorded values (ADR-006). A correction is
--                     a new row; "current" = latest per (period, definition),
--                     exposed via the kpi_current_values view so no consumer
--                     ever re-implements that rule.
-- ============================================================================

create type public.kpi_category as enum
  ('revenue', 'profitability', 'cash_flow', 'working_capital', 'governance', 'other');

create type public.period_type as enum ('monthly', 'quarterly', 'yearly');

create type public.period_status as enum ('draft', 'finalized');

-- ----------------------------------------------------------------------------
-- kpi_definitions (ADR-004): adding a KPI is a data change, not a deploy.
-- ----------------------------------------------------------------------------
create table public.kpi_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  unit text not null,                          -- '%', 'days', 'INR', 'ratio', ...
  category public.kpi_category not null default 'other',
  ideal_min numeric,                            -- benchmark band (ADR-008 classification
  ideal_max numeric,                            -- gives these meaning per industry later)
  higher_is_better boolean not null default true,
  sort_order int not null default 100,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create trigger kpi_definitions_set_updated_at
  before update on public.kpi_definitions
  for each row execute function public.set_updated_at();

-- Definitions are not sensitive: any authenticated user may read active ones.
alter table public.kpi_definitions enable row level security;
create policy kpi_definitions_read_authenticated
  on public.kpi_definitions for select
  using (auth.uid() is not null and active);

-- Seed the starting library (docs/KPI Library.md — from the FY26 board report).
insert into public.kpi_definitions (key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order) values
  ('revenue', 'Revenue', 'INR', 'revenue', null, null, true, 10),
  ('ebitda_margin', 'EBITDA Margin', '%', 'profitability', 15, null, true, 20),
  ('cash_cycle_days', 'Cash Cycle', 'days', 'cash_flow', null, 45, false, 30),
  ('working_capital', 'Working Capital', 'INR', 'working_capital', null, null, true, 40);

-- ----------------------------------------------------------------------------
-- kpi_periods
-- ----------------------------------------------------------------------------
create table public.kpi_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  period_label text not null,                  -- 'FY26', '2026-06', 'Q1 FY27'
  period_type public.period_type not null,
  status public.period_status not null default 'draft',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create unique index kpi_periods_live_unique
  on public.kpi_periods (organization_id, period_label)
  where deleted_at is null;

create trigger kpi_periods_set_updated_at
  before update on public.kpi_periods
  for each row execute function public.set_updated_at();

alter table public.kpi_periods enable row level security;
create policy kpi_periods_select_members
  on public.kpi_periods for select
  using (deleted_at is null and public.is_org_member(organization_id));
-- Writes: service-role only until the KPI-entry feature (Milestone 10) defines them.

-- ----------------------------------------------------------------------------
-- kpi_values — INSERT-ONLY (ADR-006)
-- ----------------------------------------------------------------------------
create table public.kpi_values (
  id uuid primary key default gen_random_uuid(),
  kpi_period_id uuid not null references public.kpi_periods (id),
  kpi_definition_id uuid not null references public.kpi_definitions (id),
  value numeric not null,
  note text,                                    -- optional context, e.g. reason for a correction
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
  -- No updated_*/deleted_at: this table is insert-only by design.
);

create index kpi_values_lookup_idx
  on public.kpi_values (kpi_period_id, kpi_definition_id, created_at desc);

create trigger kpi_values_insert_only
  before update or delete on public.kpi_values
  for each row execute function public.reject_mutation();

alter table public.kpi_values enable row level security;
create policy kpi_values_select_members
  on public.kpi_values for select
  using (
    exists (
      select 1 from public.kpi_periods p
      where p.id = kpi_period_id
        and p.deleted_at is null
        and public.is_org_member(p.organization_id)
    )
  );

-- ----------------------------------------------------------------------------
-- kpi_current_values — THE canonical "latest value wins" rule.
-- Consumers (KPI Engine, dashboard, board packs) read this view; nobody
-- re-implements the recency logic. security_invoker so the underlying RLS
-- of kpi_values applies to whoever queries the view.
-- ----------------------------------------------------------------------------
create view public.kpi_current_values
with (security_invoker = true)
as
select distinct on (v.kpi_period_id, v.kpi_definition_id)
  v.kpi_period_id,
  v.kpi_definition_id,
  v.value,
  v.note,
  v.created_at as recorded_at,
  v.created_by as recorded_by
from public.kpi_values v
order by v.kpi_period_id, v.kpi_definition_id, v.created_at desc;

comment on table public.kpi_values is
  'ADR-006: insert-only. Corrections are new rows. Current value = kpi_current_values view; never re-implement recency logic.';
comment on view public.kpi_current_values is
  'Canonical latest-value-per-(period, definition). security_invoker: underlying RLS applies to the querying user.';
