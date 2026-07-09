-- ============================================================================
-- Migration 0002: users + organization_members
-- Milestone 6 of the frozen Platform Roadmap v1.0.
--
-- Introduces:
--   1. public.users — profile table, 1:1 with auth.users, auto-provisioned
--      by trigger on signup (standard Supabase pattern).
--   2. public.organization_members — role join table (ADR-003). Role is a
--      property of a user's membership in a specific organization, never a
--      global attribute of the user.
--   3. The platform's first real RLS policies, including the membership-
--      based SELECT that opens organizations (deny-all since 0001) to
--      legitimate members.
--
-- Writes to organizations and organization_members remain service-role-only:
-- there is no invite/self-serve flow yet, so no client-side write path is
-- granted. Opened deliberately, later, with the features that need it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. users profile table
-- ----------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- Auto-provision a profile row whenever an auth user is created.
-- security definer: runs with owner privileges since the signing-up user
-- has no rights on public.users yet. Fixed search_path per Supabase
-- security guidance for definer functions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. organization_members (ADR-003)
-- ----------------------------------------------------------------------------
create type public.org_role as enum ('owner', 'admin', 'member', 'analyst');

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  user_id uuid not null references public.users (id),
  role public.org_role not null default 'member',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

-- One live membership per (org, user). Partial unique index so a
-- soft-deleted membership never blocks re-adding the same person.
create unique index organization_members_live_unique
  on public.organization_members (organization_id, user_id)
  where deleted_at is null;

create index organization_members_user_idx
  on public.organization_members (user_id)
  where deleted_at is null;

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row
  execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS helper — the single membership check every policy uses
-- ----------------------------------------------------------------------------
-- security definer avoids the recursive-policy trap (organization_members'
-- own SELECT policy calling a function that queries organization_members
-- would otherwise re-enter RLS). Fixed search_path, stable, and it only
-- ever answers for the CURRENT user (auth.uid()) — callers cannot probe
-- other users' memberships through it.
create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.deleted_at is null
  );
$$;

-- ----------------------------------------------------------------------------
-- 4. Policies
-- ----------------------------------------------------------------------------

-- users: everyone may read and update their OWN live profile row.
-- (Email changes go through Supabase Auth, not this table; the trigger and
-- future admin tooling keep the copy in sync. UPDATE here is for profile
-- fields like full_name — the Settings page's edit path.)
alter table public.users enable row level security;

create policy users_select_own
  on public.users for select
  using (id = auth.uid() and deleted_at is null);

create policy users_update_own
  on public.users for update
  using (id = auth.uid() and deleted_at is null)
  with check (id = auth.uid());

-- organization_members: members may see the membership list of
-- organizations they belong to (basis for future team views). No
-- client-side writes.
alter table public.organization_members enable row level security;

create policy organization_members_select_own_orgs
  on public.organization_members for select
  using (
    deleted_at is null
    and public.is_org_member(organization_id)
  );

-- organizations: opens the deny-all posture from migration 0001.
-- Live members may SELECT their organizations. Direct membership only —
-- parent-org membership does NOT cascade to subsidiaries (consolidated
-- reporting is a future, deliberately-designed feature, not an accidental
-- access grant).
create policy organizations_select_members
  on public.organizations for select
  using (
    deleted_at is null
    and public.is_org_member(id)
  );

comment on table public.users is
  'Profile rows, 1:1 with auth.users, auto-provisioned by on_auth_user_created trigger. Own-row read/update via RLS.';
comment on table public.organization_members is
  'ADR-003: role is a property of membership (user x organization), never global. One live membership per pair.';
comment on function public.is_org_member is
  'Single membership check used by all RLS policies. security definer to avoid policy recursion; only answers for auth.uid().';
