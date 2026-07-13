-- ============================================================================
-- Migration 0009: KPI segments + statement-line definitions
-- Amendments A3-data / A5 (docs/Integration Roadmap.md).
--
-- 1. `segment` dimension on kpi_values. RPIL's branches (Greater Noida /
--    Dhaulana / Telangana) are units of ONE legal entity — depreciation,
--    finance cost and tax are determined company-wide — so they are a
--    dimension of the client's data, NOT child organizations (ADR-008's
--    hierarchy stays reserved for real group/subsidiary structures).
--    segment = null  → consolidated / whole-organization value (every
--    pre-existing row is already correct under this rule).
--    segment = text  → unit-level value. Free text in v1; a catalog table
--    can formalize it if segment lists grow.
--
-- 2. kpi_current_values gains segment in its latest-value rule. Consumers
--    of the GROUP figures filter `segment is null` (lib/kpi/queries.ts).
--
-- 3. Eight statement-line KPI definitions for the future P&L / Balance
--    Sheet tabs (A3). Ratios (GP%, DSO, current ratio, ...) are deliberately
--    NOT definitions: they are computed from these primitives at read time
--    through the KPI Engine — storing them would duplicate the math and
--    violate the single-computation-path rule.
-- ============================================================================

-- 1. Segment dimension
alter table public.kpi_values
  add column segment text;

comment on column public.kpi_values.segment is
  'Unit/branch dimension. NULL = consolidated (whole organization). Free text v1; branches are a dimension, not child orgs.';

drop index if exists public.kpi_values_lookup_idx;
create index kpi_values_lookup_idx
  on public.kpi_values (kpi_period_id, kpi_definition_id, segment, created_at desc);

-- 2. Canonical view: latest value per (period, definition, segment).
--    Column list only appends (create or replace requirement); RLS of
--    kpi_values still applies via security_invoker.
create or replace view public.kpi_current_values
with (security_invoker = true)
as
select distinct on (v.kpi_period_id, v.kpi_definition_id, v.segment)
  v.kpi_period_id,
  v.kpi_definition_id,
  v.value,
  v.note,
  v.created_at as recorded_at,
  v.created_by as recorded_by,
  v.segment
from public.kpi_values v
order by v.kpi_period_id, v.kpi_definition_id, v.segment, v.created_at desc;

comment on view public.kpi_current_values is
  'Canonical latest-value-per-(period, definition, segment). NULL segment = consolidated. security_invoker: underlying RLS applies.';

-- 3. Statement-line definitions (global, client-agnostic; ADR-004).
--    sort_order 90+ keeps them off the current 8-card dashboard row.
insert into public.kpi_definitions
  (key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order, active)
values
  ('fixed_assets',         'Fixed Assets',          'INR', 'other',           null, null, true,  90,  true),
  ('secured_borrowings',   'Secured Borrowings',    'INR', 'other',           null, null, false, 100, true),
  ('unsecured_borrowings', 'Unsecured Borrowings',  'INR', 'other',           null, null, false, 110, true),
  ('indirect_expenses',    'Indirect Expenses',     'INR', 'profitability',   null, null, false, 120, true),
  ('depreciation',         'Depreciation',          'INR', 'profitability',   null, null, false, 130, true),
  ('finance_cost',         'Finance Cost',          'INR', 'profitability',   null, null, false, 140, true),
  ('pbt',                  'Profit Before Tax',     'INR', 'profitability',   null, null, true,  150, true),
  ('tax_expense',          'Tax Expense',           'INR', 'profitability',   null, null, false, 160, true)
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, category = excluded.category,
      sort_order = excluded.sort_order, active = true;
