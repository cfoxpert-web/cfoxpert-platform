-- ============================================================================
-- Migration 0018: client_reports — published board-report artefacts
--
-- Some clients receive a self-contained HTML board report (audited figures,
-- must render byte-for-byte as supplied). This is the registry + storage
-- for those artefacts: one row per published report, HTML stored verbatim,
-- served ONLY through an authenticated route where RLS decides visibility.
-- Never placed under public/ — the unlisted /r/ pattern is for fictional
-- demo entities only (see changelog 2026-07-25).
--
-- First consumer: Sheetal Mercantile's Board MIS Q1 FY2026-27 (seeded in
-- migration 0019). The client Board Packs page lists these rows.
-- ============================================================================

create table public.client_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),

  title text not null check (char_length(title) between 1 and 200),
  period_label text,
  -- The artefact, verbatim. Byte-for-byte is the contract: audited figures
  -- and layout must render exactly as supplied. Never transformed in SQL.
  html text not null,
  published_at timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

-- One live report per (org, title).
create unique index client_reports_org_title_live_idx
  on public.client_reports (organization_id, title)
  where deleted_at is null;

create index client_reports_org_idx
  on public.client_reports (organization_id, published_at desc)
  where deleted_at is null;

create trigger client_reports_set_updated_at
  before update on public.client_reports
  for each row execute function public.set_updated_at();

alter table public.client_reports enable row level security;

-- Members read their own org's live reports; internal staff read all.
-- Writes are service-role / migration only until a staff publish surface
-- exists.
create policy client_reports_select_members on public.client_reports
  for select using (
    deleted_at is null
    and (public.is_org_member(organization_id) or public.is_internal_staff())
  );

comment on table public.client_reports is
  'Published self-contained HTML board reports, served byte-for-byte through the authenticated /dashboard/reports/[id] route. RLS is the visibility boundary.';
