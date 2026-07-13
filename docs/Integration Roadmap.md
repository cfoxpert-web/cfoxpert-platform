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

Hardest, highest-payoff. **Pushback recorded and accepted:** "least manual intervention" applies to the *numbers*, not the *judgment*. Recommendations, Governance commentary, and Roadmap/Ambition are the CFO's professional read — that is the paid value in "Virtual CFO as a Service." Design intent: fully automate extraction + mapping of financial figures; keep a lightweight human-confirm step before numbers publish (consistent with the insert-only, audit-logged pattern); keep narrative sections as an editable analyst panel, not auto-generated text. Needs its own dedicated scoping pass before implementation (same treatment A2 got) — not scoped in detail here.

### Amendment A5 — Period granularity (monthly + quarterly)
**Requested:** 2026-07-13 (Parth). **Extends:** A1. **Risk:** Low. **Complexity:** S–M.

`kpi_periods` holds only FY25/FY26. Parth's comparison examples ("June 2026 vs March 2026", "Q1 FY26-27 vs Q4 FY25-26") need monthly and quarterly periods. The A1 resolver already supports mom/qoq/custom by date matching — primarily a **data gap**, not a logic gap. Seed source: the embedded `const D`/`DET`/`SS` data objects in `RPIL_Board_Report_June2026_8.html` (real data, same provenance-in-`kpi_values.note` pattern as FY25/FY26). Note: `_8` restates FY26 Gross Profit to the audited-FS basis — requires an insert-only correction row (ADR-006).

### Amendment A6 — Single combined package + entitlements + pricing page
**Requested:** 2026-07-13 (Parth). **Depends on:** A3-UI (tabs must exist to be entitlement-gated). **Risk:** Low-Med. **Complexity:** M.

One package for now: all features visible, non-applicable ones greyed out; segregate into real tiers later. Entitlement taxonomy from `CFOXPERT_ver_2.docx`'s 4 tiers (Essential ₹5-25Cr / Growth ₹25-50Cr / Strategic ₹50-100Cr / Enterprise ₹100Cr+) — each "Dashboard Deliverable" bullet becomes an entitlement key. Starting tab→tier map: Overview/P&L/BS/Ratios/Cost Structure → Essential+; Health Score → Essential+; Segment → Growth+; Projections → Growth+ (Forecasting) → Strategic (Modelling); Governance → Strategic+; Recommendations & Roadmap/Ambition → Strategic+; Inventory & Production → industry add-on (manufacturing), not tier-locked.

**Do not conflate mechanisms:** this is a per-organization DB entitlement (the `organizations.entitlements` jsonb + `plan_tier` columns already exist per ADR-008) — a different thing from `NEXT_PUBLIC_FEATURE_FLAGS` (a dev rollout switch).
