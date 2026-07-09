-- ============================================================================
-- Migration 0003: audit_logs + feature_flags + auth email sync
-- Milestone 7 (part 1 of 3) of the frozen Platform Roadmap v1.0.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. audit_logs (ADR-005) — first-class, insert-only.
-- Every write-capable milestone from here on writes an entry as part of its
-- definition of done. Service-role writes only for now; an admin read UI
-- comes later.
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null,               -- e.g. 'organization.create', 'kpi_period.finalize'
  target_table text not null,
  target_id uuid,
  before jsonb,
  after jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- Insert-only: an audit log that can be edited is not an audit log.
create or replace function public.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% on % is not allowed: this table is insert-only', tg_op, tg_table_name;
end;
$$;

create trigger audit_logs_insert_only
  before update or delete on public.audit_logs
  for each row execute function public.reject_mutation();

alter table public.audit_logs enable row level security;
-- Deny-all: no client read or write. Service role only.

-- ----------------------------------------------------------------------------
-- 2. feature_flags + per-organization overrides.
-- Global default per flag; optional per-org override (the pilot-client
-- mechanism from ADR-007). NOTE: lib/feature-flags.ts keeps its synchronous
-- env-driven path for now — this table's read path activates when the first
-- per-org flag is needed, without breaking the isFeatureEnabled() interface.
-- ----------------------------------------------------------------------------
create table public.feature_flags (
  key text primary key check (key ~ '^[a-zA-Z][a-zA-Z0-9]*$'),
  enabled boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function public.set_updated_at();

create table public.feature_flag_overrides (
  flag_key text not null references public.feature_flags (key) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  enabled boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (flag_key, organization_id)
);

create trigger feature_flag_overrides_set_updated_at
  before update on public.feature_flag_overrides
  for each row execute function public.set_updated_at();

-- Flags are not secrets (they already ship as NEXT_PUBLIC_ today):
-- any authenticated user may read; writes are service-role only.
alter table public.feature_flags enable row level security;
create policy feature_flags_read_authenticated
  on public.feature_flags for select
  using (auth.uid() is not null);

alter table public.feature_flag_overrides enable row level security;
create policy feature_flag_overrides_read_own_org
  on public.feature_flag_overrides for select
  using (public.is_org_member(organization_id));

-- Seed the registry to mirror lib/feature-flags.ts FLAG_DEFAULTS.
insert into public.feature_flags (key, enabled, description) values
  ('realAuth', false, 'Milestone 4: real Supabase auth replacing the mock session.'),
  ('healthCheckPersistence', false, 'Milestone 8: persist Health Check submissions to the database.'),
  ('crm', false, 'Milestone 9: CRM surface.'),
  ('aiInsights', false, 'Milestone 13: AI-generated commentary/insight drafts.');

-- ----------------------------------------------------------------------------
-- 3. Email sync (M6 ledger item): keep public.users.email current when the
-- auth email changes.
-- ----------------------------------------------------------------------------
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update on auth.users
  for each row execute function public.handle_user_email_change();

comment on table public.audit_logs is
  'ADR-005: insert-only audit trail. Service-role writes; no client access. Every write-capable feature logs here.';
comment on table public.feature_flags is
  'ADR-007: DB-backed flag registry. Read path in app code remains env-driven until a per-org flag is needed.';
