-- ============================================================================
-- CI bootstrap — the minimum Supabase-shaped scaffolding a bare Postgres
-- needs before this repo's migrations will apply.
--
-- Supabase provides these objects on a real project. A plain postgres:17
-- container does not, so every migration would fail on the first reference
-- to auth.users. This file creates just enough for the DDL to run.
--
-- WHAT THIS DOES NOT PROVE. It is a shim, and naming its limits matters as
-- much as what it covers:
--   - auth.uid() returns NULL here, so RLS policies APPLY but always
--     evaluate as an anonymous caller. This verifies that policies are
--     syntactically valid and reference real columns; it does NOT verify
--     that they grant and deny to the right people. Tenant isolation is
--     still proven by the live tests recorded in the Changelog.
--   - No PostgREST, no Storage, no Auth triggers.
-- It DOES prove what just broke production: that every migration applies
-- cleanly, in order, and that the state they produce satisfies its own
-- constraints.
-- ============================================================================

create extension if not exists pgcrypto;

-- Roles Supabase ships. NOLOGIN: nothing connects as them here, but GRANT
-- and `to authenticated` policy clauses need them to exist.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;

-- Only the columns this repo's migrations actually reference. Keeping it
-- minimal is deliberate: a fuller copy would drift from the real thing and
-- quietly stop matching.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb
);

-- Supabase resolves this from the request JWT. NULL here means "anonymous",
-- which is the correct answer for a CI run with no request context.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
