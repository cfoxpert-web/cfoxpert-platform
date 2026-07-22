-- ============================================================================
-- Migration 0010: RPIL Q1 FY2026-27 + monthly periods (Amendment A5 seed)
--
-- Data seed, not schema. Source: RPIL_Board_Report_June2026_8.html embedded
-- data objects (const D / DET / SS) — real client figures, same provenance-
-- in-note pattern as the FY25/FY26 seed. Report _8 also RESTATES FY2025-26
-- gross profit to the audited-FS basis (Revenue − Cost of Materials net of
-- inventory change − Direct Expenses, Note 2.25): recorded here as an
-- insert-only correction row (ADR-006), superseding 472,395,399.95.
--
-- Period design decisions (approved 2026-07-13):
--  * Branches are a `segment` dimension (migration 0009), not child orgs.
--  * New periods' created_at is backdated to just BEFORE FY26's so FY26
--    stays the dashboard's default period (default = latest-created).
--  * Q1 FY27 and Apr–Jun 2026 are status 'draft' (Q1 books carry June
--    estimates for salaries/depreciation); Mar 2026 is 'finalized'
--    (fiscal-year-close position).
--
-- Guarded: skips (with a notice) if RPIL is absent or Q1 FY27 already exists.
-- ============================================================================

do $$
declare
  v_org  uuid;
  v_user uuid;
  v_fy26_created timestamptz;
  v_fy26 uuid;
  v_mar uuid; v_apr uuid; v_may uuid; v_jun uuid; v_q1 uuid;
  -- definitions
  d_rev uuid; d_gp uuid; d_oi uuid; d_np uuid; d_ind uuid;
  d_fa uuid; d_inv uuid; d_recv uuid; d_cash uuid; d_pay uuid;
  d_sec uuid; d_unsec uuid; d_pbt uuid; d_tax uuid; d_dep uuid; d_fin uuid;
begin
  select id, created_by into v_org, v_user
  from public.organizations
  where name = 'Reliable Packaging Industries Ltd' and deleted_at is null;
  if v_org is null then
    raise notice '0010: RPIL organization not found — seed skipped.';
    return;
  end if;

  if exists (select 1 from public.kpi_periods
             where organization_id = v_org and period_label = 'Q1 FY27'
               and deleted_at is null) then
    raise notice '0010: Q1 FY27 already exists — seed skipped.';
    return;
  end if;

  select id, created_at into v_fy26, v_fy26_created
  from public.kpi_periods
  where organization_id = v_org and period_label = 'FY26' and deleted_at is null;
  if v_fy26 is null then
    raise notice '0010: FY26 period not found — seed skipped.';
    return;
  end if;

  select id into d_rev   from public.kpi_definitions where key = 'revenue';
  select id into d_gp    from public.kpi_definitions where key = 'gross_profit';
  select id into d_oi    from public.kpi_definitions where key = 'other_income';
  select id into d_np    from public.kpi_definitions where key = 'net_profit';
  select id into d_ind   from public.kpi_definitions where key = 'indirect_expenses';
  select id into d_fa    from public.kpi_definitions where key = 'fixed_assets';
  select id into d_inv   from public.kpi_definitions where key = 'inventory';
  select id into d_recv  from public.kpi_definitions where key = 'trade_receivables';
  select id into d_cash  from public.kpi_definitions where key = 'cash_bank';
  select id into d_pay   from public.kpi_definitions where key = 'trade_payables';
  select id into d_sec   from public.kpi_definitions where key = 'secured_borrowings';
  select id into d_unsec from public.kpi_definitions where key = 'unsecured_borrowings';
  select id into d_pbt   from public.kpi_definitions where key = 'pbt';
  select id into d_tax   from public.kpi_definitions where key = 'tax_expense';
  select id into d_dep   from public.kpi_definitions where key = 'depreciation';
  select id into d_fin   from public.kpi_definitions where key = 'finance_cost';
  if d_ind is null or d_fa is null then
    raise exception '0010: statement-line definitions missing — apply migration 0009 first.';
  end if;

  -- --------------------------------------------------------------------------
  -- Periods. created_at backdated before FY26 (FY25 sits 60s before FY26,
  -- so -50s..-10s keeps FY25 < new periods < FY26 and FY26 stays default).
  -- --------------------------------------------------------------------------
  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at, created_by, updated_by)
  values (v_org, 'Mar 2026', 'monthly', 'finalized', date '2026-03-01', date '2026-03-31', v_fy26_created - interval '50 seconds', v_fy26_created - interval '50 seconds', v_user, v_user)
  returning id into v_mar;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at, created_by, updated_by)
  values (v_org, 'Apr 2026', 'monthly', 'draft', date '2026-04-01', date '2026-04-30', v_fy26_created - interval '40 seconds', v_fy26_created - interval '40 seconds', v_user, v_user)
  returning id into v_apr;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at, created_by, updated_by)
  values (v_org, 'May 2026', 'monthly', 'draft', date '2026-05-01', date '2026-05-31', v_fy26_created - interval '30 seconds', v_fy26_created - interval '30 seconds', v_user, v_user)
  returning id into v_may;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at, created_by, updated_by)
  values (v_org, 'Jun 2026', 'monthly', 'draft', date '2026-06-01', date '2026-06-30', v_fy26_created - interval '20 seconds', v_fy26_created - interval '20 seconds', v_user, v_user)
  returning id into v_jun;

  insert into public.kpi_periods (organization_id, period_label, period_type, status, period_start, period_end, created_at, updated_at, created_by, updated_by)
  values (v_org, 'Q1 FY27', 'quarterly', 'draft', date '2026-04-01', date '2026-06-30', v_fy26_created - interval '10 seconds', v_fy26_created - interval '10 seconds', v_user, v_user)
  returning id into v_q1;

  -- --------------------------------------------------------------------------
  -- FY26 corrections + enrichment (period already exists).
  -- --------------------------------------------------------------------------
  -- Gross profit RESTATED to audited-FS basis (correction row, ADR-006).
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_fy26, d_gp, null, 300171344.67, 'CORRECTION: FY2025-26 gross profit restated to audited-FS basis (Rev - CoM net of inv change - Direct Expenses, Note 2.25); supersedes 472,395,399.95 (report _8)', v_user);

  -- Group P&L additions.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_fy26, d_pbt, null, 77738201.07,  'FY2025-26 profit before tax - audited FS', v_user),
    (v_fy26, d_tax, null, 19665361.96,  'FY2025-26 tax (current + deferred) = PBT - PAT', v_user),
    (v_fy26, d_dep, null, 19770812.36,  'FY2025-26 depreciation - audited FS', v_user),
    (v_fy26, d_fin, null, 17868910.12,  'FY2025-26 finance cost - audited FS', v_user),
    (v_fy26, d_ind, null, 224000826.49, 'FY2025-26 indirect expenses - derived: GP (restated) + Other Income - PBT', v_user);

  -- Group balance-sheet additions at 31-Mar-2026.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_fy26, d_fa,    null, 290265131.22, 'Fixed assets (net block) at 31-Mar-2026, consolidated', v_user),
    (v_fy26, d_sec,   null, 249642130.00, 'Secured borrowings at 31-Mar-2026 (held in GrN books)', v_user),
    (v_fy26, d_unsec, null, 93618265.00,  'Unsecured borrowings at 31-Mar-2026 (held in GrN books)', v_user);

  -- Branch segments, FY2025-26 P&L (audited FS basis).
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_fy26, d_rev, 'Greater Noida', 1392604527.86, 'FY2025-26 revenue - branch FS', v_user),
    (v_fy26, d_rev, 'Dhaulana',       372700608.63, 'FY2025-26 revenue - branch FS', v_user),
    (v_fy26, d_rev, 'Telangana',       15944044.63, 'FY2025-26 revenue - branch FS', v_user),
    (v_fy26, d_gp,  'Greater Noida',  188581323.65, 'FY2025-26 gross profit - audited-FS basis', v_user),
    (v_fy26, d_gp,  'Dhaulana',        95681944.39, 'FY2025-26 gross profit - audited-FS basis', v_user),
    (v_fy26, d_gp,  'Telangana',       15908076.63, 'FY2025-26 gross profit - audited-FS basis', v_user),
    (v_fy26, d_pbt, 'Greater Noida',   33967533.51, 'FY2025-26 PBT - branch FS', v_user),
    (v_fy26, d_pbt, 'Dhaulana',        27914548.48, 'FY2025-26 PBT - branch FS', v_user),
    (v_fy26, d_pbt, 'Telangana',       15856119.08, 'FY2025-26 PBT - branch FS', v_user),
    (v_fy26, d_np,  'Greater Noida',   14302171.55, 'FY2025-26 PAT - branch FS', v_user),
    (v_fy26, d_np,  'Dhaulana',        27914548.48, 'FY2025-26 PAT - branch FS', v_user),
    (v_fy26, d_np,  'Telangana',       15856119.08, 'FY2025-26 PAT - branch FS', v_user);

  -- Branch segments, balance sheet at 31-Mar-2026 (non-zero lines only).
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_fy26, d_fa,    'Greater Noida', 135820172.00,  'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_inv,   'Greater Noida', 82155841.00,   'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_recv,  'Greater Noida', 163891501.00,  'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_cash,  'Greater Noida', 6536120.00,    'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_pay,   'Greater Noida', 109412365.00,  'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_sec,   'Greater Noida', 249642130.00,  'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_unsec, 'Greater Noida', 93618265.00,   'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_fa,    'Dhaulana',      153980597.23,  'At 31-Mar-2026, per FY26 FS notes', v_user),
    (v_fy26, d_inv,   'Dhaulana',      41155287.00,   'At 31-Mar-2026, per FY26 FS notes', v_user),
    (v_fy26, d_recv,  'Dhaulana',      58707972.13,   'At 31-Mar-2026, per FY26 FS notes', v_user),
    (v_fy26, d_cash,  'Dhaulana',      817462.08,     'At 31-Mar-2026, per FY26 FS notes', v_user),
    (v_fy26, d_pay,   'Dhaulana',      6682670.00,    'At 31-Mar-2026, per FY26 FS notes', v_user),
    (v_fy26, d_fa,    'Telangana',     464361.99,     'At 31-Mar-2026, branch trial balance', v_user),
    (v_fy26, d_recv,  'Telangana',     14058655.32,   'At 31-Mar-2026, net of inter-branch balances', v_user);

  -- --------------------------------------------------------------------------
  -- Q1 FY2026-27 (Apr-Jun 2026). P&L per branch books; BS at 30-Jun-2026.
  -- Q1 net profit is BEFORE tax provisioning; salaries/depreciation include
  -- June estimates (hence period status 'draft').
  -- --------------------------------------------------------------------------
  -- Group P&L.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_q1, d_rev, null, 550937270.77, 'Q1 FY2026-27 revenue - sum of branch books (report _8)', v_user),
    (v_q1, d_gp,  null, 96600698.10,  'Q1 gross profit - trading-account basis, sum of branches', v_user),
    (v_q1, d_oi,  null, 4322.67,      'Q1 other income - FD interest, GrN books', v_user),
    (v_q1, d_np,  null, 41056123.80,  'Q1 net profit BEFORE tax provisioning - sum of branches', v_user),
    (v_q1, d_ind, null, 55548896.97,  'Q1 indirect expenses - derived: GP + OI - NP', v_user);

  -- Group balance sheet at 30-Jun-2026.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_q1, d_fa,    null, 306985701.68, 'At 30-Jun-2026, consolidated branch books', v_user),
    (v_q1, d_inv,   null, 118819783.00, 'At 30-Jun-2026, consolidated branch books', v_user),
    (v_q1, d_recv,  null, 280573815.30, 'At 30-Jun-2026, consolidated; Telangana net of inter-branch', v_user),
    (v_q1, d_cash,  null, 9184443.97,   'At 30-Jun-2026, consolidated branch books', v_user),
    (v_q1, d_pay,   null, 111720703.75, 'At 30-Jun-2026, consolidated; Dhaulana creditors net advance', v_user),
    (v_q1, d_sec,   null, 246607796.00, 'At 30-Jun-2026 (held in GrN books)', v_user),
    (v_q1, d_unsec, null, 118298265.00, 'At 30-Jun-2026 (held in GrN books)', v_user);

  -- Branch segments, Q1 P&L.
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_q1, d_rev, 'Greater Noida', 396837353.53, 'Q1 revenue - branch books', v_user),
    (v_q1, d_gp,  'Greater Noida', 68813228.58,  'Q1 gross profit - trading account', v_user),
    (v_q1, d_oi,  'Greater Noida', 4322.67,      'Q1 FD interest', v_user),
    (v_q1, d_np,  'Greater Noida', 31493835.82,  'Q1 net profit before tax provisioning', v_user),
    (v_q1, d_ind, 'Greater Noida', 37323715.43,  'Q1 indirect expenses - derived: GP + OI - NP', v_user),
    (v_q1, d_rev, 'Dhaulana',      129380320.45, 'Q1 revenue - branch books', v_user),
    (v_q1, d_gp,  'Dhaulana',      27753311.33,  'Q1 gross profit - trading account', v_user),
    (v_q1, d_np,  'Dhaulana',      9528129.79,   'Q1 net profit before tax provisioning', v_user),
    (v_q1, d_ind, 'Dhaulana',      18225181.54,  'Q1 indirect expenses - derived: GP + OI - NP', v_user),
    (v_q1, d_rev, 'Telangana',     24719596.79,  'Q1 revenue - trading unit', v_user),
    (v_q1, d_gp,  'Telangana',     34158.19,     'Q1 gross profit - trading unit', v_user),
    (v_q1, d_np,  'Telangana',     34158.19,     'Q1 net profit - trading unit (no indirect expenses)', v_user);

  -- Branch segments, balance sheet at 30-Jun-2026 (non-zero lines only).
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_q1, d_fa,    'Greater Noida', 149210254.00,  'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_inv,   'Greater Noida', 92482262.00,   'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_recv,  'Greater Noida', 187005026.00,  'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_cash,  'Greater Noida', 8282011.00,    'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_pay,   'Greater Noida', 113477012.00,  'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_sec,   'Greater Noida', 246607796.00,  'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_unsec, 'Greater Noida', 118298265.00,  'At 30-Jun-2026, branch trial balance', v_user),
    (v_q1, d_fa,    'Dhaulana',      157311085.69,  'At 30-Jun-2026, branch books', v_user),
    (v_q1, d_inv,   'Dhaulana',      26337521.00,   'At 30-Jun-2026, branch books', v_user),
    (v_q1, d_recv,  'Dhaulana',      80065362.83,   'At 30-Jun-2026, branch books', v_user),
    (v_q1, d_cash,  'Dhaulana',      902432.97,     'At 30-Jun-2026, branch books', v_user),
    (v_q1, d_pay,   'Dhaulana',      -1756308.25,   'At 30-Jun-2026 - creditors group in net advance position', v_user),
    (v_q1, d_fa,    'Telangana',     464361.99,     'At 30-Jun-2026, branch books', v_user),
    (v_q1, d_recv,  'Telangana',     13503426.47,   'At 30-Jun-2026, net of inter-branch balances', v_user);

  -- --------------------------------------------------------------------------
  -- Monthly inventory positions (Mar-Jun 2026).
  -- Mar + Jun: balance-sheet basis (full inventory incl. FG/WIP).
  -- Apr + May: Greater Noida ONLY, materials & stores basis per the monthly
  -- stock statement (SS object) — Dhaulana has no Apr/May figures in the
  -- report, so NO group value exists for those months (never interpolated).
  -- --------------------------------------------------------------------------
  insert into public.kpi_values (kpi_period_id, kpi_definition_id, segment, value, note, created_by) values
    (v_mar, d_inv, null,            123311128.00, 'At 31-Mar-2026, consolidated (BS basis)', v_user),
    (v_mar, d_inv, 'Greater Noida', 82155841.00,  'At 31-Mar-2026, branch (BS basis)', v_user),
    (v_mar, d_inv, 'Dhaulana',      41155287.00,  'At 31-Mar-2026, branch (BS basis)', v_user),
    (v_apr, d_inv, 'Greater Noida', 71393850.67,  'At 30-Apr-2026 - materials & stores basis per monthly stock statement; excludes FG/WIP, NOT comparable to BS-basis months', v_user),
    (v_may, d_inv, 'Greater Noida', 77236179.18,  'At 31-May-2026 - materials & stores basis per monthly stock statement; excludes FG/WIP, NOT comparable to BS-basis months', v_user),
    (v_jun, d_inv, null,            118819783.00, 'At 30-Jun-2026, consolidated (BS basis)', v_user),
    (v_jun, d_inv, 'Greater Noida', 92482262.00,  'At 30-Jun-2026, branch (BS basis)', v_user),
    (v_jun, d_inv, 'Dhaulana',      26337521.00,  'At 30-Jun-2026, branch (BS basis)', v_user);

  raise notice '0010: RPIL Q1 FY27 + monthly seed complete.';
end $$;
