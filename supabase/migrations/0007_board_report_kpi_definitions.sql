-- ============================================================================
-- Migration 0007: board-report KPI definitions
--
-- Replaces the four illustrative KPI definitions from migration 0004 with the
-- eight line items a CFOXPERT board report actually surfaces (Total Revenue,
-- Gross Profit, Other Income, Net Profit, Trade Receivables, Trade Payables,
-- Cash & Bank, Inventory).
--
-- KPI definitions are DATA (ADR-004): this is a data change, not a schema
-- change. The three definitions no longer displayed are DEACTIVATED, not
-- deleted — kpi_values already recorded against them stay valid and historic
-- evaluation still resolves them (score-engine skips inactive definitions on
-- read via the `active` RLS predicate).
--
-- The dashboard KPI-card mapper (lib/dashboard/map-kpis.ts) keys off exactly
-- these `key` values; keep the two in lockstep.
-- ============================================================================

-- 1. Rename the retained definition and lock its display order.
update public.kpi_definitions
  set label = 'Total Revenue', sort_order = 10, active = true
  where key = 'revenue';

-- 2. Deactivate the three illustrative definitions no longer shown.
update public.kpi_definitions
  set active = false
  where key in ('ebitda_margin', 'cash_cycle_days', 'working_capital');

-- 3. Add the seven board-report line items (all INR magnitudes; no benchmark
--    band — these are reported values, not scored-against-target metrics).
insert into public.kpi_definitions
  (key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order, active)
values
  ('gross_profit',      'Gross Profit',      'INR', 'profitability',   null, null, true, 20, true),
  ('other_income',      'Other Income',      'INR', 'other',           null, null, true, 30, true),
  ('net_profit',        'Net Profit',        'INR', 'profitability',   null, null, true, 40, true),
  ('trade_receivables', 'Trade Receivables', 'INR', 'working_capital', null, null, true, 50, true),
  ('trade_payables',    'Trade Payables',    'INR', 'working_capital', null, null, true, 60, true),
  ('cash_bank',         'Cash & Bank',       'INR', 'cash_flow',       null, null, true, 70, true),
  ('inventory',         'Inventory',         'INR', 'working_capital', null, null, true, 80, true)
on conflict (key) do update
  set label = excluded.label,
      unit = excluded.unit,
      category = excluded.category,
      sort_order = excluded.sort_order,
      active = true;
