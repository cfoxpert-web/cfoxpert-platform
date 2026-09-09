-- ============================================================================
-- Migration 0020: split mapping confidence from amount confidence (A4-d)
--
-- `extracted_lines.confidence` was carrying two different meanings at once:
-- confidence that the AMOUNT was read correctly (legitimately 1.0 for a
-- deterministically parsed cell — no model is involved) and confidence in
-- the KPI MAPPING (which, for an unmapped line, does not exist).
--
-- The review screen rendered the single column, so every parsed row showed
-- "100%" beside "— not mapped —". That is a contradiction on its face, and
-- an operator who sees the screen contradict itself stops trusting every
-- other number on it. Two meanings need two columns.
--
-- `confidence` keeps its existing meaning (the amount). `mapping_confidence`
-- is NULL whenever `proposed_kpi_key` is NULL — enforced by a check
-- constraint, so the contradiction cannot be reintroduced from any writer.
-- ============================================================================

alter table public.extracted_lines
  add column mapping_confidence numeric(3, 2)
    check (mapping_confidence between 0 and 1);

comment on column public.extracted_lines.confidence is
  'Confidence in the AMOUNT as read from the source (1.0 = deterministic parser cell). Never a statement about the KPI mapping.';

comment on column public.extracted_lines.mapping_confidence is
  'Confidence in the proposed KPI mapping. NULL when proposed_kpi_key is NULL — a line with no mapping has no mapping confidence.';

-- Existing rows predate the split: their `confidence` described the amount,
-- so a mapping confidence is only meaningful where a key was proposed.
update public.extracted_lines
  set mapping_confidence = confidence
  where proposed_kpi_key is not null
    and mapping_confidence is null;

-- The contradiction is now structurally impossible, not merely avoided.
alter table public.extracted_lines
  add constraint extracted_lines_mapping_confidence_requires_key
  check (mapping_confidence is null or proposed_kpi_key is not null);
