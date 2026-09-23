-- ============================================================================
-- Post-migration assertions — run against the STATE the migrations produced,
-- never against the text of the files that produced it.
--
-- Every check here raises an exception on failure, so psql -v ON_ERROR_STOP=1
-- fails the job. A passing run means a real Postgres accepted every migration
-- in order AND the resulting database satisfies these invariants.
--
-- The check that matters most is the first one. Its file-parsing predecessor
-- passed while production rejected the same migration, because searching a
-- concatenation of SQL files for a string tells you nothing about what order
-- statements execute in or whether a row was ever written.
-- ============================================================================

\set ON_ERROR_STOP on

do $$
declare
  missing text;
  n integer;
begin
  -- ---- 1. Every head in the map points at a kpi_definitions row THAT EXISTS.
  -- The foreign key already guarantees this, which is the point: if the map
  -- seeded at all, the definitions were there first. This assertion is what
  -- fails loudly if someone later reorders the migration again.
  select string_agg(m.kpi_key, ', ')
    into missing
  from public.head_kpi_map m
  where not exists (
    select 1 from public.kpi_definitions d where d.key = m.kpi_key
  );
  if missing is not null then
    raise exception 'head_kpi_map references kpi_definitions that do not exist: %', missing;
  end if;

  -- ---- 2. The map was actually seeded. A silently empty map would make the
  -- rollup treat EVERY line as unclassified, which understates cost and
  -- flatters every margin (ADR-018).
  select count(*) into n from public.head_kpi_map where version = 1;
  if n = 0 then
    raise exception 'head_kpi_map version 1 is empty — no head would roll up';
  end if;

  -- ---- 3. The data-quality KPI the rollup needs to disclose gaps exists.
  if not exists (select 1 from public.kpi_definitions where key = 'unclassified_value') then
    raise exception 'kpi_definitions is missing unclassified_value — unclassified lines would have nowhere to surface';
  end if;

  -- ---- 4. Tables A7-a depends on exist with the columns the code reads.
  foreach missing in array array[
    'statement_lines', 'head_kpi_map'
  ] loop
    if to_regclass('public.' || missing) is null then
      raise exception 'table public.% was not created', missing;
    end if;
  end loop;

  -- ---- 5. Provenance columns are NOT NULL where A7-a promised they would
  -- be. A nullable provenance column is indistinguishable from an
  -- unrecorded one, which is the whole reason they were added up front.
  foreach missing in array array[
    'document_id', 'job_id', 'unit_basis', 'unit_multiplier', 'amount'
  ] loop
    select count(*) into n
    from information_schema.columns
    where table_schema = 'public' and table_name = 'statement_lines'
      and column_name = missing and is_nullable = 'NO';
    if n = 0 then
      raise exception 'statement_lines.% must be NOT NULL', missing;
    end if;
  end loop;

  -- ---- 6. Insert-only enforcement is actually attached (ADR-006). A
  -- financial table that silently accepts UPDATE destroys the history every
  -- trend chart depends on.
  foreach missing in array array[
    'statement_lines', 'kpi_values', 'health_scores', 'audit_logs', 'head_kpi_map'
  ] loop
    if not exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_proc p on p.oid = t.tgfoid
      where c.relname = missing and p.proname = 'reject_mutation' and not t.tgisinternal
    ) then
      raise exception 'table % has no reject_mutation trigger — it is not insert-only', missing;
    end if;
  end loop;

  -- ---- 7. The awaiting_scope stage reached the enum (A4-d-2).
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'ingestion_stage' and e.enumlabel = 'awaiting_scope'
  ) then
    raise exception 'ingestion_stage is missing the awaiting_scope value';
  end if;

  -- ---- 8. The contradiction migration 0020 exists to make impossible is
  -- actually impossible: a mapping confidence cannot exist without a key.
  if not exists (
    select 1 from pg_constraint
    where conname = 'extracted_lines_mapping_confidence_requires_key'
  ) then
    raise exception 'extracted_lines is missing the mapping_confidence check constraint';
  end if;

  -- ---- 9. RLS is on for every table holding client data. A table that
  -- reaches production with RLS off is a cross-tenant leak, not a lint.
  select string_agg(c.relname, ', ') into missing
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
    and c.relname not in ('_applied_migrations');
  if missing is not null then
    raise exception 'tables in public have RLS disabled: %', missing;
  end if;

  -- ---- 10. The sandbox org exists and is NOT the platform owner. A second
  -- platform owner would confer internal-staff status on its members
  -- through is_internal_staff() (migration 0006).
  if not exists (
    select 1 from public.organizations
    where name = 'CFOXPERT Sandbox — test data, not a client'
      and deleted_at is null and not is_platform_owner
  ) then
    raise exception 'sandbox organization is missing, or is flagged as platform owner';
  end if;

  select count(*) into n from public.organizations
  where is_platform_owner and deleted_at is null;
  if n > 1 then
    raise exception 'more than one organization is flagged is_platform_owner (%)', n;
  end if;

  raise notice 'All post-migration assertions passed.';
end
$$;

-- A visible summary in the job log, so a human can eyeball what was built.
select
  (select count(*) from public.head_kpi_map where version = 1) as heads_mapped,
  (select count(*) from public.kpi_definitions where active) as kpi_definitions,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r') as tables;
