-- ============================================================================
-- Migration 0006: CRM
-- Milestone 9 of the frozen Platform Roadmap v1.0.
--
--   is_platform_owner + is_internal_staff() — resolves the M6 ledger
--     question: internal staff are members of CFOXPERT's own organization
--     (ADR-003 reused; no parallel permission system).
--   leads / pipeline_stages / deals / crm_activities — internal-only tables.
--   convert_lead() — ATOMIC conversion: client org created, health-check
--     submission linked, lead marked converted, audit logged — all or nothing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Platform-owner org + internal-staff helper
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column is_platform_owner boolean not null default false;

-- At most ONE platform-owner organization, ever.
create unique index organizations_single_platform_owner
  on public.organizations (is_platform_owner)
  where is_platform_owner;

create or replace function public.is_internal_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    join public.organizations o on o.id = m.organization_id
    where o.is_platform_owner
      and m.user_id = auth.uid()
      and m.deleted_at is null
      and o.deleted_at is null
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. CRM tables (internal-only: clients never see these)
-- ----------------------------------------------------------------------------
create type public.lead_status as enum
  ('new', 'contacted', 'qualified', 'converted', 'lost');

create type public.crm_activity_type as enum
  ('call', 'email', 'note', 'meeting');

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger pipeline_stages_set_updated_at
  before update on public.pipeline_stages
  for each row execute function public.set_updated_at();

insert into public.pipeline_stages (name, sort_order) values
  ('Discovery', 10),
  ('Health Check Done', 20),
  ('Proposal', 30),
  ('Negotiation', 40),
  ('Won', 50),
  ('Lost', 60);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  company_name text,
  email text,
  phone text,
  source text not null default 'manual',       -- 'health_check' | 'website' | 'referral' | 'manual'
  status public.lead_status not null default 'new',
  health_check_submission_id uuid references public.health_check_submissions (id),
  converted_organization_id uuid references public.organizations (id),
  owner_user_id uuid references public.users (id),   -- assigned analyst
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index leads_status_idx on public.leads (status) where deleted_at is null;
create index leads_owner_idx on public.leads (owner_user_id) where deleted_at is null;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  stage_id uuid not null references public.pipeline_stages (id),
  value_estimate numeric check (value_estimate is null or value_estimate >= 0),
  expected_close_date date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index deals_lead_idx on public.deals (lead_id) where deleted_at is null;
create index deals_stage_idx on public.deals (stage_id) where deleted_at is null;

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id),
  type public.crm_activity_type not null,
  content text not null,
  occurred_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

create index crm_activities_lead_idx on public.crm_activities (lead_id, occurred_at desc);

-- ----------------------------------------------------------------------------
-- 3. RLS: internal staff full working access; everyone else nothing.
-- Writes are REAL-USER writes (not service role), so created_by/updated_by
-- and the audit trail carry true actors. Hard DELETE is granted to no one:
-- removal is soft-delete via UPDATE, per standing convention.
-- ----------------------------------------------------------------------------
alter table public.pipeline_stages enable row level security;
create policy pipeline_stages_internal_read
  on public.pipeline_stages for select using (public.is_internal_staff());
create policy pipeline_stages_internal_write
  on public.pipeline_stages for update using (public.is_internal_staff());
create policy pipeline_stages_internal_insert
  on public.pipeline_stages for insert with check (public.is_internal_staff());

alter table public.leads enable row level security;
create policy leads_internal_read
  on public.leads for select using (public.is_internal_staff());
create policy leads_internal_insert
  on public.leads for insert with check (public.is_internal_staff());
create policy leads_internal_update
  on public.leads for update using (public.is_internal_staff());

alter table public.deals enable row level security;
create policy deals_internal_read
  on public.deals for select using (public.is_internal_staff());
create policy deals_internal_insert
  on public.deals for insert with check (public.is_internal_staff());
create policy deals_internal_update
  on public.deals for update using (public.is_internal_staff());

alter table public.crm_activities enable row level security;
create policy crm_activities_internal_read
  on public.crm_activities for select using (public.is_internal_staff());
create policy crm_activities_internal_insert
  on public.crm_activities for insert with check (public.is_internal_staff());
-- Activities are a log: no UPDATE policy (immutable once written; corrections
-- are new activities).

-- ----------------------------------------------------------------------------
-- 4. Atomic lead conversion.
-- Creates the client organization, links the originating health-check
-- submission (if any), marks the lead converted, writes the audit entry —
-- in ONE transaction. security definer (writes span RLS boundaries: the new
-- client org is not the caller's org), gated internally on is_internal_staff().
-- ----------------------------------------------------------------------------
create or replace function public.convert_lead(
  p_lead_id uuid,
  p_organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.leads%rowtype;
  v_org_id uuid;
begin
  if not public.is_internal_staff() then
    raise exception 'convert_lead: caller is not internal staff';
  end if;

  select * into v_lead
  from public.leads
  where id = p_lead_id and deleted_at is null
  for update;

  if not found then
    raise exception 'convert_lead: lead % not found', p_lead_id;
  end if;
  if v_lead.status = 'converted' then
    raise exception 'convert_lead: lead % is already converted', p_lead_id;
  end if;
  if p_organization_name is null or length(trim(p_organization_name)) = 0 then
    raise exception 'convert_lead: organization name is required';
  end if;

  insert into public.organizations (name, plan_tier, created_by, updated_by)
  values (trim(p_organization_name), 'trial', auth.uid(), auth.uid())
  returning id into v_org_id;

  update public.leads
  set status = 'converted',
      converted_organization_id = v_org_id,
      updated_by = auth.uid()
  where id = p_lead_id;

  if v_lead.health_check_submission_id is not null then
    update public.health_check_submissions
    set organization_id = v_org_id
    where id = v_lead.health_check_submission_id;
    -- NOTE: health_scores is insert-only (ADR-006) and is deliberately NOT
    -- updated. Pre-conversion scores become member-visible through the
    -- submission linkage — see the replacement RLS policy below.
  end if;

  insert into public.audit_logs (actor_id, action, target_table, target_id, after)
  values (
    auth.uid(), 'lead.convert', 'leads', p_lead_id,
    jsonb_build_object('organization_id', v_org_id, 'organization_name', trim(p_organization_name))
  );

  return v_org_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. health_scores visibility through submission linkage.
-- Scores persisted before conversion carry organization_id = null forever
-- (insert-only). Members must still see them once their submission is
-- linked, so the policy derives access through the submission join.
-- ----------------------------------------------------------------------------
-- Linkage must be resolved through a security-definer helper: an inline
-- EXISTS on health_check_submissions would itself be filtered by that
-- table's RLS (which members don't pass), silently hiding the scores.
-- Same pattern as is_org_member — found by live testing.
create or replace function public.submission_organization(sub_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.health_check_submissions where id = sub_id;
$$;

drop policy health_scores_select_members on public.health_scores;
create policy health_scores_select_members
  on public.health_scores for select
  using (
    (organization_id is not null and public.is_org_member(organization_id))
    or (
      submission_id is not null
      and public.is_org_member(public.submission_organization(submission_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Internal staff read access to health-check data.
-- Found by live testing: analysts must review submissions to work leads —
-- deny-all (0005) was correct for clients/prospects but must not block the
-- staff whose job is processing them. Read-only: staff never mutate
-- submissions except through convert_lead's linkage step.
-- ----------------------------------------------------------------------------
create policy health_check_submissions_internal_read
  on public.health_check_submissions for select
  using (public.is_internal_staff());

create policy health_scores_internal_read
  on public.health_scores for select
  using (public.is_internal_staff());

comment on function public.is_internal_staff is
  'Internal staff = live member of the single is_platform_owner organization. The ONLY internal-staff check; never test role names or user lists inline.';
comment on function public.convert_lead is
  'Atomic: client org + submission/score linkage + lead status + audit, or nothing. Internal staff only.';
