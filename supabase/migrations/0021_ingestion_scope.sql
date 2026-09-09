-- ============================================================================
-- Migration 0021: resolved scope on ingestion jobs (Amendment A4-d-2)
--
-- ADR-011 stage 1: nothing is staged until scope is resolved — which sheet,
-- which columns, which period, which unit. A4-d-1 built the model that reads
-- those choices out of a workbook; this migration is where a CHOSEN scope
-- lives, so extraction can stop flattening every sheet into one list.
--
-- IN-FLIGHT JOBS ARE UNAFFECTED. Every column added here is nullable and
-- every existing row keeps `scope = null`, which the extraction path reads
-- as "no scope resolved — use the legacy unscoped behaviour". No job moves
-- stage, nothing already published is touched, and nothing queued can get
-- stuck in a state the UI cannot clear.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The awaiting_scope stage
-- ----------------------------------------------------------------------------
-- Sits between 'received' and 'approved'. A job reaches it only when an
-- analyst has approved processing AND the workbook offers more than one
-- plausible reading. It is NOT a new gate: the approve-to-process decision
-- still happens exactly where it did, and auto-selection fills the scope
-- field rather than skipping the approval step.
--
-- NOTE: this value is added and deliberately NOT used anywhere in this
-- migration. Postgres forbids using a newly added enum value in the same
-- transaction that adds it.
alter type public.ingestion_stage add value if not exists 'awaiting_scope' after 'received';

-- ----------------------------------------------------------------------------
-- 2. Scope columns
-- ----------------------------------------------------------------------------

alter table public.ingestion_jobs
  add column scope jsonb,
  add column scope_options jsonb,
  add column scope_warnings text[] not null default '{}',
  add column workbook_fingerprint jsonb;

comment on column public.ingestion_jobs.scope is
  $c$The RESOLVED scope, or null for jobs that predate A4-d-2 / have no sheet scope (PDFs, single-sheet CSVs). Shape:
  {
    "sheetName": "26-27 Projection",
    "periods": [ {"segment": "Total", "canonicalDate": "2026-03-31"}, ... ],
    "unitBasis": "rupees",
    "source": "auto" | "operator"
  }

`periods` is an ARRAY of (segment, date) pairs and is intentionally unbounded.
Two consequences worth stating so nobody later mistakes the UI for the schema:

  1. A period is addressed by SEGMENT AND DATE, never by date alone. This
     workbook carries 31.03.2026 three times per block (Dhaulana, Greater
     Noida, Total); a date-only address silently returns the leftmost plant
     labelled as the company (ADR-014 addendum).
  2. A4-d-2's picker offers ONE segment at a time, but the schema already
     holds the full segment set. A7-e projects per segment and consolidates
     (ADR-014), so it will write Dhaulana, Greater Noida AND Total into this
     same array. That needs no migration — do not write one.

`source` distinguishes an inferred scope from a chosen one. These are
different facts: asked about a figure six months on, "nobody chose this, the
system inferred it" and "the operator selected this" point at different
places to look.$c$;

comment on column public.ingestion_jobs.scope_options is
  'What the workbook actually OFFERS, as read at introspection: per sheet, candidate line count, period columns, segments, detected unit and its evidence. Drives the picker, and is what a chosen scope is validated against — a scope naming a sheet or date the workbook lacks is refused, never coerced.';

comment on column public.ingestion_jobs.scope_warnings is
  'Anything the bounded read clipped or could not determine (truncated rows/columns, an undeterminable unit basis, sides disagreeing on dates). Rendered in the PICKER, not only in the job note — the moment of choosing is the only moment an operator can act on them.';

comment on column public.ingestion_jobs.workbook_fingerprint is
  $c$Cheap structural signature — sheet count, sheet names, per-sheet header shape. Two monthly exports from one Tally template fingerprint identically even though every figure differs.

NOTHING READS THIS YET, deliberately. It exists so scope MEMORY is possible later: a client uploading the same export every month should not meet the picker every month (ADR-016 applied one level up). Adding the column now is trivial; backfilling a fingerprint across historical jobs is not.$c$;

-- Jobs parked for a scope decision, newest first — the picker's work queue.
create index ingestion_jobs_awaiting_scope_idx
  on public.ingestion_jobs (updated_at desc)
  where deleted_at is null and scope is null;

-- ----------------------------------------------------------------------------
-- 3. What a scope must contain, if present
-- ----------------------------------------------------------------------------
-- Deliberately shallow: enough to stop a structurally broken scope reaching
-- the extractor, without duplicating validateScopeChoice() in SQL. The real
-- validation is in application code (migration 0001's contract: jsonb is
-- interpreted in app code, never in SQL), because only the app has the
-- workbook to check the choice against.
alter table public.ingestion_jobs
  add constraint ingestion_jobs_scope_shape check (
    scope is null
    or (
      jsonb_typeof(scope -> 'periods') = 'array'
      and jsonb_array_length(scope -> 'periods') > 0
      and jsonb_typeof(scope -> 'sheetName') = 'string'
      and scope ->> 'source' in ('auto', 'operator')
    )
  );
