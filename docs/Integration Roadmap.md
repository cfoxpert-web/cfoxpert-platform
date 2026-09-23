# CFOXPERT Platform Roadmap v1.0 (FROZEN)

**Status: Approved and frozen.** This document supersedes `CFOXPERT_Integration_Roadmap.md`. From this point forward, no architectural redesigns occur unless a major business requirement changes. Every future session implements exactly one milestone below, in order, fully reviewed before the next begins.

This version incorporates the CTO-level review requested after initial roadmap approval: three foundational capabilities were folded into existing milestones' scope, one new milestone (Feature Flags) was inserted, and five expensive-to-reverse schema decisions were locked in before any schema gets written.

---

## What changed from the approved roadmap, and why

| Change | Reason |
|---|---|
| **New Milestone 2: Feature Flags** | Zero dependencies, near-zero cost now. Enables safe, gradual rollout of every later milestone (pilot CRM with one client, kill-switch an ERP integration) instead of all-or-nothing releases. |
| **Milestone 4 (Organizations) scope expanded**: add `parent_organization_id`, `plan_tier`/entitlements columns, industry/sector/revenue-band classification | All three are one nullable column each today. Retrofitting hierarchy, billing entitlements, or benchmark classification after real client data exists means a migration plus backfill, not a deploy. |
| **Milestone 5 (User Management) scope changed**: role lives on an `organization_members` join table (user × organization), not on the user directly | Analysts serve multiple clients; client contacts belong to exactly one org. A global role column is the single most expensive decision on this list to reverse — every RLS policy and permission check written against it would need rewriting, not migrating. |
| **Milestone 6 (Database Schema) scope expanded**: KPI definitions become data (`kpi_definitions` table), not code; `audit_logs` table added as a first-class table, not a later bolt-on; status/workflow shape (status + history + assignee + due date) standardized once, reused by Recommendations/Action Items/future approval flows | KPI metadata as code means every new metric is a deploy. Audit trail is core to CFOXPERT's own governance pitch — retrofitting "who changed this financial figure and when" after the fact is not credible for a platform selling governance maturity to its clients. |
| **Every write-milestone from #5 onward now includes "writes an audit log entry" as part of its definition of done** | Carried forward from the audit_logs decision above — this is a standing requirement, not a one-time task. |

No milestone was removed. No milestone was reordered except the Feature Flags insertion. The build order you approved was sound — this review found scope gaps within milestones, not sequencing errors.

---

## Frozen Milestone List

### 1. Environment Configuration
Unchanged from approved roadmap. Validated env layer, no business logic.

### 2. Feature Flags — NEW
**Current:** Does not exist.
**Future:** A minimal flag system (start config/env-driven, migrate to a `feature_flags` table once #6 exists) gating visibility of not-yet-GA features per organization or globally.
**Depends on:** #1.
**Risk:** Low.
**Complexity:** S.
**Frontend changes:** No — flags gate rendering, they don't add new UI.

### 3. Supabase Integration
Unchanged. Client/server/middleware plumbing only, matching this repo's actual Next 15/React 19 versions.

### 4. Authentication
Unchanged. Real Supabase Auth behind the existing `useSession()` seam.

### 5. Organizations — SCOPE EXPANDED
**Future now includes:** `parent_organization_id` (nullable, self-referencing, for group/subsidiary structures), `plan_tier` + entitlements shape (no billing logic, just the column), `industry`/`sector`/`revenue_band` classification (for future benchmarking).
**Depends on:** #3, #4.
**Risk:** Medium — same as before; the added columns don't add risk, they remove future risk.
**Complexity:** M (unchanged; these are columns, not subsystems).
**Frontend changes:** No.

### 6. User Management — SCOPE CHANGED
**Future now includes:** `organization_members` join table carrying role, rather than a role column on `users`. Settings page fields become real and editable.
**Depends on:** #4, #5.
**Risk:** Medium — this is the correct place to make this decision; changing it after #7-#11 depend on a flat role model would touch every one of them.
**Complexity:** M.
**Frontend changes:** Minimal (unchanged).

### 7. Database Schema — SCOPE EXPANDED
**Future now includes:** `kpi_definitions` as data, `audit_logs` as a first-class table, a reusable status/workflow shape, and the standing rule that scored/financial entities (`health_scores`, future `kpi_values`) are insert-only, never updated in place.
**Depends on:** #3, #5, #6.
**Risk:** L-H if rushed — unchanged assessment, now with a clearer list of what "right" looks like.
**Complexity:** L.
**Frontend changes:** No.

### 8. Business Health Check Persistence
**Scope note (not a change, a clarification):** persistence and the outbound webhook are sequential, not parallel — write to the database first, treat the webhook as a side effect of a successful write.
**Depends on:** #3, #7.
Otherwise unchanged.

### 9. CRM
Unchanged. Genuinely net-new scope, as previously assessed.

### 10. KPI Engine
**Scope note:** consumes `kpi_definitions` from #7 rather than hardcoded constants. Must be the single computation path — the future Board Pack Generator and the live Dashboard both call into this, never duplicate its logic.
**Depends on:** #5, #7, ideally #9.

### 11. Dashboard Data
Unchanged. Cleanest swap in the roadmap; depends on #10 calling the shared KPI Engine correctly.

### 12. Client Portal
Unchanged. `ProtectedLayout` becomes a real guard — still flagged as the highest-care review item in the early-to-mid roadmap, not because it's complex, but because an incomplete auth guard is a live vulnerability, not a cosmetic gap.

### 13. AI Services
Unchanged.

### 14. Notifications
Unchanged.

### 15. ERP Integrations
Unchanged. Still correctly last: highest complexity, highest external risk, depends on nearly everything above being real.

---

## Standing rules carried forward into every future milestone

1. Every write-capable milestone from #6 onward writes an audit log entry as part of its definition of done.
2. Scored/financial entities are insert-only. Never update a `health_scores` or `kpi_values` row in place.
3. KPI computation logic lives in exactly one place (#10). Dashboard and Board Packs consume it; neither reimplements it.
4. Role/permission checks are always resolved through `organization_members`, never through a role field on `users`.
5. No milestone ships without: what changes, why it's required, what depends on it (before) — and a self-review plus improvement suggestions (after) — per your existing process. This document does not change that process, only the plan it operates on.
6. **`db-verify` must be green before `db-migrate` is run against production (ADR-021).** A migration is not correct until a real database has applied it and the resulting state has been asserted against. Added 2026-09-23 after migration 0023 failed live on an ordering error that a text-searching test had reported as safe — and after the same text-not-state error was reproduced inside the first attempt to fix it.

---

## Freeze statement

This is **CFOXPERT Platform Roadmap v1.0**. It is the single source of truth for implementation order and scope going forward. Future sessions implement one milestone at a time against this document and do not revisit its architecture unless a major business requirement changes the picture — in which case that change should be brought back for an explicit, scoped amendment, not an ad hoc in-flight redesign.

**Next step:** Milestone 1 — Environment Configuration.

---

## Post-Freeze Amendments

Per the freeze statement above, major business-requirement changes are recorded here as explicit, scoped amendments rather than as in-flight redesigns. These do not reorder the frozen list; they add/extend milestones with their own review cycle.

### Amendment A1 — Flexible period comparison (MoM / YoY / QoQ / custom)
**Requested:** 2026-07-11 (Parth). **Extends:** Milestones 10 (KPI Engine) + 11 (Dashboard Data). **Risk:** Medium. **Complexity:** M.

**Requirement:** a client must be able to compare KPI values across any periods they choose — month-on-month, year-on-year, quarter-on-quarter, or an arbitrary custom pair (e.g. this month vs the same month last year).

**Why it needs an amendment:** the current model can't express relationship-based comparison. `kpi_periods` carries only `period_label` (free text) + `period_type`; `getKpiSnapshot` treats the latest-created period as "current" and the next as "prior". Annual YoY (FY25→FY26) works today by accident of ordering; nothing else does.

**Scope:**
1. Add real `period_start` / `period_end` dates to `kpi_periods` (new migration) so periods can be *found* by relationship.
2. A comparison resolver in the KPI query layer: given a current period + mode (MoM = −1 month, QoQ = −1 quarter, YoY = −12 months, or an explicit custom period), select the comparator. Keep the KPI Engine the single computation path — the resolver picks periods; the engine still does the math.
3. A period + comparison selector on the dashboard (and, later, board packs).
4. Populate enough historical monthly/quarterly data to compare against.

**Sequence note:** build A1 **before** A2 — the financials-derived health score's trend line depends on the dated-period model.

### Amendment A2 — Client health score computed from financials (distinct from lead self-assessment)
**Requested:** 2026-07-11 (Parth). **New milestone.** **Depends on:** #10 (KPI Engine), A1 (dated periods), and a decision on where analyst input lives (overlaps M13 review-queue patterns). **Risk:** Medium. **Complexity:** L.

**Requirement:** the Business Health score should work differently for a **lead** vs an **actual client**. Lead (prospect) keeps the existing six-question founder self-assessment (`lib/health-check/score-engine.ts`). Client (has financials) should be **computed from actual financial data**, not self-reported — may reuse the same six Enterprise Value drivers.

**Honest caveat (raised at request time):** only about half the six drivers are derivable from financials — Financial Strength (fully), Operational Excellence & Strategic Growth (partly), Capital & Valuation (computed). **Governance & Leadership and Technology & Intelligence are not in the numbers** and must stay qualitative (questionnaire or analyst assessment). So the real design is a **hybrid**, not "purely from financials."

**Scope:**
1. Define per-driver financial formulas + benchmark bands, reusing the KPI Engine's benchmark-position logic (single computation path; benchmark bands are data per ADR-004 / industry classification per ADR-008). No parallel scorer.
2. Compute the financial drivers from KPI data; take the qualitative drivers (governance, technology) from the questionnaire or an analyst assessment surface.
3. Combine with the existing driver weights; write the result as an insert-only `health_scores` row (ADR-006), recomputed per period so the score gains a trend line (uses A1's dated periods).

---

## Strategic realignment (2026-07-13)

Triggered by Parth reviewing all project work against two concrete reference reports — `CFOxpert_XYZZ002_FY26_Board_Report_Interactive.html` (10-tab generic template) and `RPIL_Board_Report_June2026_8.html` (6-tab real client report, branch-level) — plus the original 4-tier package sheet (`CFOXPERT_ver_2.docx`).

**Verdict:** foundations are correct (auth, org/data model, mock seam, flag-gated real data, KPI engine, A1 comparison resolver, entitlement columns). Nothing is thrown away. The gap: the "final report" target was never frozen against a concrete reference, so the roadmap optimized infrastructure without a fixed shape to build toward. Amendments A3–A6 fix that.

**End-goal shape (now frozen):** a multi-tab client report — Overview / P&L Comparison / Balance Sheet / Key Ratios vs Benchmarks / Health Score / Cost Structure / Segment (unit-wise) / Inventory & Production / Governance watch-list / Recommendations / Roadmap-Ambition / Projections — eventually generated from client-uploaded Trial Balance / P&L / Balance Sheet with minimal manual intervention **on the numbers** (narrative/advisory sections stay human-authored by design). One combined feature package for now; a future pricing page unlocks tiers.

**Gap audit (reference tabs vs live platform):** Overview is live (8-KPI dashboard + charts). Health Score is a mock placeholder pending A2. Everything else — P&L, Balance Sheet, Ratios, Cost Structure, Segment/unit-wise (no "branch" concept in schema yet), Inventory & Production, Governance, Recommendations, Roadmap/Ambition, Projections — is not built. Document-upload → auto-populated report does not exist as a concept; every live number arrived via hand-run SQL (named as its own epic, A4).

**Recommended build sequence:** A5 + A3-data → A3-UI (+ A2 for the Health Score tab) → A6 → A4. A5/A3-data are tightly coupled and lowest-risk; A3-UI is the visible payoff; A2 slots in where the Health Score tab is built; A6 is contained and monetization-enabling; A4 goes last because it depends on A3's data shape being final.

### Amendment A3 — Multi-tab report architecture
**Requested:** 2026-07-13 (Parth). **Extends:** M10/M11/A1. **Risk:** Moderate. **Complexity:** L (split).

Build P&L / Balance Sheet / Ratios / Cost Structure / Segment / Inventory tabs on the client dashboard, reusing the KPI engine and the A1 comparison resolver. Mostly computed/mechanical; high visible payoff. **Split into two milestones:** **A3-data** (schema + KPI definitions + seed — the data foundation for every tab) and **A3-UI** (tab shell + rendering). Ratios are computed at read time through the engine (single computation path) — never stored as values.

### Amendment A4 — Document ingestion pipeline (upload TB/P&L/BS → auto-populated report)
**Requested:** 2026-07-13 (Parth). **New epic, sequenced last.** **Depends on:** A3's data shape being final. **Risk:** High. **Complexity:** XL.

Hardest, highest-payoff. **Pushback recorded and accepted:** "least manual intervention" applies to the *numbers*, not the *judgment*. Recommendations, Governance commentary, and Roadmap/Ambition are the CFO's professional read — that is the paid value in "Virtual CFO as a Service." Design intent: fully automate extraction + mapping of financial figures; keep a lightweight human-confirm step before numbers publish (consistent with the insert-only, audit-logged pattern); keep narrative sections as an editable analyst panel, not auto-generated text.

#### A4 scoping pass (2026-07-14) — scoped, ready to build

**Decisions taken with Parth:** (1) source documents are a MIX — Tally/Excel/ERP exports, digital PDFs; v1 is built for spreadsheet + digital-PDF fidelity, scans are best-effort (the review gate catches what extraction can't). (2) BOTH clients and analysts can upload, but nothing is processed until an analyst approves the job — approval gates the queue, not just the publish. (3) Review happens in an in-portal, staff-gated review UI — the platform's first internal-analyst surface (CRM UI stays deferred; this one has a concrete workflow to design around).

**Pipeline (job stages):** `received → approved → extracting → needs_review → published` (terminal alternatives: `rejected`, `failed`). Client-uploaded jobs sit at `received` until an analyst approves; analyst uploads may auto-approve. Two human gates by design: approve-to-process (cost + garbage-input control) and confirm-to-publish (correctness control).

**Extraction ladder — deterministic first, AI second, human always:**
1. **Deterministic parsers** for known structured formats (clean Tally XLSX/CSV exports): no AI involved, cell-level provenance. The format library grows per client.
2. **Claude extraction** for everything else: `claude-opus-4-8` via the Messages API with **structured outputs** (`output_config.format` json_schema — guaranteed-parseable line items), PDFs passed natively as document blocks, spreadsheets parsed server-side to text first. Server-only `ANTHROPIC_API_KEY`. Grounding is ONE document from ONE org per request — no cross-client context, ever (AI Design.md non-goal, enforced by construction).
3. **Analyst review** of every number before publish, regardless of which rung extracted it.

This makes A4 (not M13) the platform's **first AI feature**; AI Design.md's "assistive, not autonomous" rule applies verbatim: the model proposes staged rows; only a staff-confirmed action publishes.

**Schema (new migrations):**
- `client_documents` — org-scoped metadata + private Supabase Storage bucket (org-scoped paths, storage RLS, type/size limits; uploads are untrusted content, never rendered raw).
- `ingestion_jobs` — the pipeline entity. Its own stage enum + an insert-only `ingestion_job_events` history (mirrors the status_history PATTERN but does NOT extend `work_status` — pipeline stages would pollute the shared workflow enum).
- `extracted_lines` — staging: source label as printed, amount, statement type, period/segment hints, page/cell provenance, confidence, proposed `kpi_definitions.key`. Staging is mutable until publish; published values are never edited (ADR-006 untouched).
- `account_mappings` — org-scoped mapping MEMORY: normalized source label → kpi key (+ segment). Analyst-confirmed once, applied deterministically on every later upload; AI only proposes for labels with no confirmed mapping. The pipeline gets more deterministic with every document.

**Deterministic validation gates (pre-review, never silently passed):** TB debits = credits; BS assets = liabilities + equity; P&L GP/NP recompute from components; extracted totals vs stated totals; period dates parse and match the declared period.

**Publish semantics:** staff-gated server action inserts `kpi_periods` (if new, with real dates) + `kpi_values` through the existing insert-only path — provenance note carries document + page/cell ref (the same note convention the hand-run SQL era used), audit_logs entry, corrections as new rows. Ratios/health score still compute at read time; nothing new is stored derived.

**Milestone split:** **A4-a** (M): schema + storage + upload surfaces (client Documents page becomes real; staff upload) + job queue at `received`. **A4-b** (L): extraction service (parser ladder + Claude structured outputs), staging, validation gates. **A4-c** (L): staff review UI (extracted vs source side-by-side, mapping confirmation feeding `account_mappings`), publish action. Flag: `docIngestion` (dev rollout — distinct from entitlements per A6).

**Non-goals (v1, recorded):** no auto-publish under any condition; no narrative generation (analyst panel is a separate future milestone); no OCR guarantee on scans; no live ERP integration (M15); no client-visible extraction detail beyond coarse job status.

**Risks:** extraction accuracy on messy PDFs (mitigated by gates + mandatory review + mapping memory); Tally/ERP format diversity (parser library grows incrementally; Claude rung is the fallback); per-document API cost (Opus 4.8 at $5/$25 per MTok — a full statement pack is well under a dollar; approval gate prevents abuse).

### Amendment A5 — Period granularity (monthly + quarterly)
**Requested:** 2026-07-13 (Parth). **Extends:** A1. **Risk:** Low. **Complexity:** S–M.

`kpi_periods` holds only FY25/FY26. Parth's comparison examples ("June 2026 vs March 2026", "Q1 FY26-27 vs Q4 FY25-26") need monthly and quarterly periods. The A1 resolver already supports mom/qoq/custom by date matching — primarily a **data gap**, not a logic gap. Seed source: the embedded `const D`/`DET`/`SS` data objects in `RPIL_Board_Report_June2026_8.html` (real data, same provenance-in-`kpi_values.note` pattern as FY25/FY26). Note: `_8` restates FY26 Gross Profit to the audited-FS basis — requires an insert-only correction row (ADR-006).

### Amendment A6 — Single combined package + entitlements + pricing page
**Requested:** 2026-07-13 (Parth). **Depends on:** A3-UI (tabs must exist to be entitlement-gated). **Risk:** Low-Med. **Complexity:** M.

One package for now: all features visible, non-applicable ones greyed out; segregate into real tiers later. Entitlement taxonomy from `CFOXPERT_ver_2.docx`'s 4 tiers (Essential ₹5-25Cr / Growth ₹25-50Cr / Strategic ₹50-100Cr / Enterprise ₹100Cr+) — each "Dashboard Deliverable" bullet becomes an entitlement key. Starting tab→tier map: Overview/P&L/BS/Ratios/Cost Structure → Essential+; Health Score → Essential+; Segment → Growth+; Projections → Growth+ (Forecasting) → Strategic (Modelling); Governance → Strategic+; Recommendations & Roadmap/Ambition → Strategic+; Inventory & Production → industry add-on (manufacturing), not tier-locked.

**Do not conflate mechanisms:** this is a per-organization DB entitlement (the `organizations.entitlements` jsonb + `plan_tier` columns already exist per ADR-008) — a different thing from `NEXT_PUBLIC_FEATURE_FLAGS` (a dev rollout switch).

---

## Amendments A4-d / A4-e / A7 (approved 2026-09-09)

Triggered by Parth using the shipped A4-c review screen on a real client file
(Reliable Packaging Industries, a 33-sheet working ledger). The screen surfaced
footnotes as financial lines, two rows both labelled `Total`, 100% confidence
beside "— not mapped —", and lines from four sheets and three periods flattened
into one list. Root cause is the extractor, not the screen: A4-b's parser was
built for clean single-sheet Tally exports and has no concept of scope.
Stage 0 audit: `docs/Stage 0 — Extraction Rebuild and Projection Engine.md`.

**Approved build order:** A4-d → A7-a → A4-e → A7-b → A7-c → A7-d → A7-e → A8 → A9.
A7-a (the line-level store) moves ahead of A4-e because A4-e's publish path
writes lines; building it against the KPI-level model first would mean writing
it twice.

### Amendment A4-d — Scope-first extraction
**Requested:** 2026-09-09 (Parth). **Extends:** A4-b. **Risk:** Medium. **Complexity:** L.

**Requirement:** nothing reaches the review screen until scope is resolved —
one sheet, one period pair, one unit basis, chosen by the operator in two
clicks at upload from a picker the parser populates by introspecting the
workbook.

**Why it needs an amendment:** A4-b's parser is correct for what it was built
for. Real Indian SME working ledgers are 33-sheet workbooks with T-format
statements, two label columns, multi-tier headers, hand-typed date headings
that disagree across sides, footnotes, roll-up section headings, and several
periods and units side by side. `sheetsToLines()` `flatMap`s every sheet into
one list and nothing filters a row. This is not a tuning problem.

**Scope:**
1. `lib/ingestion/workbook.ts` (pure) — introspect sheets into a scope model:
   per sheet, candidate line count, detected period columns with canonical
   dates, whether the layout is two-sided, composed multi-tier header labels
   (`Total · 31.03.2027`), detected unit basis, detected segment names.
2. `lib/ingestion/row-class.ts` (pure) — classify every row before staging:
   `line · total · subtotal · section_heading · note · ratio · percentage ·
   blank`. Only `line` is staged. Section headings classify the lines beneath
   them and contribute their name, never their value.
3. T-format: find every label column, treat the span after each as its own
   block; closing stock signed as a contra; credit-side lines the matcher
   reads as costs reclassify to other income.
4. Canonical date matching (the file really does carry `31.03.2026` on one
   side and `31.03.026` on the other); Excel serials rendered as dates.
5. Unit detection and conversion at a single boundary; one stored base unit.
6. `MAX_SHEETS = 10` removed. A truncated read is a warning, never silent.
7. Scope picker UI at upload; the chosen scope persisted on the job.
8. Honesty fixes: no "validation checks passed" when nothing was checked;
   `confidence` split into amount-confidence and mapping-confidence, with no
   confidence rendered beside an unmapped line; `publishIngestionJob` reads
   the job's `validation` and blocks on a failed gate; publication blocked
   until a human confirms the document type when it could not be identified.

**A4-d-1 — SHIPPED 2026-09-09.** Scope model (`workbook.ts`), row classifier
(`row-class.ts`), seed head matcher (`head-classify.ts`, moved in from A4-e),
migration 0020, and the four honesty fixes. Golden result: 66 lines, 58
auto-classified, 8 exceptions; GP and full-P&L both reconcile.

**A4-d-2 — NEXT.** The scope picker UI and persisting the chosen scope, which
is what actually closes the four-sheet flattening the operator still feels.
Three requirements carried forward from A4-d-1: the picker addresses periods by
`(segment, date)` and surfaces the segment in the column label; a truncated or
partially-read workbook warns VISIBLY in the picker, not only in the job note;
and the picker shows per sheet the candidate line count and detected columns,
so an operator can tell `26-27 Projection` from `Dhaulana Dep` without opening
the file.

**Golden test:** `rpil-projection-fixture.v2.json` — scoped to `26-27 Projection`,
`Total · 31.03.2026` and `Total · 31.03.2027`, stored in rupees, the parse
yields **66 lines, 58 auto-classified, 8 unmatched** (v1's 65/57/8 was short
one line — see ADR-020 and the 2026-09-09 Changelog), reconciling to gross
profit ₹3,579.48 L at 17.72% (FY 2026-27) and ₹3,111.17 L at 17.47%
(FY 2025-26), AND on the full P&L: PBT less the unclassified exceptions equals
the workbook's own stated net profit in both years. The workbook itself is
never committed (ADR-020); the test reads it from `RPIL_WORKBOOK` and skips
when absent.

**Depends on:** nothing new. **Blocks:** A4-e, A7.

### Amendment A4-e — Review by exception
**Requested:** 2026-09-09 (Parth). **Extends:** A4-c. **Risk:** Low-Med. **Complexity:** M.

**Requirement:** the review screen opens with a true sentence and the operator
touches only what the system could not resolve (ADR-016).

**Scope:** accurate classified / needs-decision / excluded counts; grouping by
section, collapsed by default, unresolved first; whole-group set with per-line
deselect; running counter of classified and unclassified value in rupees;
materiality fold into an expandable "Other"; excluded lines listed and
reversible; memory extended to `(head, basis, driver, group)`, insert-only with
history, editable in Settings (ADR-017); sharp-move confirmation; one
Indian-numbering formatter module replacing the three hand-rolled call sites.

**SCOPE REDUCED (2026-09-09).** The **standard Indian SME chart-of-accounts
matcher** has MOVED OUT of A4-e and shipped in A4-d-1 as
`lib/ingestion/head-classify.ts`. It had to: A4-d-1's stated acceptance
criterion is "66 lines, 58 auto-classified, 8 unmatched", and the
auto-classified count is unassertable without a matcher. A4-e inherits it as
the global seed layer beneath a client's own `account_mappings` (ADR-017) and
extends rather than builds it. Recorded here so the roadmap does not quietly
disagree with the code — process note: where an acceptance criterion implies
work outside a slice, that belongs in the pre-explanation, not the
self-review.

**Refinement carried in from A4-d-1 — derived-line exclusion is conditional.**
A4-d-1 excludes `Gross Profit` (and every `DERIVED_VOCABULARY` entry) on any
statement, which is right when the components it derives from are present and
staging, and WRONG when they are not: a summary P&L that states gross profit
with no cost breakdown has that line as its only source for the figure, and
excluding it loses the number rather than avoiding a double-count. The general
rule for A4-e is: **exclude a derived line when the lines it derives from are
present and staging; stage it as the head itself when they are absent.**
Requires `RowClassification.reason` to gain a machine-readable reason CODE
alongside its operator-facing text, so the review screen can say "excluded
because its components staged" rather than dropping it silently.

**Owns the report-side disclosure of unclassified value (added 2026-09-09).**
A7-a makes the rollup produce the figure and emit it as the
`unclassified_value` KPI, which is necessary and not sufficient: the
requirement is that a published period carrying null-head lines shows that
value **on the report**, because an operator acts on "₹25.01 L unclassified"
and nobody acts on a margin that is quietly 0.14 points too high. Neither A8
nor A4-d naturally claims a report change, so A4-e owns it — it is the
milestone whose whole subject is what is classified and what is not. Concretely:
a disclosure row on the P&L tab (`components/dashboard/report/pnl-tab.tsx`),
reading from the existing KPI path, stating the rupee value and that it sits
in no margin or ratio.

**Also inherits (small):** `ReviewForm` still receives a `catalogue` prop that
nothing renders since A7-a moved line selection from KPIs to heads. Harmless,
but it will mislead the redesign — remove it there rather than in a drive-by.

**Depends on:** A4-d, A7-a.

### Amendment A7 — Basis and projection engine
**Requested:** 2026-09-09 (Parth). **New epic.** **Risk:** High. **Complexity:** XL.

- **A7-a — Line-level published store (M).** Insert-only, period- and
  segment-addressable, full provenance columns from the outset; publish verb
  rewritten to write lines; KPI values become a derived roll-up (ADR-018).
  The `actions.ts` one-line-per-KPI rule is replaced, not relaxed.
  **Blocks A7-b…A7-e and A4-e.**
- **A7-b — Basis model and P&L projection engine (L).** **Carries the
  reconciliation assertion (added 2026-09-09).** A7-a proved the rollup
  arithmetic against in-memory lines; that establishes "the maths is right",
  not "the data is right". Two controls, in this order: a **publish-time
  assertion** is PRIMARY — it recomputes the rollup from the rows just
  written and refuses the publish on a mismatch, because a scheduled check
  only tells you a client has already seen a wrong number. A **scheduled
  check** is secondary and still worth having, since it catches drift a
  publish cannot see: a later map version, or a manual database edit. The eight bases at
  group level with line-level override (ADR-012); seasonality-adjusted
  annualisation with the plausibility guard (ADR-013); provenance chain on
  every figure (ADR-015). Pure, unit-tested, no React, no DB. Negative amounts
  in expense heads need an explicit rule, not silent absorption.
- **A7-c — Schedule engines (M).** Loan schedule: always derived, never
  entered; straight-line principal over tenure after the moratorium; interest
  accrues through the moratorium and hits the P&L; never negative; a facility
  repaid in Q1 charges interest only on the pending balance thereafter.
  Revolver interest is charged on the **opening** balance to avoid a circular
  reference with the drawdown it funds — a simplification stated in the output,
  not hidden. Asset block: opening WDV + capex − disposals, at rate.
- **A7-d — Articulated statements (L).**
  *P&L:* Sales → less direct costs → Gross Profit → less indirect → EBITDA →
  less depreciation and finance cost → PBT → less tax → PAT. Other income is
  collected and used.
  *Balance sheet:* rolls forward from prior-year closing. Reserves grow with
  PAT less dividend. Working capital moves with debtor / inventory / creditor
  days. Fixed assets move with capex less depreciation.
  *Cash flow:* proper operating / investing / financing sections. Closing cash
  is derived here and carried into the balance sheet — never a plug.
  *Balancing rule:* surplus sits in cash; deficits draw on short-term
  borrowing capped at the sanctioned working capital limit, with interest on
  the drawn balance. Where the requirement exceeds the limit the model does
  not silently balance — it raises a **funding gap naming the year and the
  shortfall**. That warning is one of the most valuable outputs in the
  feature; it is surfaced, not buried.
  Assets equal liabilities in every projected year and every scenario,
  asserted in tests. No divide-by-zero anywhere: return 0, never blank, never
  `NaN`. All-zero inputs must not throw.
- **A7-e — Per-segment projection and consolidation (M).** Per ADR-014 and
  ADR-019: revenue, direct and indirect per segment; tax once at entity level;
  depreciation and finance cost per segment where attributable, else entity;
  balance sheet entity-level only.

**Downstream dependencies:**
- **A8 — Projections tab.** Depends on A7-b at minimum, A7-d for the full
  three-statement view. Entitlement keys `report.projections_forecasting` and
  `report.projections_modelling` already exist in `lib/entitlements.ts`; the
  tab must be added to `components/dashboard/report/tab-defs.ts`.
- **A9 — Export.** Depends on A8.
- **A10 — Bank Finance Pack (CMA).** Cost of Project and Means of Finance,
  term loan repayment schedule for submission, MPBF under Tandon Committee
  Method II, DSCR working, assumptions summary, and an editable market section
  that is never auto-generated. A separate deliverable, **not a dashboard
  tab**, carrying a mandatory non-bypassable analyst sign-off because it goes
  to a lender. Depends on A7-c (repayment schedule, DSCR) and A7-d (projected
  statements). **Out of scope until A7 completes.**
