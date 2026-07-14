-- ============================================================================
-- Migration 0013: document ingestion schema (Amendment A4-a)
--
-- The full A4 data shape lands in one migration so A4-b (extraction) and
-- A4-c (review/publish) are pure application code:
--   client_documents     — uploaded TB/P&L/BS files (metadata; bytes live in
--                          a PRIVATE Supabase Storage bucket, service-role
--                          access only — see storage note below)
--   ingestion_jobs       — the pipeline entity, one per document
--   ingestion_job_events — insert-only stage history (mirrors the
--                          status_history PATTERN; deliberately does NOT
--                          extend work_status — pipeline stages are not the
--                          generic workflow shape, per ADR-010)
--   extracted_lines      — MUTABLE staging for extracted numbers; nothing
--                          here is client-visible or published
--   account_mappings     — org-scoped mapping memory: once an analyst
--                          confirms "this ledger label = this KPI", later
--                          uploads map deterministically (ADR-010)
--
-- STORAGE NOTE: file bytes go in bucket 'client-documents' under
-- <org_id>/<document_id>/<filename>. The bucket is created lazily by the
-- upload server action via the service-role client and has NO storage RLS
-- policies — clients never touch storage directly; every read/write goes
-- through a server action that checks membership first, with RLS on
-- client_documents as the row-level tenancy record. (Deliberate: creating
-- storage.objects policies from external-connection migrations is
-- permission-fragile in Supabase; the service-role boundary is the M8
-- precedent and every such write carries an audit_logs entry.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------

create type public.document_kind as enum (
  'trial_balance', 'pnl', 'balance_sheet', 'stock_statement', 'other'
);

-- Pipeline stages (ADR-010): two human gates — approve-to-process and
-- confirm-to-publish. 'received' is where client uploads wait for an analyst.
create type public.ingestion_stage as enum (
  'received', 'approved', 'extracting', 'needs_review',
  'published', 'rejected', 'failed'
);

-- ----------------------------------------------------------------------------
-- 2. client_documents
-- ----------------------------------------------------------------------------

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),

  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 300),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  kind public.document_kind not null default 'other',
  -- Free-text hint from the uploader ("FY26", "Jun 2026") — the extraction
  -- pass proposes real dated periods; this only helps it.
  period_hint text,
  -- true when an internal analyst uploaded on the client's behalf.
  uploaded_by_staff boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index client_documents_org_idx
  on public.client_documents (organization_id, created_at desc)
  where deleted_at is null;

create trigger client_documents_set_updated_at
  before update on public.client_documents
  for each row execute function public.set_updated_at();

alter table public.client_documents enable row level security;

create policy client_documents_select_members on public.client_documents
  for select using (
    public.is_org_member(organization_id) or public.is_internal_staff()
  );

create policy client_documents_insert_members on public.client_documents
  for insert with check (
    public.is_org_member(organization_id) or public.is_internal_staff()
  );

-- No client UPDATE/DELETE policies: document metadata is immutable once
-- uploaded; removal is a staff soft-delete (service role until A4-c).

comment on table public.client_documents is
  'Uploaded financial documents (A4). Bytes live in the private client-documents storage bucket, service-role access only; this row is the tenancy record.';

-- ----------------------------------------------------------------------------
-- 3. ingestion_jobs + insert-only stage history
-- ----------------------------------------------------------------------------

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  document_id uuid not null references public.client_documents (id),

  stage public.ingestion_stage not null default 'received',
  -- Analyst-facing note for the current stage (rejection reason, failure
  -- detail). Coarse stage is member-visible; this note is staff context.
  stage_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

-- One live job per document.
create unique index ingestion_jobs_document_live_idx
  on public.ingestion_jobs (document_id)
  where deleted_at is null;

create index ingestion_jobs_org_stage_idx
  on public.ingestion_jobs (organization_id, stage)
  where deleted_at is null;

create trigger ingestion_jobs_set_updated_at
  before update on public.ingestion_jobs
  for each row execute function public.set_updated_at();

create table public.ingestion_job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ingestion_jobs (id),
  from_stage public.ingestion_stage,
  to_stage public.ingestion_stage not null,
  note text,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

create index ingestion_job_events_job_idx
  on public.ingestion_job_events (job_id, changed_at desc);

create trigger ingestion_job_events_insert_only
  before update or delete on public.ingestion_job_events
  for each row execute function public.reject_mutation();

-- Auto-record creation and every stage transition (the status_history
-- pattern from migration 0005, on this pipeline's own enum).
create or replace function public.record_ingestion_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ingestion_job_events (job_id, from_stage, to_stage, note, changed_by)
    values (new.id, null, new.stage, new.stage_note, auth.uid());
  elsif tg_op = 'UPDATE' and new.stage is distinct from old.stage then
    insert into public.ingestion_job_events (job_id, from_stage, to_stage, note, changed_by)
    values (new.id, old.stage, new.stage, new.stage_note, auth.uid());
  end if;
  return new;
end;
$$;

create trigger ingestion_jobs_record_stage_change
  after insert or update on public.ingestion_jobs
  for each row execute function public.record_ingestion_stage_change();

alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_job_events enable row level security;

-- Members see their org's jobs (coarse pipeline status on the Documents
-- page); staff see everything.
create policy ingestion_jobs_select_members on public.ingestion_jobs
  for select using (
    public.is_org_member(organization_id) or public.is_internal_staff()
  );

-- Members can only create jobs at 'received' (the analyst-approval gate);
-- staff may create at any stage (their own uploads auto-approve).
create policy ingestion_jobs_insert_members on public.ingestion_jobs
  for insert with check (
    (public.is_org_member(organization_id) and stage = 'received')
    or public.is_internal_staff()
  );

-- Stage transitions are STAFF-only (approve/reject/etc.). The extraction
-- service (A4-b) writes via service role and bypasses RLS.
create policy ingestion_jobs_update_staff on public.ingestion_jobs
  for update using (public.is_internal_staff())
  with check (public.is_internal_staff());

-- Event timeline is staff-only: notes carry analyst context; members get
-- the current stage from the job row.
create policy ingestion_job_events_select_staff on public.ingestion_job_events
  for select using (public.is_internal_staff());

comment on table public.ingestion_jobs is
  'A4 pipeline entity, one live job per document. Stages per ADR-010; transitions auto-recorded in ingestion_job_events.';

-- ----------------------------------------------------------------------------
-- 4. extracted_lines (staging — staff-only, mutable until publish)
-- ----------------------------------------------------------------------------

create table public.extracted_lines (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ingestion_jobs (id),

  statement public.document_kind not null,
  -- The label exactly as printed in the source document — the key into
  -- account_mappings after normalization.
  source_label text not null,
  amount numeric(18, 2),
  period_label text,
  period_start date,
  period_end date,
  segment text,
  -- Proposal only (parser/model/mapping-memory); publish happens in A4-c
  -- through the insert-only kpi path, never from this table directly.
  proposed_kpi_key text references public.kpi_definitions (key),
  confidence numeric(3, 2) check (confidence between 0 and 1),
  -- Page/cell reference in the source ("page 3", "Sheet1!C14").
  provenance text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create index extracted_lines_job_idx
  on public.extracted_lines (job_id)
  where deleted_at is null;

create trigger extracted_lines_set_updated_at
  before update on public.extracted_lines
  for each row execute function public.set_updated_at();

alter table public.extracted_lines enable row level security;

-- Unreviewed numbers are NEVER client-visible: staff-only in every verb.
create policy extracted_lines_staff_all on public.extracted_lines
  for all using (public.is_internal_staff())
  with check (public.is_internal_staff());

comment on table public.extracted_lines is
  'A4 staging for extracted statement lines. Mutable until publish; staff-only; published values live in kpi_values (insert-only), never here.';

-- ----------------------------------------------------------------------------
-- 5. account_mappings (org-scoped mapping memory)
-- ----------------------------------------------------------------------------

create table public.account_mappings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),

  -- lower-cased, whitespace-collapsed source label; normalization happens
  -- in application code (one implementation, lib/documents).
  source_label_normalized text not null,
  kpi_key text not null references public.kpi_definitions (key),
  segment text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  deleted_at timestamptz
);

create unique index account_mappings_org_label_live_idx
  on public.account_mappings (organization_id, source_label_normalized)
  where deleted_at is null;

create trigger account_mappings_set_updated_at
  before update on public.account_mappings
  for each row execute function public.set_updated_at();

alter table public.account_mappings enable row level security;

-- Internal mapping data: staff-only.
create policy account_mappings_staff_all on public.account_mappings
  for all using (public.is_internal_staff())
  with check (public.is_internal_staff());

comment on table public.account_mappings is
  'A4 mapping memory (ADR-010): analyst-confirmed source-label → KPI mappings, applied deterministically on later uploads so the model is only consulted for unknown labels.';

-- ----------------------------------------------------------------------------
-- 6. Feature flag registry row (mirrors lib/feature-flags.ts)
-- ----------------------------------------------------------------------------

insert into public.feature_flags (key, enabled, description) values
  ('docIngestion', false, 'Amendment A4: document upload + ingestion pipeline.')
on conflict (key) do nothing;
