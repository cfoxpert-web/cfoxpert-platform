-- ============================================================================
-- Migration 0024: a sandbox organization for testing (Amendment A4-d / A7-a)
--
-- WHY THIS EXISTS. Publishing writes `statement_lines` and `kpi_values`, both
-- insert-only (ADR-006). A test publish into a real client's organization is
-- PERMANENT: the trigger refuses UPDATE and DELETE, so a wrong figure can
-- only ever be superseded by another row, never removed. RPIL's history
-- would carry test data for the life of the platform.
--
-- The immediate risk this closes: the upload form renders no organization
-- picker, so a staff upload resolves to the uploader's own most recent live
-- membership — which today is RPIL. Testing the ingestion pipeline through
-- the UI would have written test rows into a live client's permanent record
-- with nothing on screen to say so.
--
-- This org holds NO periods, NO values and NO members. Membership is granted
-- and revoked separately (see the notes at the foot of this file), because
-- it is per-user, reversible, and deliberately not part of schema history.
-- ============================================================================

do $$
declare
  v_org uuid;
begin
  select id into v_org
  from public.organizations
  where name = 'CFOXPERT Sandbox — test data, not a client'
    and deleted_at is null;

  if v_org is not null then
    raise notice '0024: sandbox organization already exists — nothing to do.';
    return;
  end if;

  insert into public.organizations
    (name, plan_tier, industry, sector, revenue_band, is_platform_owner)
  values
    (
      -- Named so it is unmistakable in the review queue, which lists every
      -- organization side by side, and in the Topbar if anyone joins it.
      'CFOXPERT Sandbox — test data, not a client',
      -- Legacy tier = the single combined package (ADR-009), so every report
      -- tab is entitled and nothing is greyed out during a test pass.
      'internal',
      -- Manufacturing also grants the industry add-on (Inventory &
      -- Production), which is gated on industry rather than tier (ADR-009).
      'Manufacturing',
      'Sandbox',
      'n/a',
      -- MUST be false. `is_platform_owner` is unique-enforced and confers
      -- internal-staff status through is_internal_staff() (migration 0006);
      -- a second platform owner would hand staff powers to its members.
      false
    )
  returning id into v_org;

  raise notice '0024: sandbox organization created (%).', v_org;
end
$$;

-- ----------------------------------------------------------------------------
-- Using it
-- ----------------------------------------------------------------------------
-- The upload form has no organization picker, so uploads follow the
-- uploader's MOST RECENT live membership (lib/documents/actions.ts, and the
-- same rule in lib/dashboard/data.ts). To route a test pass at the sandbox,
-- join it — the new membership is the most recent, so uploads and the
-- dashboard both resolve here:
--
--   insert into public.organization_members (organization_id, user_id, role)
--   select o.id, u.id, 'owner'
--   from public.organizations o, auth.users u
--   where o.name = 'CFOXPERT Sandbox — test data, not a client'
--     and u.email = '<your email>'
--   on conflict do nothing;
--
-- To leave and restore the previous default, soft-delete it. The partial
-- unique index is on LIVE rows only, so rejoining later still works:
--
--   update public.organization_members m
--   set deleted_at = now()
--   from public.organizations o, auth.users u
--   where m.organization_id = o.id and m.user_id = u.id
--     and o.name = 'CFOXPERT Sandbox — test data, not a client'
--     and u.email = '<your email>'
--     and m.deleted_at is null;
--
-- Membership is NOT created by this migration on purpose: it is per-user,
-- it silently changes which organization a person's dashboard opens on, and
-- schema history is the wrong place for a reversible personal setting.
