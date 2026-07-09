-- ============================================================================
-- Migration 0001: organizations
-- Milestone 5 of the frozen Platform Roadmap v1.0.
--
-- The first real table. Represents a CFOXPERT client company (and, per
-- ADR-008, optionally a group structure via parent_organization_id).
--
-- SECURITY POSTURE: RLS is ENABLED with ZERO permissive policies.
-- Until organization_members exists (Milestone 6), there is no legitimate
-- non-privileged access path to this table — so none is granted. Only the
-- service role (which bypasses RLS) can read/write. Milestone 6 adds the
-- membership-based SELECT policy; write policies follow with the features
-- that need them. Locked by default, opened deliberately.
-- ============================================================================

-- Enum for plan tier (ADR-008: billing readiness without billing logic).
-- 'internal' covers CFOXPERT's own org / demo orgs that aren't paying clients.
create type public.plan_tier as enum ('internal', 'trial', 'standard', 'premium');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  name text not null check (char_length(name) between 1 and 200),

  -- Hierarchy (ADR-008): group/subsidiary structures. Nullable; a root
  -- organization has no parent. An org may not be its own parent.
  parent_organization_id uuid references public.organizations (id),
  constraint organizations_not_own_parent check (parent_organization_id is distinct from id),

  -- Billing readiness (ADR-008): the column exists; billing logic does not.
  plan_tier public.plan_tier not null default 'trial',
  -- Entitlement overrides beyond the tier default. Kept jsonb so adding an
  -- entitlement is a data change; interpret in application code (never in SQL).
  entitlements jsonb not null default '{}'::jsonb,

  -- Benchmark classification (ADR-008): captured from day one so KPI values
  -- recorded later are always classifiable retroactively.
  industry text,
  sector text,
  revenue_band text,

  -- Standing conventions (docs/Database Schema.md)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

-- Hierarchy lookups ("all children of X") and the common "live rows" filter.
create index organizations_parent_idx
  on public.organizations (parent_organization_id)
  where parent_organization_id is not null;

create index organizations_live_idx
  on public.organizations (id)
  where deleted_at is null;

-- updated_at maintenance. Generic trigger function, reused by every future
-- table — defined once here in the first migration.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

-- RLS: enabled, deny-all (no policies). See security posture note above.
alter table public.organizations enable row level security;

comment on table public.organizations is
  'CFOXPERT client companies. Hierarchy via parent_organization_id (ADR-008). RLS deny-all until Milestone 6 adds membership-based policies.';
comment on column public.organizations.plan_tier is
  'Billing readiness only (ADR-008); no billing logic exists yet. Entitlement interpretation happens in application code.';
comment on column public.organizations.industry is
  'Benchmark classification (ADR-008). Captured now so future Benchmark Engine can classify historical KPI data.';
