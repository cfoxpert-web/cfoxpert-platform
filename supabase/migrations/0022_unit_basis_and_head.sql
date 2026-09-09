-- ============================================================================
-- Migration 0022: unit basis as a first-class field; proposed head on lines
-- Amendment A4-d-3 (corrective slice).
--
-- TWO PROBLEMS, both about a number being wrong with nothing on screen to
-- catch it.
--
-- 1. UNIT BASIS WAS TRAPPED INSIDE SHEET SCOPE.
--    A4-d-2 put `unitBasis` inside `ingestion_jobs.scope`, which only
--    spreadsheet workbooks get. CSVs are deliberately not sheet-scoped (one
--    sheet, no name, no tiered header, no segments), so a Tally CSV export
--    had no unit control at all.
--
--    But scope is three things, not one — sheet, periods, unit — and only
--    the first fails to apply to a CSV. The third applies exactly as much,
--    and it is the 100,000x field: a CSV in rupees read as lakhs produces a
--    balanced statement, reconciling ratios, and a board pack wrong by five
--    orders of magnitude with nothing visible to catch it.
--
--    So unit basis becomes a JOB-level field, applying to every
--    spreadsheet-family upload. `scope.unitBasis` is backfilled into it and
--    is no longer written by application code — `unit_basis` is the single
--    authority, so the two can never disagree.
--
-- 2. THE PROPOSED HEAD WAS COMPUTED AND THROWN AWAY.
--    A4-d-2's scoped extractor classifies each line into a projection head,
--    uses it to decide the contra sign, and then discards it: staged rows
--    carried `proposed_kpi_key = null` and nothing else. On screen that
--    reads as a classifier that failed, when in fact it classified 58 of 66
--    lines correctly and is only waiting on A7-a's head -> KPI roll-up.
--    "Head: employee — mapping pending" and "not mapped" describe the same
--    row and mean opposite things to an operator.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Unit basis on the job
-- ----------------------------------------------------------------------------

alter table public.ingestion_jobs
  add column unit_basis text
    check (unit_basis is null or unit_basis in ('rupees', 'thousands', 'lakhs', 'crores')),
  add column unit_evidence jsonb;

comment on column public.ingestion_jobs.unit_basis is
  'The unit the source figures are printed in, for ANY spreadsheet-family upload including CSVs. NULL means not yet determined; extraction then falls back to per-sheet detection. THE single authority — scope.unitBasis is legacy and no longer written. Conversion to rupees (the stored base) happens at exactly one boundary and the multiplier is recorded in the job note.';

comment on column public.ingestion_jobs.unit_evidence is
  'What the basis was judged from: {"detectedFrom": "...", "largestPrintedValue": n}. Rendered beside the control so an operator confirms against evidence rather than trusting a guess.';

-- Carry forward anything A4-d-2 already wrote into the scope blob.
update public.ingestion_jobs
  set unit_basis = scope ->> 'unitBasis'
  where scope ? 'unitBasis'
    and scope ->> 'unitBasis' in ('rupees', 'thousands', 'lakhs', 'crores')
    and unit_basis is null;

-- ----------------------------------------------------------------------------
-- 2. Proposed head on staged lines
-- ----------------------------------------------------------------------------

alter table public.extracted_lines
  add column proposed_head text;

comment on column public.extracted_lines.proposed_head is
  $c$The projection head the classifier assigned (revenue, cogs, directExp, adminExp, sellingExp, employee, interest, depreciation, otherIncome, otherExp, stockChange), or NULL when no rule matched and the line is a genuine operator exception.

Deliberately NOT a kpi_definitions key and deliberately not a foreign key: heads are the P&L buckets a line-level projection works in, and the head -> KPI roll-up is declared in A7-a (ADR-018). Until then this is what the review screen shows so a classified line reads as "head assigned, mapping pending" rather than "not mapped".$c$;

comment on column public.extracted_lines.proposed_kpi_key is
  'Proposed kpi_definitions key. Still the only thing that can publish (ADR-010). Distinct from proposed_head: the head is the projection bucket, this is the published report metric.';
