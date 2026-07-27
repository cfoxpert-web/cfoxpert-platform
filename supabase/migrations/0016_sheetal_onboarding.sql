-- ============================================================================
-- Migration 0016: onboard Sheetal Mercantile (Private) Limited — 2nd client
--
-- Mirrors RPIL's onboarding exactly (org row + dated periods + insert-only
-- kpi_values with provenance notes; see migration 0010 for the precedent).
-- Source: Sheetal_Board_MIS_Q1_FY2026-27.html embedded data object
-- (Board MIS Report — Q1 F.Y. 2026-27, 1 Apr – 30 Jun 2026).
--
-- BASIS (carried in every P&L note): interim management accounts on the
-- trading basis; Net Profit BEFORE tax and BEFORE year-end depreciation.
-- Figures are stated in ₹ crore in the source; stored here in rupees.
-- Internal consistency verified before seeding:
--   Q1  GP 14.88 = 57.66 − 36.57 (materials) − 6.21 (direct)   ✓
--   Q1  NP  8.98 = 14.88 + 1.37 (OI) − 7.27 (indirect)          ✓
--   FY26 NP 19.24 = 45.70 + 5.26 − 31.72                        ✓
--   Borrowings 30-Jun 101.35 = OD 32.77 + secured 61.69 + unsec 6.90 ✓
--
-- IDEMPOTENT: skips if Sheetal's Q1 FY27 already exists. Touches NOTHING
-- belonging to any other organization. The client USER is deliberately not
-- created here — Supabase dashboard invite (user sets own password), then
-- one membership insert; no credential ever exists in the repo (guardrail).
--
-- created_at ordering: Q1 FY27 is created LAST so it is Sheetal's default
-- dashboard period (latest created_at wins) — their current report.
-- ============================================================================

do $$
declare
  v_org uuid;
  v_now timestamptz := now();
  v_fy26 uuid; v_apr uuid; v_may uuid; v_jun uuid; v_q1 uuid;
  d_rev uuid; d_gp uuid; d_oi uuid; d_ie uuid; d_np uuid; d_pbt uuid;
  d_fin uuid; d_recv uuid; d_pay uuid; d_cash uuid; d_inv uuid;
  d_fa uuid; d_sec uuid; d_unsec uuid;
  basis text := 'Sheetal Board MIS Q1 FY2026-27 (trading basis; ₹ crore converted to rupees)';
begin
  -- ---- Organization (create once; classification per ADR-008).
  select id into v_org
  from public.organizations
  where name = 'Sheetal Mercantile (Private) Limited' and deleted_at is null;

  if v_org is null then
    insert into public.organizations
      (name, plan_tier, industry, sector, revenue_band)
    values
      ('Sheetal Mercantile (Private) Limited', 'standard',
       'Manufacturing', 'Flexible Packaging & Printing', '₹100Cr+')
    returning id into v_org;
  end if;

  -- ---- Idempotency guard.
  if exists (select 1 from public.kpi_periods
             where organization_id = v_org and period_label = 'Q1 FY27'
               and deleted_at is null) then
    raise notice '0016: Sheetal Q1 FY27 already exists — seed skipped.';
    return;
  end if;

  -- ---- Definition ids.
  select id into d_rev   from public.kpi_definitions where key = 'revenue';
  select id into d_gp    from public.kpi_definitions where key = 'gross_profit';
  select id into d_oi    from public.kpi_definitions where key = 'other_income';
  select id into d_ie    from public.kpi_definitions where key = 'indirect_expenses';
  select id into d_np    from public.kpi_definitions where key = 'net_profit';
  select id into d_pbt   from public.kpi_definitions where key = 'pbt';
  select id into d_fin   from public.kpi_definitions where key = 'finance_cost';
  select id into d_recv  from public.kpi_definitions where key = 'trade_receivables';
  select id into d_pay   from public.kpi_definitions where key = 'trade_payables';
  select id into d_cash  from public.kpi_definitions where key = 'cash_bank';
  select id into d_inv   from public.kpi_definitions where key = 'inventory';
  select id into d_fa    from public.kpi_definitions where key = 'fixed_assets';
  select id into d_sec   from public.kpi_definitions where key = 'secured_borrowings';
  select id into d_unsec from public.kpi_definitions where key = 'unsecured_borrowings';

  -- ---- Periods (Q1 FY27 last → Sheetal's default period).
  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at)
  values (v_org, 'FY26', 'yearly', 'finalized', date '2025-04-01', date '2026-03-31', v_now - interval '40 seconds', v_now - interval '40 seconds')
  returning id into v_fy26;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at)
  values (v_org, 'Apr 2026', 'monthly', 'draft', date '2026-04-01', date '2026-04-30', v_now - interval '30 seconds', v_now - interval '30 seconds')
  returning id into v_apr;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at)
  values (v_org, 'May 2026', 'monthly', 'draft', date '2026-05-01', date '2026-05-31', v_now - interval '20 seconds', v_now - interval '20 seconds')
  returning id into v_may;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at)
  values (v_org, 'Jun 2026', 'monthly', 'draft', date '2026-06-01', date '2026-06-30', v_now - interval '10 seconds', v_now - interval '10 seconds')
  returning id into v_jun;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at)
  values (v_org, 'Q1 FY27', 'quarterly', 'draft', date '2026-04-01', date '2026-06-30', v_now, v_now)
  returning id into v_q1;

  -- ---- FY2025-26: full-year P&L + 31-Mar-2026 balance sheet.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note) values
    (v_fy26, d_rev,   null, 1719000000.00, 'FY2025-26 turnover — ' || basis),
    (v_fy26, d_gp,    null,  457000000.00, 'FY2025-26 gross profit — ' || basis),
    (v_fy26, d_oi,    null,   52600000.00, 'FY2025-26 other income — ' || basis),
    (v_fy26, d_ie,    null,  317200000.00, 'FY2025-26 indirect expenses — ' || basis),
    (v_fy26, d_np,    null,  192400000.00, 'FY2025-26 profit BEFORE TAX and year-end depreciation — ' || basis),
    (v_fy26, d_pbt,   null,  192400000.00, 'FY2025-26 PBT — ' || basis),
    (v_fy26, d_recv,  null,   81200000.00, 'Sundry debtors at 31-Mar-2026 — ' || basis),
    (v_fy26, d_pay,   null,   84600000.00, 'Sundry creditors at 31-Mar-2026 — ' || basis),
    (v_fy26, d_cash,  null,     700000.00, 'Bank & cash at 31-Mar-2026 — ' || basis),
    (v_fy26, d_inv,   null,  231900000.00, 'Closing stock at 31-Mar-2026 — ' || basis),
    (v_fy26, d_fa,    null,  865400000.00, 'Fixed assets at 31-Mar-2026 — ' || basis),
    (v_fy26, d_sec,   null,  706800000.00, 'Secured at 31-Mar-2026: OD/CC 21.50Cr + term/PCFC/vehicle 49.18Cr — ' || basis),
    (v_fy26, d_unsec, null,   69200000.00, 'Unsecured loans at 31-Mar-2026 — ' || basis);

  -- ---- Monthly P&L (Apr–Jun 2026) + month-end stock where stated.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note) values
    (v_apr, d_rev, null,  124800000.00, 'Apr 2026 — ' || basis),
    (v_apr, d_gp,  null,    3000000.00, 'Apr 2026 — ' || basis),
    (v_apr, d_oi,  null,    1100000.00, 'Apr 2026 — ' || basis),
    (v_apr, d_ie,  null,   19900000.00, 'Apr 2026 — ' || basis),
    (v_apr, d_np,  null,  -15900000.00, 'Apr 2026 loss before tax & year-end depreciation — ' || basis),
    (v_may, d_rev, null,  211100000.00, 'May 2026 — ' || basis),
    (v_may, d_gp,  null,   50000000.00, 'May 2026 — ' || basis),
    (v_may, d_oi,  null,    6000000.00, 'May 2026 — ' || basis),
    (v_may, d_ie,  null,   23800000.00, 'May 2026 — ' || basis),
    (v_may, d_np,  null,   32200000.00, 'May 2026 profit before tax & year-end depreciation — ' || basis),
    (v_may, d_inv, null,  289100000.00, 'Stock at 31-May-2026 — ' || basis),
    (v_jun, d_rev, null,  240800000.00, 'Jun 2026 — ' || basis),
    (v_jun, d_gp,  null,   95900000.00, 'Jun 2026 — ' || basis),
    (v_jun, d_oi,  null,    6600000.00, 'Jun 2026 — ' || basis),
    (v_jun, d_ie,  null,   28900000.00, 'Jun 2026 — ' || basis),
    (v_jun, d_np,  null,   73600000.00, 'Jun 2026 profit before tax & year-end depreciation — ' || basis),
    (v_jun, d_inv, null,  291500000.00, 'Stock at 30-Jun-2026 — ' || basis);

  -- ---- Q1 FY2026-27: quarter P&L + 30-Jun-2026 balance sheet.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note) values
    (v_q1, d_rev,   null,  576600000.00, 'Q1 FY2026-27 turnover (~95% export) — ' || basis),
    (v_q1, d_gp,    null,  148800000.00, 'Q1 gross profit = revenue − materials consumed 36.57Cr − direct 6.21Cr — ' || basis),
    (v_q1, d_oi,    null,   13700000.00, 'Q1 other income (duty drawback, RoDTEP, export incentives, exch. fluctuation) — ' || basis),
    (v_q1, d_ie,    null,   72700000.00, 'Q1 indirect expenses — ' || basis),
    (v_q1, d_np,    null,   89800000.00, 'Q1 profit BEFORE TAX and year-end depreciation — ' || basis),
    (v_q1, d_pbt,   null,   89800000.00, 'Q1 PBT — ' || basis),
    (v_q1, d_fin,   null,   12300000.00, 'Q1 finance cost incl. bank charges (interest alone 1.18Cr) — ' || basis),
    (v_q1, d_recv,  null,  360200000.00, 'Sundry debtors at 30-Jun-2026 (export receivables build-up) — ' || basis),
    (v_q1, d_pay,   null,  180400000.00, 'Sundry creditors at 30-Jun-2026 — ' || basis),
    (v_q1, d_cash,  null,   45600000.00, 'Bank & cash at 30-Jun-2026 — ' || basis),
    (v_q1, d_inv,   null,  291500000.00, 'Closing stock at 30-Jun-2026 — ' || basis),
    (v_q1, d_fa,    null, 1201600000.00, 'Fixed assets at 30-Jun-2026 (incl. Plot B-19 addition) — ' || basis),
    (v_q1, d_sec,   null,  944600000.00, 'Secured at 30-Jun-2026: OD/CC 32.77Cr + term/PCFC/vehicle 61.69Cr — ' || basis),
    (v_q1, d_unsec, null,   69000000.00, 'Unsecured loans at 30-Jun-2026 — ' || basis);

  raise notice '0016: Sheetal Mercantile onboarded — org %, 5 periods, 44 values.', v_org;
end;
$$;
