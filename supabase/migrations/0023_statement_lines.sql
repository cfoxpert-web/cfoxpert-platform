-- ============================================================================
-- Migration 0023: statement_lines — the line-level fact table (Amendment A7-a)
--
-- ADR-018: lines are the fact table; kpi_values becomes a DERIVED ROLLUP.
-- The two must never become independent sources that can disagree, so the
-- rollup runs in one direction only and a test recomputes it from these rows.
--
-- Why this exists: kpi_values is KPI-level over a ~20-key catalogue, and
-- extracted_lines is staging (mutable, staff-only, soft-deleted on
-- re-extraction, addressed by job rather than period). Neither can hold the
-- 66 lines of a real scoped ledger, and §8's line-level projection — which
-- the audit trail depends on — was impossible until one could.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Head status — a null head must be a STATE, not an absence
-- ----------------------------------------------------------------------------
-- Eight of RPIL's 66 lines are genuine expenses awaiting a head. That is a
-- different fact from "reviewed, and no head applies". If both render as a
-- null head, then in six months nobody can tell an untouched line from a
-- deliberate decision.
create type public.head_status as enum (
  'classified',      -- a head is assigned
  'unclassified',    -- a real line still waiting for a head
  'not_applicable'   -- reviewed; deliberately rolls up to nothing
);

-- ----------------------------------------------------------------------------
-- 2. head_kpi_map — the rollup declaration, as DATA (ADR-004), VERSIONED
-- ----------------------------------------------------------------------------
-- The map is data, and data changes. The day a head is remapped, recomputing
-- a historical period under the NEW map produces a different answer from the
-- kpi_values published under the OLD one — and those rows are insert-only and
-- will not move. A reconciliation test written against "the current map"
-- would go red on perfectly correct history, and the pressure would be to
-- weaken the test, which is how a real reconciliation failure gets waved
-- through later.
--
-- So each version is a COMPLETE SNAPSHOT of the map, and every derived
-- kpi_values row records the version that produced it. Recomputation is then
-- `where version = <the version stamped on the row>` — a recorded fact, not a
-- timestamp inference that two same-millisecond writes or clock skew could
-- resolve differently.
create table public.head_kpi_map (
  version integer not null,
  head text not null,
  kpi_key text not null references public.kpi_definitions (key),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  primary key (version, head)
);

create trigger head_kpi_map_insert_only
  before update or delete on public.head_kpi_map
  for each row execute function public.reject_mutation();

alter table public.head_kpi_map enable row level security;

create policy head_kpi_map_select_authenticated on public.head_kpi_map
  for select to authenticated using (true);

comment on table public.head_kpi_map is
  'Projection head → kpi_definitions.key, as data (ADR-004). INSERT-ONLY and versioned: each version is a complete snapshot, and kpi_values.head_map_version records which snapshot produced a row, so historical periods always recompute under the map that was in force when they were published. To change the map, insert a whole new version.';

create or replace function public.current_head_map_version()
returns integer
language sql
stable
set search_path = public
as $$ select coalesce(max(version), 1) from public.head_kpi_map $$;
-- ----------------------------------------------------------------------------
-- 3. KPI definitions the rollup needs
-- ----------------------------------------------------------------------------
insert into public.kpi_definitions
  (key, label, unit, category, ideal_min, ideal_max, higher_is_better, sort_order, active)
values
  ('cost_of_goods_sold', 'Cost of Goods Sold', 'INR', 'profitability', null, null, false, 170, true),
  ('direct_expenses',    'Direct Expenses',    'INR', 'profitability', null, null, false, 180, true),
  ('selling_expenses',   'Selling Expenses',   'INR', 'profitability', null, null, false, 190, true),
  ('employee_cost',      'Employee Cost',      'INR', 'profitability', null, null, false, 200, true),
  ('other_expenses',     'Other Expenses',     'INR', 'profitability', null, null, false, 210, true),
  -- A DATA-QUALITY metric, deliberately a first-class KPI so it travels the
  -- existing read path and cannot be quietly ignored. See the note on
  -- statement_lines below: unclassified lines are all expenses, so dropping
  -- them silently understates cost and flatters every margin and ratio.
  ('unclassified_value', 'Unclassified Value', 'INR', 'other', null, 0, false, 900, true)
on conflict (key) do update
  set label = excluded.label, unit = excluded.unit, category = excluded.category,
      ideal_max = excluded.ideal_max, higher_is_better = excluded.higher_is_better,
      sort_order = excluded.sort_order, active = true;

-- ----------------------------------------------------------------------------
-- 3b. Seed head_kpi_map — AFTER the definitions it references
-- ----------------------------------------------------------------------------
-- ORDER IS LOAD-BEARING. head_kpi_map.kpi_key is a foreign key into
-- kpi_definitions, so this insert cannot run before the definitions above
-- exist. The first version of this migration seeded the map in section 2,
-- above the definitions, and failed on the live database with
--   insert or update on table "head_kpi_map" violates foreign key
--   constraint "head_kpi_map_kpi_key_fkey"
--   DETAIL: Key (kpi_key)=(cost_of_goods_sold) is not present in
--           table "kpi_definitions".
-- The file-parsing test that was supposed to catch this searched the
-- migration TEXT for the key and found it 16 lines further down, so it
-- passed. A migration is only correct when a database says so — see
-- .github/workflows/db-verify.yml, which now applies every migration to a
-- real Postgres and asserts against the resulting STATE.

-- Version 1. Heads are lib/ingestion/head-classify.ts's PROJECTION_HEADS.
--
-- stockChange maps to cost_of_goods_sold rather than to a metric of its own.
-- That is the accounting identity, not a convenience: opening stock plus
-- purchases less closing stock IS cost of goods sold, and closing stock is
-- already carried negative as a contra. Leaving it unmapped was the first
-- draft of this migration, and the golden test caught it immediately —
-- unmapped heads fall through to unclassified, which both inflated the
-- unclassified figure and silently removed the stock movement from COGS,
-- breaking gross profit. EVERY head must map somewhere.
insert into public.head_kpi_map (version, head, kpi_key) values
  (1, 'revenue',      'revenue'),
  (1, 'stockChange',  'cost_of_goods_sold'),
  (1, 'cogs',         'cost_of_goods_sold'),
  (1, 'directExp',    'direct_expenses'),
  (1, 'adminExp',     'indirect_expenses'),
  (1, 'sellingExp',   'selling_expenses'),
  (1, 'employee',     'employee_cost'),
  (1, 'interest',     'finance_cost'),
  (1, 'depreciation', 'depreciation'),
  (1, 'otherIncome',  'other_income'),
  (1, 'otherExp',     'other_expenses');

-- ----------------------------------------------------------------------------
-- 4. statement_lines — the fact table
-- ----------------------------------------------------------------------------
create table public.statement_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  kpi_period_id uuid not null references public.kpi_periods (id),
  -- NULL = consolidated / whole organization, matching kpi_values.segment
  -- (migration 0009). Units are a dimension, not child orgs (ADR-019).
  segment text,

  -- ---- Identity
  source_label text not null,
  -- normalizeLabel() in lib/ingestion/normalize.ts. Same contract as
  -- account_mappings: change that function and every stored key shifts.
  source_label_normalized text not null,
  head text,
  head_status public.head_status not null default 'classified',
  sort_order integer not null default 0,

  -- ---- The figure, in RUPEES (the platform's one stored base unit)
  amount numeric(18, 2) not null,

  -- ---- PROVENANCE, from the outset and NOT NULL where it can be.
  -- Retrofitting these means backfilling nulls across insert-only financial
  -- rows, and a null provenance is indistinguishable from an unrecorded one.
  document_id uuid not null references public.client_documents (id),
  job_id uuid not null references public.ingestion_jobs (id),
  extracted_line_id uuid references public.extracted_lines (id),
  source_sheet text,
  source_cell text,
  unit_basis text not null,
  unit_multiplier numeric not null,
  -- 'auto' | 'operator' — whether a human chose the scope or the system
  -- inferred it. Different facts, and only one points at where to look.
  scope_source text,

  -- ---- Reserved for A7-b. Nullable now, populated when a line is
  -- projected rather than observed. Same reasoning as everything above:
  -- adding columns now is trivial, backfilling insert-only rows is not.
  basis text,
  driver text,
  driver_value numeric,
  base_value numeric,
  factor numeric,

  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
  -- No updated_*/deleted_at: insert-only by design (ADR-006). A correction
  -- is a new row, exactly as it is for kpi_values.
);

create index statement_lines_lookup_idx
  on public.statement_lines (kpi_period_id, segment, source_label_normalized, created_at desc);

create index statement_lines_org_idx
  on public.statement_lines (organization_id, kpi_period_id);

create index statement_lines_head_idx
  on public.statement_lines (kpi_period_id, head)
  where head is not null;

create trigger statement_lines_insert_only
  before update or delete on public.statement_lines
  for each row execute function public.reject_mutation();

comment on table public.statement_lines is
  $c$A7-a: the line-level FACT TABLE. Insert-only (ADR-006); kpi_values is a derived rollup of these rows (ADR-018), never an independent source.

Unclassified lines ARE stored, with head null and head_status 'unclassified'. A fact table that silently omits rows cannot be reconciled to its source, and reconciling to the client's own figures is the trust model of this whole feature — RPIL's PBT less its eight unclassified lines is exactly the accountant's stated net profit, which only checks out because those eight are recorded.

The rollup skips null-head lines, and that omission is made LOUD rather than silent: every unclassified line is an expense, so dropping them understates cost, overstates profit, and moves every margin, ratio and health-score component in the flattering direction. The rollup therefore also writes an 'unclassified_value' KPI for the period so the figure appears on the report. Silent omission that biases toward good news is the worst failure this system could have.$c$;

comment on column public.statement_lines.head_status is
  'classified = head assigned; unclassified = a real line still awaiting a head (rolls up to nothing, counted in unclassified_value); not_applicable = reviewed and deliberately rolls up to nothing. Distinguishes an untouched line from a decision.';

-- Canonical latest-row-per-line rule, mirroring kpi_current_values (0009).
-- security_invoker so the table's RLS applies to whoever queries the view.
create view public.statement_lines_current
with (security_invoker = true)
as
select distinct on (l.kpi_period_id, l.segment, l.source_label_normalized)
  l.*
from public.statement_lines l
order by l.kpi_period_id, l.segment, l.source_label_normalized, l.created_at desc;

comment on view public.statement_lines_current is
  'Canonical latest row per (period, segment, normalized label). A correction is a new row; this is what the rollup and every reader consume.';

alter table public.statement_lines enable row level security;

-- Members read their own org's lines; staff read all (the M9/0015 pattern).
-- Writes stay service-role: publishing goes through the staff-gated action.
create policy statement_lines_select_members on public.statement_lines
  for select using (
    public.is_org_member(organization_id) or public.is_internal_staff()
  );

-- ----------------------------------------------------------------------------
-- 5. kpi_values learns where it came from
-- ----------------------------------------------------------------------------
alter table public.kpi_values
  add column source_statement_line_ids uuid[],
  add column head_map_version integer;

comment on column public.kpi_values.source_statement_line_ids is
  'The statement_lines this value was rolled up from. Makes "lines are the fact table, KPI is derived" checkable rather than merely asserted — a value should always be reproducible from the rows it names.';

comment on column public.kpi_values.head_map_version is
  'The head_kpi_map version in force when this row was published. Recomputation MUST use this version, not the current one, or remapping a head turns every historical period into a false reconciliation failure.';

-- ----------------------------------------------------------------------------
-- 6. Mapping memory learns heads (ADR-017)
-- ----------------------------------------------------------------------------
alter table public.account_mappings
  add column head text;

comment on column public.account_mappings.head is
  'Analyst-confirmed projection head for this label. An operator who overrides the classifier is teaching it: the correction applies deterministically on this client''s next upload. A classifier default that cannot be corrected is worse than a dropdown.';

-- kpi_key was required when a mapping meant "label → KPI". Under ADR-018 a
-- mapping can now legitimately carry a head alone, so relax it and require
-- that a row says at least one useful thing.
alter table public.account_mappings
  alter column kpi_key drop not null;

alter table public.account_mappings
  add constraint account_mappings_says_something
  check (kpi_key is not null or head is not null);
