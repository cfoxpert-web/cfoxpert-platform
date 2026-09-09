# Stage 0 — Extraction rebuild (A4-d/e) and the projection engine (A7)

**Status: PLANNING ONLY. Nothing in this document has been implemented.**
**Date:** 2026-09-09. **Author:** engineering session, for Parth's approval.

This is the audit-and-amend deliverable. It contains: what the repo actually
does today measured against the brief's §5–§9; the roadmap amendments in the
A1–A6 format; the ADRs drafted ready to append to `Decisions.md` on approval;
the first implementable slice; and answers to the §10 open questions.

Nothing here is appended to `Decisions.md` or `Integration Roadmap.md` yet.
Those files are append-only by their own contract, and appending decisions
whose numbering and wording you have not seen would mean superseding entries
later rather than editing them. One word of approval and they get pasted in
verbatim.

---

## 0. Where this prompt and the repo disagree

Four items, stated before anything else per the brief's instruction.

**1. `docs/Project State.md` does not exist.** The repo has
`docs/Changelog.md` (46 KB, reverse-chronological, one entry per milestone).
That is the de facto project state and I read it in full. If you have a
separate Project State document, it is not in this repo — send it. Otherwise
I would propose creating one as a short standing "where we are now" page,
distinct from the Changelog's history.

**2. `CFOXPERT_Master_Prompt_A7-A9_Projections.md` is not in the repo.** So I
cannot check this prompt against it, and I do not have the §5 (superseded
assumptions section), §8 (three articulated statements), A8 (Projections tab)
or A9 (export) specifications it carries. §8 of this brief says the three
statements are "as specified in the superseded prompt and unchanged" — I have
no access to that specification. Either send the file or I will spec the
statements fresh in A7-d and you review that spec instead.

**3. A10 is referenced but never defined.** §4 asks for "A8/A9/A10
dependencies noted". A8 (Projections tab) and A9 (export) are inferable from
the entitlement keys already in `lib/entitlements.ts`
(`report.projections_forecasting`, `report.projections_modelling`). A10
appears nowhere — not in this brief, not in the roadmap, not in the code.
Tell me what A10 is and I will sequence it.

**4. Migrations run to 0019, not 0013.** §0 asks me to read 0001–0013. I read
0001–0019. The six you did not name matter to this work: **0014** ingestion
validation, **0015** staff read for review, **0016** Sheetal onboarding,
**0017** submission phone, **0018–0019** the client-report artefact registry.

**5. A naming point, not a disagreement.** §4 calls the review redesign
"A4-c". A4-c already shipped (Changelog, 2026-07-22 — the publish verb, the
review queue, migration 0015). Reusing the name breaks the ledger. I have
named the new work **A4-d** and **A4-e** below. Say the word if you want it
numbered differently.

**6. One factual contradiction that changes an ADR.** §2 of the brief
describes RPIL's Dhaulana / Greater Noida sheets as **"two legal units"**, and
§3 freezes an ADR that "entity is a first-class dimension". But migration 0009
recorded the opposite, deliberately and with reasoning: *"RPIL's branches
(Greater Noida / Dhaulana / Telangana) are units of ONE legal entity —
depreciation, finance cost and tax are determined company-wide — so they are a
dimension of the client's data, NOT child organizations."* That is why
`kpi_values.segment` exists and why `organizations.parent_organization_id`
(ADR-008) was left reserved for real group structures.

Both cannot be true. This is not cosmetic: if RPIL's units are one legal
entity, consolidation is **summation of a shared tax and finance-cost base**
and `segment` is already the right dimension. If they are two legal entities,
consolidation needs inter-company elimination and each unit needs its own tax
computation and its own balance sheet. **I need your answer before A7-e is
specified.** My reading of the evidence — one PAN, one set of audited
financials, company-wide depreciation — says 0009 is right and "legal units"
in the brief is loose language for "business units". Confirm.

---

## 1. Audit: §5–§9 against what the code actually does

Reading order was as instructed: the ingestion path
(`lib/documents/actions.ts` → `lib/ingestion/{run,parse-spreadsheet,
spreadsheet-file,extract-claude,mapping,normalize,validate}.ts`), the review
screen (`app/(portal)/dashboard/review/[jobId]/page.tsx` →
`components/dashboard/review/{gate-results,review-form}.tsx` →
`lib/review/{queries,actions}.ts`), `lib/kpi/*`, `lib/health-check/
financial-score.ts`, `lib/entitlements.ts`, migrations 0001–0019.

**Headline: your diagnosis is right, and the split is roughly 70/30 logic to
UI — but not where you would guess.** Three of the four things that destroyed
your trust on screen are cheap. The thing that looks cheapest (the review
screen) is the one that cannot be fixed without the parser rewrite, exactly
as you said. And there is one structural gap the brief does not name that
blocks A7 entirely.

### 1.1 The four on-screen defects, traced to source

| What you saw | Root cause | Class | Cost |
|---|---|---|---|
| "deterministic parse · validation checks passed" with all 5 checks not-applicable | `lib/ingestion/run.ts:233` — the note reads `failures.length > 0 ? "…FAILED" : "validation checks passed"`. Zero **failures** is not zero **checks**. All five gates returned `skipped`, honestly, each with a reason; the summary string lied about them. | **Logic, trivial** | ~10 lines |
| 100% confidence next to "— not mapped —" | `parse-spreadsheet.ts:105` and `:149` set `confidence: 1` unconditionally. One field is carrying two different meanings: *confidence the amount was read correctly* (legitimately 1.0 for a parsed cell) and *confidence in the KPI mapping* (which was null). | **Logic, small + one column** | ~40 lines + migration |
| Footnotes staged as financial lines | Nothing filters rows. `isTotalLabel()` exists in `normalize.ts` but is used **only** by `validate.ts`, never to exclude a row from staging. There is no notion of a note, ratio, percentage or derived row anywhere in the pipeline. | **Logic, real work** | new pure module |
| Two `Total` rows, `ROUND OFF` ₹96.79, `SHORT & EXCESS` | Same cause. Plus no materiality concept. | **Logic + UI** | above + review UI |

The first two are the ones that "destroy operator trust", and they are the two
cheapest things in this entire document. That is worth knowing before we scope
anything large.

### 1.2 §5 Scope before staging — almost entirely missing

| Requirement | Today | Class |
|---|---|---|
| Sheet + period-column picker at upload, two clicks | **Does not exist.** `lib/documents/actions.ts` takes `kind` + free-text `period_hint`. No workbook introspection exists anywhere. | Logic + UI, net-new |
| One chosen sheet reaches staging | **Opposite.** `sheetsToLines()` `flatMap`s **every** sheet into one list. This is the single line that produced your four-sheet, two-unit, three-period flattened list. | Logic |
| 33-sheet workbook read | **`spreadsheet-file.ts:14` — `MAX_SHEETS = 10`.** Sheets 11–33 were silently discarded. Not truncated with a warning; discarded. | Logic, defect |
| T-format (debits left, credits right, two Particulars columns) | **Not handled.** `findDebitCreditColumns()` finds *one* Dr/Cr pair and hardcodes `labelCol: 0`. A two-sided sheet reads as one block with the credit side's labels lost. | Logic, real work |
| Closing stock signed as a contra; credit-side costs → other income | Not modelled at all. | Logic |
| Hand-typed heading variance (`31.03.2026` vs `31.03.026`) | No period parsing in the deterministic rung whatsoever. `periodStart/End` are hardcoded `null` (`run.ts:163-164`). Only the Claude rung proposes dates. | Logic |
| Section headings carrying roll-up figures | Not modelled — staged as a line, with its subtotal. | Logic |
| Derived / total / footnote / ratio / % rows never staged | Not modelled. | Logic |
| Indented sub-lines inherit parent | Not modelled. Worse: in the Dr/Cr branch `labelCol` is forced to 0, so structure is lost before it can be read. | Logic |
| Formula cells: prefer saved result | **Already correct.** `spreadsheet-file.ts:coerceCell` reads `value.result` first. | Done |
| Resolve a formula from the sheets it points at | Not done — **and I would push back on building it.** Writing a partial Excel evaluator is a large, permanently-owned surface. A formula with no cached result is a rare authoring artefact; the honest move is to surface it as an unreadable cell the operator resolves, not to evaluate it. Recommend: out of scope, revisit only if real files demand it. |
| `#REF!` → zero | Errors currently coerce to `null`, not `0`. One-line fix, but see §10 — I would keep `null` (unreadable) and let the review screen show it, rather than silently zeroing a broken cell. Flagging the divergence from the brief. |
| Units (₹ / thousands / lakhs) detected and converted once | Not done in the deterministic rung. The Claude rung is *instructed* to convert and note it, which is prompt-dependent, not deterministic. | Logic |
| Honest validation, block publish on unidentified type | Gates are **already honest** (each `skipped` carries a reason). Two problems remain: the summary string (above), and — **a real defect I found** — `publishIngestionJob` never reads the job's `validation` column at all. A job with a failed balance-sheet equation publishes with one click, no warning. | Logic, defect |
| Confidence reflects real signal or is not shown | See 1.1. | Logic, small |

### 1.3 §6 Classification by exception — mostly UI, one real logic gap, one net-new asset

**Good news: most of this screen is a UI gap over data that already exists.**
`extracted_lines` already carries `proposed_kpi_key`, `confidence`, `amount`,
`segment`, `provenance`. The counts, the sorting, the grouping controls, the
running rupee counter, the materiality fold and the excluded-lines list are all
renderable from what is staged today. They are blocked not by data but by the
fact that what is staged is garbage — which is why A4-d must precede A4-e.

| Requirement | Class |
|---|---|
| "58 of 69 classified · 6 need a decision · 5 excluded" opening line | **UI only** |
| Group by section, collapsed by default | UI — but needs a `section` on the line, which does not exist. **Logic (small) + UI** |
| Unresolved sorted to top | **UI only** |
| Set a whole group at once, deselect inside it | **UI only** |
| Running counter of unclassified value in ₹ | **UI only** |
| Materiality auto-fold into "Other" | **UI** + a threshold policy (see §10 Q1) |
| Excluded lines listed and reversible | **UI only** (today "not included" and "excluded as a total" are indistinguishable) |
| Memory applies on next upload | **Exists and works.** `account_mappings` + `applyMappingMemory()`. |
| Memory stores head **+ basis + driver + group** | **Schema gap.** Today it stores `(org, normalized_label) → (kpi_key, segment)`. Nothing else. |
| Seeded Indian SME chart-of-accounts matcher | **Does not exist. Net-new, and the highest-leverage item in this document** — it is the difference between "upload one is manual, upload two is easy" and your stated 85% on upload one. |
| Sharp-move confirmation on a remembered mapping | Does not exist; needs a prior-period lookup at extraction time. **Logic, medium** |

### 1.4 §7 The basis engine — nothing exists, but the ground is well prepared

Zero of the eight bases exist. No assumption storage, no driver model, no loan
schedule, no asset block. This is entirely net-new.

Two things make it cheaper than it looks:

- **The house style fits it exactly.** `lib/kpi/engine.ts`, `ratios.ts`,
  `period-comparison.ts` and `health-check/financial-score.ts` are already pure,
  React-free, DB-free, unit-tested modules. The projection engine is the same
  shape. No new pattern to invent, no argument to have.
- **Balance-sheet driver defaults come free.** §7 asks that debtor/inventory/
  creditor days show the client's own history as the default ("64 days — FY
  2025-26 actual"). `lib/kpi/ratios.ts` already computes DSO, DIO and DPO
  correctly, including period-length scaling. The defaults are a read away.

Genuinely new schema: `loan_facilities` (opening balance, drawdowns,
repayments, rate, moratorium), `asset_blocks` (opening WDV, capex plan,
disposals, rate). Both small, both insert-only per ADR-006.

### 1.5 §8 Projection and consolidation — **the gap that blocks everything**

This is the finding the brief does not name, and it needs a decision before a
line of A7 is written.

**There is no line-level financial store in this platform.** There are two
places numbers live and neither can hold a projected line:

1. **`kpi_values`** — the published, insert-only store. It is **KPI-level**:
   one row per (period, `kpi_definition_id`, segment). The whole catalogue is
   about 20 keys (migrations 0004, 0007, 0009). A 63-line ledger cannot be
   stored here as 63 lines. It can only be stored as ~20 aggregates.
2. **`extracted_lines`** — line-level, but it is **staging**: staff-only RLS,
   mutable, soft-deleted on every re-extraction, addressed by `job_id` not by
   period, and explicitly documented as never being the source of published
   values.

And the current publish path enforces the KPI model as a hard rule.
`lib/review/actions.ts:152` rejects the publish outright if **two selected
lines map to the same KPI** — correct under a KPI-level store (the second row
would silently supersede the first under `kpi_current_values`), fatal under a
line-level one. Sixty-three ledger lines rolling up to `indirect_expenses`
cannot publish today. Not "publishes badly" — cannot publish.

§8 requires "Project at line level within a group, not at aggregated KPI level"
because "the audit trail depends on it". That is a new published, insert-only,
period-addressable, line-level table plus a change to the publish verb. It is
the true first milestone of A7 and I have named it **A7-a**.

Everything else in §8 follows from it: articulated BS + CF, closing cash
derived not plugged, short-term borrowing capped at sanctioned limit, funding
gap named by year and shortfall, assets = liabilities asserted in tests, no
NaN, all-zero inputs safe. All net-new, all pure, all testable — but all
downstream of a store that can hold a line.

On per-unit consolidation: `kpi_values.segment` already exists and is the
right dimension **if** the 0009 reading is correct (see §0 item 6). Pending
your answer.

### 1.6 §9 Quality bar — already met structurally

One design system in `tailwind.config.ts`, Inter + Fraunces as specified,
`components/cards`, `components/charts` (recharts) reusable, `ComingSoon` and
locked-tab states already designed. No second design system will be introduced.

One real inconsistency: Indian number formatting is hand-rolled at three call
sites (`review-form.tsx:formatAmount`, `validate.ts:fmt`, and the report tabs).
A single presentation-layer formatter module should absorb them. Small, and it
belongs in A4-e.

### 1.7 Audit summary

| Area | UI gap | Logic gap | Schema gap | Net-new |
|---|---|---|---|---|
| §5 Scope | picker | **most of it** | — | scope model, unit detection |
| §6 Classification | **most of it** | section, sharp-move | memory columns | **SME matcher seed** |
| §7 Basis | all of it | all of it | assumptions, loans, assets | all of it |
| §8 Projection | all of it | all of it | **line-level store (blocking)** | all of it |
| §9 Quality | formatter | — | — | — |

---

## 2. Roadmap amendments (draft, A1–A6 format)

To be appended to `docs/Integration Roadmap.md` under Post-Freeze Amendments
on approval.

### Amendment A4-d — Scope-first extraction
**Requested:** 2026-09-09 (Parth, after using the review screen on RPIL).
**Extends:** A4-b. **Risk:** Medium. **Complexity:** L.

**Requirement:** nothing reaches the review screen until scope is resolved.
One sheet, one period, one entity, one unit basis — chosen by the operator in
two clicks at upload, from a picker the parser populates by introspecting the
workbook.

**Why it needs an amendment:** A4-b's parser was built for clean single-sheet
Tally exports and is correct for those. Real Indian SME working ledgers are
33-sheet workbooks with T-format statements, multi-tier headers, footnotes,
roll-up section headings and several periods and units side by side. The
current parser flattens all of it into one list (`sheetsToLines` `flatMap`),
discards sheets past the tenth, and stages footnotes as financial lines. This
is not a tuning problem; the parser has no concept of scope.

**Scope:**
1. `lib/ingestion/workbook.ts` (pure) — introspect `ParsedSheet[]` into a
   `WorkbookScope[]`: per sheet, the candidate line count, detected period
   columns with canonical dates, whether the layout is two-sided, the
   composed multi-tier header labels (`Dhaulana · 31.03.2027`), the detected
   unit basis (₹ / thousands / lakhs), and the detected entity/unit.
2. `lib/ingestion/row-class.ts` (pure) — classify every row before staging:
   `line · total · subtotal · section_heading · note · ratio · percentage ·
   blank`. Only `line` is staged. Section headings classify the lines beneath
   them and contribute their name, never their value.
3. T-format support: find **every** label column, treat the span after each as
   its own block; closing stock signed as a contra; credit-side lines the
   matcher reads as costs reclassify to other income.
4. Canonical date matching for hand-typed headings; Excel serials rendered as
   dates.
5. Unit detection and single-boundary conversion; one stored base unit.
6. Raise `MAX_SHEETS`; never discard silently — a truncated read is a warning.
7. Scope picker UI at upload; scope persisted on the job.
8. Honesty fixes: kill the "validation checks passed" summary when nothing was
   checked; split `confidence` into amount-confidence and mapping-confidence;
   never render a confidence beside an unmapped line; make `publishIngestionJob`
   read the job's `validation` and refuse (or require an explicit override
   with a recorded reason) on a failed gate; block publication when the
   document type could not be identified until a human confirms it.

**Depends on:** nothing new. **Blocks:** A4-e, A7.

### Amendment A4-e — Review by exception
**Requested:** 2026-09-09 (Parth). **Extends:** A4-c. **Risk:** Low-Med.
**Complexity:** M.

**Requirement:** the review screen opens with a true sentence and the operator
touches only what the system could not resolve.

**Scope:**
1. Accurate opening counts: classified from memory / needs a decision /
   excluded as totals or notes.
2. Group by section, collapsed by default; unresolved sorted to the top;
   whole-group set with per-line deselect; running counter of classified and
   unclassified value in rupees.
3. Materiality fold into an expandable "Other" (threshold per §10 Q1).
4. Excluded lines listed and reversible, never silently dropped.
5. **Seed the classification memory with a standard Indian SME
   chart-of-accounts matcher** — a global layer that org-specific
   `account_mappings` override, so upload one is already mostly classified.
6. Memory extended to `(head, basis, driver, group)`, insert-only with
   history, editable in Settings.
7. Sharp-move confirmation: a remembered mapping landing on a line whose
   amount has moved materially surfaces for confirmation, never applies
   silently.
8. One Indian-numbering formatter module, replacing the three hand-rolled
   call sites.

**Depends on:** A4-d, A7-a. **Blocks:** nothing.

### Amendment A7 — Basis and projection engine
**Requested:** 2026-09-09 (Parth). **New epic.** **Risk:** High.
**Complexity:** XL. **Split into five milestones.**

- **A7-a — Line-level published store (M).** The blocking prerequisite of
  §1.5. A published, insert-only, period-addressable line-level table with a
  declared line → head → KPI roll-up; publish verb rewritten to write lines;
  KPI values become a derived roll-up, preserving the single computation path.
  **Blocks A7-b through A7-e and A4-e.**
- **A7-b — Basis model and the P&L projection engine (L).** The eight bases,
  set at group level with line-level override; seasonality-adjusted
  annualisation as default with the guard from §10 Q5; provenance chain on
  every projected figure. Pure, unit-tested, no React, no DB. Reconciled
  against RPIL's own sheet as the acceptance test.
- **A7-c — Schedule engines (M).** Loan schedule (opening balances, drawdowns,
  repayments, moratorium, revolver interest) and asset block (opening WDV +
  capex − disposals, at rate). Engine outputs, never dropdown choices.
- **A7-d — Articulated statements (L).** Driver-led P&L, balance sheet rolling
  forward from prior-year closing, cash flow with closing cash derived not
  plugged; short-term borrowing capped at the sanctioned limit; funding gap
  raised by year and shortfall. Assets = liabilities asserted in tests, every
  year, every scenario. **Specification blocked on the missing A7–A9 master
  prompt (§0 item 2).**
- **A7-e — Per-unit projection and consolidation (M).** **Blocked on the
  legal-entity-vs-unit answer (§0 item 6).**

**Downstream:** **A8** (Projections tab UI) depends on A7-b at minimum, A7-d
for the full three-statement view; entitlement keys
`report.projections_forecasting` / `report.projections_modelling` already exist
in `lib/entitlements.ts`, and the tab must be added to
`components/dashboard/report/tab-defs.ts`. **A9** (export) depends on A8.
**A10** is undefined — see §0 item 3.

---

## 3. ADRs (draft, ready to append to `Decisions.md`)

### ADR-011: The extraction pipeline has six separate stages
Scope → Classification → Projection Basis → Driver → Projection →
Consolidation. Each stays a separate concern with its own module and its own
persisted result. **Why:** the current pipeline collapses scope and
classification into one parsing pass, which is why a workbook with four
sheets, two units and three periods produces one undifferentiated list — there
is no stage at which "which sheet, which period" is a question that gets
answered. Separating them makes each independently testable and independently
correctable by an operator. **Rejected:** a single configurable extraction
pass (rejected — it is what exists and it cannot express scope); merging
Driver into Projection Basis (rejected — one driver feeds many bases; folding
them means re-specifying the driver on every line).

### ADR-012: One universal set of eight bases, available on any head
`annualise_part_year · grow_on_rate · driver_linked · percent_of_head ·
fixed_amount · schedule_driven · hold_flat · zero_discontinued`. No
category-specific option lists. **Why:** category-specific lists encode a
guess about what a head is, and Indian SME ledgers do not respect the guess —
a head sitting under "Indirect Expenses" may legitimately be driver-linked,
percentage-of-another-head, or contracted. A universal set has one code path,
one test suite and no special cases; "% of another head" alone absorbs bonus
on salary, EPF/ESIC on wages, commission and freight on sales without a single
bespoke rule. **Rejected:** per-category basis menus (rejected — combinatorial
special-casing, and wrong on real files); free-form formula entry (rejected —
unauditable, and it makes provenance impossible to render).

### ADR-013: Seasonality-adjusted annualisation is the default
`annualised = partYearActual × (priorYearFull ÷ priorYearSamePartPeriod)`,
falling back to `× (12 ÷ monthsElapsed)` only when the prior-year same period
is unavailable or the derived ratio fails a plausibility guard. Provenance
records which path was used and why. **Why:** the client's own sheet uses
`/6 × 12`, which assumes flat quarters in a seasonal business — the single
largest silent error in the file we are replacing. **Rejected:** flat
multiplication as default (rejected — demonstrably wrong on this client);
seasonality always, no fallback (rejected — a first-year client has no prior
year and the model must still produce a number).

### ADR-014: Multi-unit clients project per unit, then consolidate
Entity/unit is a first-class dimension of projection, not a column heading.
**Why:** RPIL's units have materially different cost structures; flattening to
a group total destroys the ability to answer which unit is dragging, which is
the question the report exists to answer. **Open — see §0 item 6:** whether
"unit" means `kpi_values.segment` (migration 0009's recorded position: one
legal entity, company-wide tax and finance cost) or child organizations
(ADR-008's `parent_organization_id`). **This ADR cannot be finalised until
that is answered**, because it determines whether consolidation is summation
or elimination.

### ADR-015: Provenance is mandatory on every projected number
Every projected figure retains source period, source head, basis selected,
driver and its value, base value, factor applied, and the resulting
calculation. A figure that cannot explain itself is a defect and fails tests.
**Why:** the product is a CFO's professional opinion rendered as numbers; a
number a CFO cannot defend line by line in a board meeting is worse than no
number. It is also the only mechanism by which an operator can audit a bad
basis choice after the fact. **Rejected:** provenance on aggregates only
(rejected — the error is always in a line, never in the total); provenance as
a rendered string (rejected — must be structured to be queryable and
re-computable).

### ADR-016: The operator works by exception
The system classifies; the human resolves what the system could not. Any
design that asks an operator to touch every line has failed and is a defect,
not a UX preference. **Why:** the review screen exists to catch what
extraction got wrong, not to be the mechanism by which extraction succeeds. An
operator asked to classify 69 lines will classify the first ten carefully and
the rest by pattern — which is worse than an unreviewed deterministic mapping,
because it carries a human's signature. **Rejected:** review-everything as a
correctness guarantee (rejected — it is a correctness theatre; attention does
not scale linearly with rows).

### ADR-017 (PROPOSED — my design, not your frozen decision): Classification memory keys on the normalized label alone; sheet context is an attribute, not part of the key
`account_mappings` stays keyed `(organization_id, source_label_normalized)`
and gains `head`, `basis`, `driver`, `group`, plus a non-key
`source_context` (sheet name, section heading) used for conflict detection.
A **global seed layer** — a standard Indian SME chart-of-accounts matcher —
sits beneath org mappings, which override it. **Why:** see §10 Q2.
**Rejected:** `(label + sheet)` as the key (rejected — fragments memory across
a client's differently-structured files, so upload two learns nothing);
label-only with no context at all (rejected — loses the conflict signal).

### ADR-018 (PROPOSED — my design): Published financial data is stored at line level; KPI values are a derived roll-up
A new insert-only, period-addressable line-level table becomes the published
store. `kpi_values` is derived from it through a declared line → head → KPI
mapping. Report tabs and the dashboard continue to read KPIs through the KPI
Engine — the single computation path is preserved — with drill-down reading
the same tree one level deeper, never a second path. **Why:** §8 requires
line-level projection for the audit trail; the current KPI-level store cannot
hold 63 lines, and `publishIngestionJob` actively rejects two lines mapping to
one KPI. See §1.5 and §10 Q3. **Rejected:** projecting at KPI level
(rejected — the client's accountant projects line by line and the audit trail
depends on it); using `extracted_lines` as the store (rejected — it is
staging: mutable, staff-only, soft-deleted on re-extraction, not addressed by
period); tabs reading lines directly (rejected — a second computation path,
and the dashboard and the P&L tab will eventually disagree).

---

## 4. The first implementable slice

**Proposed: A4-d-1 — the workbook scope model and row classifier (pure), plus
the four honesty fixes.**

Reviewable in one sitting. No UI, no schema migration except one column, no
new dependency, no change to the publish path's behaviour beyond making it
refuse a failed gate.

**In:**
1. `lib/ingestion/workbook.ts` — pure. `ParsedSheet[] → WorkbookScope[]`:
   per sheet, line count, detected period columns with canonical dates,
   two-sided or not, composed multi-tier header labels, detected unit basis,
   detected unit/entity name. Returns a description; changes nothing.
2. `lib/ingestion/row-class.ts` — pure. Classifies each row as `line ·
   total · subtotal · section_heading · note · ratio · percentage · blank`.
3. Wire (2) into the existing staging path so only `line` rows are staged, and
   section headings classify the lines beneath them. **The four-sheet
   flattening is not fixed by this slice** — that needs the picker, which is
   A4-d-2. But footnotes, totals and ROUND OFF stop reaching the screen.
4. Honesty fixes: the `run.ts:233` summary string; `confidence` split into
   amount- and mapping-confidence (one migration adding
   `mapping_confidence`); the review screen never rendering a confidence
   beside an unmapped line; `publishIngestionJob` reading `validation` and
   refusing on a failed gate.
5. Unit tests against a fixture built from the real RPIL workbook.

**Out:** the scope picker UI, T-format, unit conversion, the SME matcher, all
of A7.

**Blocker on this slice: I need the RPIL workbook.** The definition of done is
"reconciles to gross profit ₹3,579.5 L at 17.7%" and "63 clean lines from one
chosen sheet". I cannot build a scope model against a workbook I have not
seen, and I will not build one against an imagined one. Please put the file
somewhere I can read it. §2 says someone already parsed it correctly with
proper scoping — if that parse exists as an artefact, send it too; it is the
expected-output fixture.

If you would rather see something on screen sooner, the alternative first
slice is items 4 and 5 alone — the honesty fixes, roughly a day, no workbook
needed. It fixes the two contradictions that destroy trust and leaves the
garbage. I recommend against shipping that alone, because it makes an
untrustworthy screen look trustworthy. But it is available if you want the
contradictions gone this week.

---

## 5. §10 open questions — answers with recommendations

**Q1 — Materiality threshold: fixed rupee, % of revenue, or per-client?**

**Recommend: a percentage of the scoped statement's total absolute value, with
a rupee floor, defaulted system-wide and overridable per client.** Concretely:
fold when `|amount| < max(0.25% × Σ|amounts in scope|, ₹10,000)`.

Fixed rupee breaks across the client range — ₹25,000 is noise at ₹250 Cr and
material at ₹5 Cr. Percentage of *revenue* breaks on a balance sheet, which
has no revenue. Percentage of the scope's own total works on every statement
type and scales with the client automatically. The rupee floor stops a tiny
statement from folding nothing. Per-client override exists but is never asked
for at upload — a threshold the operator must set is a threshold that becomes
a chore.

Guardrail: never fold so much that the folded "Other" bucket exceeds 1% of the
scope total. If it would, stop folding and show the rest — materiality is
about individual insignificance, not aggregate convenience.

**Q2 — Does memory key on the raw label, or label plus sheet context?**

**Recommend: the normalized label alone as the key; sheet context stored as a
non-key attribute.** This is ADR-017 above.

Label-only is what makes memory *transfer* — the same client's monthly file,
quarterly file and audited pack name the head identically but sit on
differently-named sheets. Adding sheet context to the key fragments the
memory across those files, so upload two learns nothing, which defeats the
purpose. But your safety instinct is right, so: store the context, and when a
remembered mapping arrives from a different context than the one it was
learned in, do not block and do not silently apply — surface it as a
confirm-me, the same mechanism as the sharp-move check in §6. You get the
transfer and the safety, and neither costs the other.

**Q3 — Do line-level projections roll up to KPIs, or do report tabs read
lines directly?**

**Recommend: both, but in one direction only. Lines are the store; KPIs are a
derived view; the tabs read KPIs.** This is ADR-018.

Let a tab read lines directly for a headline number and you have created a
second computation path, and the standing rule that the Dashboard and the
Board Pack never disagree is broken the first time a mapping changes. Drill-
down is not an exception to this: drill-down reads the *same* rolled-up tree,
one level deeper, so the parts always sum to the whole by construction rather
than by luck.

**Q4 — Is the review redesign shippable before A7?**

**Yes — and it must be. But your implied order needs one swap.**

The parse fix must precede the review redesign, exactly as §2 argues: a better
UI over a bad parse solves nothing. And A7-a (the line-level store) must
precede the review redesign too, because A4-e's publish step writes lines. If
A4-e ships against the KPI-level model and A7-a then changes it, the publish
path is written twice.

Recommended sequence: **A4-d → A7-a → A4-e → A7-b → A7-c → A7-d → A7-e → A8 →
A9.**

That gives you a working, trustworthy review screen (through A4-e) well
before the engine exists, which is what you were asking for — just with the
store landing one milestone earlier than the brief implies.

**Q5 — Does the seasonality ratio need a guard against distorted prior years?**

**Yes. Recommend a plausibility band plus disclosure, not auto-detection.**

Compute `ratio = priorYearFull ÷ priorYearSamePart`. Accept it only if it
falls within ±50% of the naive multiplier (`12 ÷ monthsElapsed`) — so for a
6-month base, accept a ratio between 1.0 and 3.0 and reject 8.0. On rejection,
fall back to straight annualisation, **raise it as an assumption the operator
must confirm, and show both numbers side by side** so the CFO sees exactly
what was discarded and can override.

Also required regardless of the band: if the prior-year part period is zero or
near-zero, the ratio is undefined — return the straight annualisation and say
so; never divide by zero, never emit NaN (§8's standing rule). And record
which path was taken in the provenance chain either way (ADR-015), so a
reviewer can always see whether a figure was seasonality-adjusted.

I would **not** try to auto-detect a plant commissioned mid-year or a one-off.
That is judgment, it is the paid value in "Virtual CFO as a Service", and a
detector that is wrong 20% of the time is worse than an anomaly flag that is
right 100% of the time. Surface the anomaly; let the CFO decide.

---

## 6. What I need from you before A4-d-1 starts

1. **The RPIL workbook**, and the correct 63-line parse if it exists as an
   artefact — the fixture and the expected output for the first slice.
2. **The A7–A9 master prompt**, or approval for me to spec the three
   articulated statements fresh (§0 item 2).
3. **Legal entity or business unit?** (§0 item 6) — blocks ADR-014 and A7-e.
4. **What A10 is** (§0 item 3).
5. **Approval to append** the six frozen ADRs (011–016) and the two proposed
   schema ADRs (017–018) to `Decisions.md`, and A4-d / A4-e / A7 to
   `Integration Roadmap.md`.
6. **Confirmation of the sequence swap** in §10 Q4 (A7-a before A4-e).

No code will be written until you approve.
