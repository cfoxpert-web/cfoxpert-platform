-- ============================================================================
-- Migration 0005: health check + recommendations/action items (workflow shape)
-- Milestone 7 (part 3 of 3) of the frozen Platform Roadmap v1.0.
--
--   health_check_submissions — raw submissions (Milestone 8 writes these).
--   health_scores            — INSERT-ONLY scored results (ADR-006).
--   work_status + status_history — the ONE workflow shape (status, history,
--     assignee, due date) reused by recommendations, action_items, and any
--     future workflow entity. Transitions are recorded automatically by
--     trigger; no feature code has to remember to write history.
--   recommendations / action_items — first consumers of that shape.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Health check
-- ----------------------------------------------------------------------------
create table public.health_check_submissions (
  id uuid primary key default gen_random_uuid(),
  -- Nullable: public submissions arrive before any org/user exists.
  -- Linked later when a lead converts (CRM, Milestone 9).
  organization_id uuid references public.organizations (id),
  submitted_name text,
  submitted_email text,
  company_name text,
  answers jsonb not null,                      -- raw questionnaire answers; the pure
                                               -- score-engine.ts consumes exactly this
  source text not null default 'website',
  created_at timestamptz not null default now()
);

create index health_check_submissions_org_idx
  on public.health_check_submissions (organization_id)
  where organization_id is not null;

alter table public.health_check_submissions enable row level security;
-- Deny-all: public submissions are written by the server (service role) in
-- Milestone 8; prospects never read back; org members will get read access
-- when the portal surfaces submission history (deliberate, later).

create table public.health_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id),
  submission_id uuid references public.health_check_submissions (id),
  overall_score numeric not null check (overall_score >= 0 and overall_score <= 100),
  grade text not null,
  driver_scores jsonb not null,                -- {financial_strength: n, ...} six drivers
  computed_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
  -- Insert-only: no updated_*/deleted_at (ADR-006).
);

create index health_scores_org_idx
  on public.health_scores (organization_id, computed_at desc)
  where organization_id is not null;

create trigger health_scores_insert_only
  before update or delete on public.health_scores
  for each row execute function public.reject_mutation();

alter table public.health_scores enable row level security;
create policy health_scores_select_members
  on public.health_scores for select
  using (
    organization_id is not null
    and public.is_org_member(organization_id)
  );

-- ----------------------------------------------------------------------------
-- 2. The workflow shape (frozen roadmap: standardized ONCE)
-- ----------------------------------------------------------------------------
create type public.work_status as enum ('open', 'in_progress', 'resolved');

-- Generic, insert-only status history. One table for every workflow entity,
-- discriminated by target_table — matching the audit_logs pattern.
create table public.status_history (
  id uuid primary key default gen_random_uuid(),
  target_table text not null,
  target_id uuid not null,
  from_status public.work_status,
  to_status public.work_status not null,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

create index status_history_target_idx
  on public.status_history (target_table, target_id, changed_at desc);

create trigger status_history_insert_only
  before update or delete on public.status_history
  for each row execute function public.reject_mutation();

alter table public.status_history enable row level security;
-- Deny-all direct access for now; history is surfaced through owning
-- entities' features when those UIs are built.

-- Trigger fn: attach to any table with a work_status column named `status`.
-- Records creation (from_status null) and every transition automatically.
create or replace function public.record_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.status_history (target_table, target_id, from_status, to_status, changed_by)
    values (tg_table_name, new.id, null, new.status, auth.uid());
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.status_history (target_table, target_id, from_status, to_status, changed_by)
    values (tg_table_name, new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Recommendations + action items (first consumers of the shape)
-- ----------------------------------------------------------------------------
create type public.value_driver as enum (
  'financial_strength', 'operational_excellence', 'strategic_growth',
  'governance_leadership', 'technology_intelligence', 'capital_valuation'
);

create type public.priority as enum ('low', 'medium', 'high');

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  title text not null check (char_length(title) between 1 and 300),
  description text,
  driver public.value_driver not null,
  priority public.priority not null default 'medium',
  status public.work_status not null default 'open',
  source text not null default 'manual',       -- 'health_check' | 'board_pack' | 'manual' | 'ai'

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index recommendations_org_status_idx
  on public.recommendations (organization_id, status)
  where deleted_at is null;

create trigger recommendations_set_updated_at
  before update on public.recommendations
  for each row execute function public.set_updated_at();

create trigger recommendations_status_history
  after insert or update on public.recommendations
  for each row execute function public.record_status_change();

alter table public.recommendations enable row level security;
create policy recommendations_select_members
  on public.recommendations for select
  using (deleted_at is null and public.is_org_member(organization_id));
-- Writes: service-role only until the analyst tooling (M9+) defines them.

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id),
  title text not null check (char_length(title) between 1 and 300),
  assignee_user_id uuid references public.users (id),
  due_date date,
  status public.work_status not null default 'open',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index action_items_recommendation_idx
  on public.action_items (recommendation_id)
  where deleted_at is null;

create trigger action_items_set_updated_at
  before update on public.action_items
  for each row execute function public.set_updated_at();

create trigger action_items_status_history
  after insert or update on public.action_items
  for each row execute function public.record_status_change();

alter table public.action_items enable row level security;
create policy action_items_select_members
  on public.action_items for select
  using (
    deleted_at is null
    and exists (
      select 1 from public.recommendations r
      where r.id = recommendation_id
        and r.deleted_at is null
        and public.is_org_member(r.organization_id)
    )
  );

comment on type public.work_status is
  'THE workflow status vocabulary. Any new workflow entity uses this enum, a `status` column, and the record_status_change trigger — never a bespoke status system.';
comment on table public.health_scores is
  'ADR-006: insert-only. Trend charts and FY-vs-FY comparisons depend on history never being overwritten.';
