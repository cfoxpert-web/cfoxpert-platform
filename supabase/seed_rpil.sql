-- ============================================================================
-- Seed: first platform-owner org + first client (Reliable Packaging Industries
-- Ltd), with FY25/FY26 KPI data from the June-2026 RPIL board report.
--
-- This is the run-once seed that was previously handed over out-of-band and
-- lost; committed here so it is never lost again. It is a REFERENCE/SETUP
-- script, not a migration — it seeds one specific client's real data.
--
-- PREREQUISITES
--   * Migrations 0001–0007 applied (0007 defines the 8 board-report KPIs).
--   * The owner auth user (parth90narula@gmail.com) exists in auth.users.
--
-- SAFETY
--   * Run once. Aborts if any organization already exists, to avoid
--     duplicates / partial re-seeds.
--   * Runs as the SQL-editor role (bypasses RLS by design).
--   * No health score is seeded: the client health score is being redesigned
--     to compute from financials (see docs/Integration Roadmap.md, Amendment
--     A2); a self-assessment score would be the wrong model for a client.
--
-- DATA PROVENANCE
--   * Revenue is verbatim from the board report (FY26 actual, FY25 actual).
--   * Gross profit / other income / net profit are FY2025-26 full-year actuals.
--   * Balance-sheet items (receivables, payables, cash, inventory) are the
--     consolidated 31-Mar-2026 year-end position.
--   * See each kpi_values.note for the per-figure basis.
-- ============================================================================

do $$
declare
  v_user uuid; v_platform_org uuid; v_client_org uuid;
  v_fy25 uuid; v_fy26 uuid;
  v_rev uuid; v_gp uuid; v_oi uuid; v_np uuid;
  v_recv uuid; v_pay uuid; v_cash uuid; v_inv uuid;
  v_now timestamptz := now();
begin
  if exists (select 1 from public.organizations) then
    raise exception 'Organizations already exist — seed appears to have run. Aborting.';
  end if;

  select id into v_user from auth.users where email = 'parth90narula@gmail.com';
  if v_user is null then
    raise exception 'Owner user parth90narula@gmail.com not found. Create the auth user first.';
  end if;

  select id into v_rev  from public.kpi_definitions where key = 'revenue';
  select id into v_gp   from public.kpi_definitions where key = 'gross_profit';
  select id into v_oi   from public.kpi_definitions where key = 'other_income';
  select id into v_np   from public.kpi_definitions where key = 'net_profit';
  select id into v_recv from public.kpi_definitions where key = 'trade_receivables';
  select id into v_pay  from public.kpi_definitions where key = 'trade_payables';
  select id into v_cash from public.kpi_definitions where key = 'cash_bank';
  select id into v_inv  from public.kpi_definitions where key = 'inventory';
  if v_gp is null then
    raise exception 'Board-report KPI definitions missing — apply migration 0007 first.';
  end if;

  -- Platform-owner org (CFOXPERT's own org).
  insert into public.organizations (name, plan_tier, is_platform_owner, created_by, updated_by)
  values ('CFOXPERT', 'internal', true, v_user, v_user)
  returning id into v_platform_org;

  -- First client org.
  insert into public.organizations (name, plan_tier, industry, sector, revenue_band, created_by, updated_by)
  values ('Reliable Packaging Industries Ltd', 'trial',
          'Packaging & Glass Manufacturing', 'Manufacturing', '100-200 Cr', v_user, v_user)
  returning id into v_client_org;

  -- Memberships — client is MOST-RECENT so it resolves as the active org
  -- (getCurrentUserOrganization picks the most recently joined membership).
  insert into public.organization_members
    (organization_id, user_id, role, created_at, updated_at, created_by, updated_by)
  values
    (v_platform_org, v_user, 'owner', v_now - interval '2 minutes', v_now - interval '2 minutes', v_user, v_user),
    (v_client_org,   v_user, 'owner', v_now - interval '1 minute',  v_now - interval '1 minute',  v_user, v_user);

  -- Periods — FY26 latest-created so it is "current", FY25 "prior".
  insert into public.kpi_periods (organization_id, period_label, period_type, status, created_at, updated_at, created_by, updated_by)
  values (v_client_org, 'FY25', 'yearly', 'finalized', v_now - interval '2 minutes', v_now - interval '2 minutes', v_user, v_user)
  returning id into v_fy25;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, created_at, updated_at, created_by, updated_by)
  values (v_client_org, 'FY26', 'yearly', 'finalized', v_now - interval '1 minute', v_now - interval '1 minute', v_user, v_user)
  returning id into v_fy26;

  -- FY25 (F.Y. 2024-25): only revenue is in the board report.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, value, note, created_by) values
    (v_fy25, v_rev, 1454258007.02, 'RPIL FY2024-25 revenue - board report actual', v_user);

  -- FY26 (F.Y. 2025-26): full-year P&L + 31-Mar-2026 year-end balance sheet.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, value, note, created_by) values
    (v_fy26, v_rev,  1781249181.12, 'FY2025-26 revenue - actual',          v_user),
    (v_fy26, v_gp,    472395399.95, 'FY2025-26 gross profit - actual',     v_user),
    (v_fy26, v_oi,      1567682.89, 'FY2025-26 other income - actual',     v_user),
    (v_fy26, v_np,     58072839.11, 'FY2025-26 net profit (PAT) - actual', v_user),
    (v_fy26, v_recv,  236658128.45, 'Trade receivables at 31-Mar-2026',    v_user),
    (v_fy26, v_pay,   116095035.00, 'Trade payables at 31-Mar-2026',       v_user),
    (v_fy26, v_cash,    7353582.08, 'Cash & bank at 31-Mar-2026',          v_user),
    (v_fy26, v_inv,   123311128.00, 'Inventory at 31-Mar-2026',            v_user);

  raise notice 'RPIL seed complete.';
end $$;
