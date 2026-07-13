-- ============================================================================
-- Migration 0011: health metric bands (Amendment A2)
--
-- The client Business Health Score is computed from financial evidence.
-- WHICH metrics feed WHICH driver, and what counts as healthy, is DATA
-- (ADR-004 spirit): tuning a threshold is a row update, not a deploy.
--
-- Scoring itself is pure code (lib/health-check/financial-score.ts): metric
-- position against its band -> bucket score (favorable 90 / within 75 /
-- unfavorable breach 40), weighted into driver scores, reweighted across
-- available drivers. Governance & Technology are NOT here — they are not in
-- the numbers and stay qualitative (analyst/questionnaire input, later).
-- ============================================================================

create table public.health_metric_bands (
  id uuid primary key default gen_random_uuid(),
  driver_key text not null check (driver_key in
    ('financial', 'operational', 'growth', 'governance', 'technology', 'capital')),
  metric_key text not null unique check (metric_key ~ '^[a-z][a-z0-9_]*$'),
  label text not null,
  unit text not null,                    -- '%', 'days', 'x'
  ideal_min numeric,
  ideal_max numeric,
  higher_is_better boolean not null default true,
  weight numeric not null default 1 check (weight > 0),
  sort_order int not null default 100,
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create trigger health_metric_bands_set_updated_at
  before update on public.health_metric_bands
  for each row execute function public.set_updated_at();

-- Bands are not sensitive: any authenticated user may read active ones
-- (same posture as kpi_definitions).
alter table public.health_metric_bands enable row level security;
create policy health_metric_bands_read_authenticated
  on public.health_metric_bands for select
  using (auth.uid() is not null and active);

-- Default bands (Indian SME manufacturing starting points; tune as data).
insert into public.health_metric_bands
  (driver_key, metric_key, label, unit, ideal_min, ideal_max, higher_is_better, weight, sort_order)
values
  ('financial',   'gp_margin',              'Gross Profit Margin',                 '%',    15,   null, true,  1, 10),
  ('financial',   'np_margin',              'Net Profit Margin',                   '%',    5,    null, true,  1, 20),
  ('financial',   'ccc',                    'Cash Conversion Cycle',               'days', null, 60,   false, 1, 30),
  ('financial',   'borrowings_to_revenue',  'Borrowings / Revenue (annualized)',   'x',    null, 0.30, false, 1, 40),
  ('operational', 'indirect_expense_ratio', 'Indirect Expenses / Revenue',         '%',    null, 15,   false, 1, 50),
  ('operational', 'asset_turnover',         'Asset Turnover (annualized)',         'x',    2,    null, true,  1, 60),
  ('growth',      'revenue_growth',         'Revenue Growth (vs previous period)', '%',    10,   null, true,  1, 70),
  ('growth',      'segment_concentration',  'Largest Unit Revenue Share',          '%',    null, 70,   false, 1, 80);

comment on table public.health_metric_bands is
  'A2: metric -> driver map + healthy bands for the financials-derived client health score. Bands are data; scoring logic is lib/health-check/financial-score.ts.';
