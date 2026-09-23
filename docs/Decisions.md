# Decisions.md — Architecture Decision Records

This is the single log of every consequential architectural decision made on the CFOXPERT platform. Its purpose is to stop the team (or a future Claude session) from re-litigating a settled decision, and to make the *reasoning* — not just the outcome — survivable past the person who made it.

**Format:** every entry has a decision, the reasoning, the alternatives that were considered and rejected, and a date. Entries are append-only — if a decision is later reversed, add a new entry that supersedes the old one; don't edit history.

---

## ADR-001: `cfoxpert-platform` is the single source of truth; the earlier Supabase/Prisma scaffold is discarded

**Date:** 2026-07-07

**Decision:** The existing `cfoxpert-web/cfoxpert-platform` repository (live at cfoxpert.in, built through 7 phases) is the one true codebase. An earlier "Phase 1 Foundation" scaffold built in a prior session — Next.js 14, React 18, Supabase, Prisma, TanStack Query, its own design system — is retired to reference material only and will not be merged in.

**Why:** The scaffold was built without visibility into the existing repo. When the existing repo surfaced, it turned out to be materially more advanced (real scoring engine, real dashboard widgets, one design system already centralized in `tailwind.config.ts`) and built on incompatible dependency versions (Next 15/React 19 vs. the scaffold's Next 14/React 18). Merging would have produced two competing design systems and two auth approaches — the opposite of "feels like one OS."

**Alternatives considered:**
- Merge both folder trees, reconciling conflicts file by file. Rejected — mechanical merge across incompatible major versions of Next/React is not a merge, it's a rewrite with extra steps, and risks breaking the live, deployed site.
- Keep both repos running in parallel (marketing site vs. platform). Rejected — directly contradicts the "one OS" goal.

---

## ADR-002: The existing mock-auth seams (`useSession()`, `session-provider.tsx`, `lib/mock-data/*`) are trusted and preserved, not replaced

**Date:** 2026-07-07

**Decision:** Real Supabase Auth and real data will be implemented *behind* the existing `useSession()` hook and the existing typed mock-data shapes, rather than introducing new patterns.

**Why:** These seams were deliberately engineered for this exact moment — every consumer (`ProfileMenu`, `ProtectedLayout`, Settings, dashboard widgets) already calls through a single interface. Respecting that means most milestones require zero frontend changes, which is both faster and lower-risk than introducing a parallel data-fetching pattern.

**Alternatives considered:**
- Introduce TanStack Query / a new client-state pattern for the real implementation. Rejected — no evidence the existing pattern is inadequate, and it would be a rewrite disguised as a data-source swap.

---

## ADR-003: Role lives on `organization_members` (user × organization), not on `users` directly

**Date:** 2026-07-07

**Decision:** Permission role is a property of a user's membership in a specific organization, stored in a join table, not a single global role column on the `users` table.

**Why:** Analysts serve multiple client organizations; a client contact belongs to exactly one. A flat role-on-user model cannot represent "Analyst A is an editor on Client X and has no access to Client Y." This is the single most expensive decision on the roadmap to reverse — every RLS policy and permission check written against a flat role column would need rewriting, not migrating, once real usage exposed the gap.

**Alternatives considered:**
- Single `role` enum column on `users`, matching the earlier discarded scaffold's design. Rejected for the reason above — it was the right call for a single-tenant internal tool, wrong for a platform serving multiple client organizations from day one.

---

## ADR-004: KPI definitions are data (`kpi_definitions` table), not code

**Date:** 2026-07-07

**Decision:** KPI metadata (key, unit, category, ideal benchmark range) is stored in the database and referenced by ID, not hardcoded as TypeScript constants.

**Why:** CFOXPERT's core pitch is benchmarking clients against ideal ranges. If that range is a code constant, adding or adjusting a metric is a deploy. As a data row, it's a content change — and it's the only design that makes the future Benchmark Engine possible without a schema migration.

**Alternatives considered:**
- Hardcode KPI definitions in a shared constants file (mirrors the pattern used for the Enterprise Value Drivers). Rejected specifically for KPIs because, unlike the six drivers (which are genuinely fixed), the KPI list is expected to grow as clients and industries vary.

---

## ADR-005: `audit_logs` is a first-class table from the initial schema, not a later addition

**Date:** 2026-07-07

**Decision:** Every write-capable milestone from Database Schema onward writes an audit log entry (actor, action, entity, before/after, timestamp) as part of its definition of done.

**Why:** CFOXPERT sells governance maturity to its clients. A platform that can't show who changed a client's financial figures and when has no credible answer when a client asks that question about their own data. Retrofitting an audit trail after real financial data exists means there's a gap in the record precisely during the period it would matter most (early client onboarding).

**Alternatives considered:**
- Rely on Postgres/Supabase's native query logs. Rejected — infrastructure logs aren't queryable by the application, aren't user-facing, and don't survive a database migration the way an application-level table does.
- Add audit logging per-module as each module is built. Rejected — produces inconsistent coverage; some early modules would simply lack it.

---

## ADR-006: Scored/financial entities (`health_scores`, future `kpi_values`) are insert-only, never updated in place

**Date:** 2026-07-07

**Decision:** A new health score or KPI value is always a new row. Existing rows for a client/period are never overwritten.

**Why:** Every trend chart, every FY-vs-FY comparison, and the Board Pack's entire "improvement over time" narrative depends on historical values being reconstructable. An update-in-place pattern silently destroys that history the first time someone "corrects" a KPI entry.

**Alternatives considered:**
- Update in place with a separate `kpi_value_history` audit table capturing prior values. Rejected — more complex than simply treating the primary table as append-only, for no real benefit at this scale.

---

## ADR-007: Feature flags introduced as an early, standalone milestone (position 2, before Supabase)

**Date:** 2026-07-07

**Decision:** A minimal feature-flag capability is built immediately after Environment Configuration, ahead of Authentication or any business module.

**Why:** Zero dependencies, near-zero cost, and it changes how every subsequent milestone can ship — CRM or AI Services can go to one pilot client instead of all clients at once, and any integration (especially ERP, milestone 15) can be kill-switched mid-incident without a deploy.

**Alternatives considered:**
- Add feature flags later, once there's a concrete feature that needs gating. Rejected — the cost of building it early is trivial, and waiting means the first few real-data milestones (Auth, Health Check persistence) ship without a safety valve.

---

## ADR-008: Organizations support hierarchy (`parent_organization_id`) and benchmark classification from the first schema, even though neither feature uses them yet

**Date:** 2026-07-07

**Decision:** The `organizations` table includes a nullable self-referencing `parent_organization_id`, plus `industry`/`sector`/`revenue_band` classification columns, from Milestone 4 (Organizations) — well before any consolidated-reporting feature or Benchmark Engine is built.

**Why:** Both are one nullable column today. Both become a real migration-plus-backfill problem once real client data exists without them — consolidated group reporting can't be retrofitted onto a flat org table without touching every downstream RLS policy and aggregation query, and benchmark classification can't be applied retroactively to KPI values that were never tagged with an industry at the time they were recorded.

**Alternatives considered:**
- Add these columns only when the features that use them are actually built (#14 ERP / future Benchmark Engine). Rejected — by then, real KPI history would already exist untagged, and the backfill problem is exactly what this decision avoids.

---

## ADR-009: Legacy `plan_tier` values mean the single combined package; tier gating activates only by assigning one of the four real tier values

**Date:** 2026-07-13

**Decision:** Migration 0012 adds the four package tiers from the CFOXPERT package sheet (`essential`/`growth`/`strategic`/`enterprise`) to the `plan_tier` enum but moves no organization onto them. `lib/entitlements.ts` — the ONLY interpreter of `plan_tier` and the `entitlements` jsonb (never SQL, per migration 0001's contract) — treats the legacy values (`internal`/`trial`/`standard`/`premium`) as the single combined package: every tier-gated entitlement granted. Industry add-ons (Inventory & Production → manufacturing) gate on `organizations.industry`, not tier; explicit jsonb overrides win in both directions. Report tabs an org isn't entitled to stay **visible but greyed** with a lock, and their data is never fetched.

**Why:** A6's requirement is "one package for now, segregate into real tiers later" — so the current package must be the *absence* of tier assignment, not a fifth pseudo-tier that would need migrating away from. Moving a client onto a real tier becomes a one-row data change with no deploy, which is exactly the monetization switch A6 exists to enable. Greying rather than hiding keeps the upgrade surface visible (the pricing page renders from the same taxonomy module, so marketing claims and platform gates cannot drift).

**Alternatives considered:**
- Map legacy values onto tiers (e.g. `premium` → `strategic`) — rejected: those values never meant tiers, and silently downgrading a client's visible tabs on deploy is a support incident, not a migration.
- Reuse `NEXT_PUBLIC_FEATURE_FLAGS` for gating — rejected explicitly in the roadmap: flags answer "is this capability deployed?", entitlements answer "has this client paid for it?"; conflating them makes every sale a deploy.
- Hide unentitled tabs — rejected: the package sheet sells progression; an invisible feature can't create demand, and "all features visible, non-applicable greyed out" was the recorded requirement.

---

## ADR-010: In document ingestion, the LLM only ever proposes — a deterministic-plus-human path is the only way numbers publish

**Date:** 2026-07-14

**Decision:** A4's pipeline never lets model output touch `kpi_values` directly. Extraction follows a ladder — deterministic parsers for known formats first, Claude (structured outputs, one org's one document per request) as the fallback — and everything lands in a mutable staging table (`extracted_lines`). Publishing requires deterministic validation gates (TB balances, BS equation, P&L recomputation) plus an explicit staff-confirmed action, which writes through the existing insert-only `kpi_periods`/`kpi_values` path with document-level provenance and an audit entry. Analyst-confirmed label→KPI mappings persist in org-scoped `account_mappings`, so repeated uploads bypass the model entirely for known labels. Client uploads additionally wait at `received` until an analyst approves processing.

**Why:** The board report's numbers are the product; a hallucinated digit is a trust-ending event, not a bug. Structured outputs guarantee *parseable* extraction, not *correct* extraction — correctness comes from arithmetic identities the statements must satisfy and from the analyst who signs off. The mapping memory makes the system MORE deterministic over time instead of more model-dependent, and the approve-to-process gate bounds both garbage input and API spend. This also instantiates AI Design.md's standing rule ("drafts, not decisions; nothing reaches a client unreviewed") in the platform's first real AI feature.

**Alternatives considered:**
- Auto-publish when validation gates pass — rejected: gates prove internal consistency, not fidelity to the source document; a consistently-wrong extraction passes gates.
- LLM-per-upload with no mapping memory — rejected: pays extraction risk and cost on every upload for labels a human already confirmed; learning nothing across uploads is the strictly worse version of the same pipeline.
- Extending the shared `work_status` enum for pipeline stages — rejected: `open/in_progress/resolved` is THE generic workflow shape (migration 0005); ingestion stages are pipeline states, so the job gets its own enum and mirrors the history *pattern* instead.

**Addendum — client-document data handling on the Claude API (2026-07-20, decided by Parth before A4-b shipped):** extraction uses Anthropic's standard commercial API: inputs/outputs are not used for model training by default and are retained by Anthropic for a limited period (~30 days) for abuse monitoring, then deleted. A client's document leaves CFOxpert's Supabase infrastructure for the duration of the extraction call, one document from one organization per request. This is DISCLOSED, not silent: the Privacy Policy carries an AI-assisted-processing section naming Anthropic and the no-training/limited-retention terms, and the same line belongs in client engagement terms. Alternatives considered: zero-data-retention agreement (enterprise-tier, revisit if a client demands it); deterministic-only processing (rejected as default — PDFs are half the intake; remains the automatic behavior whenever `ANTHROPIC_API_KEY` is absent).

---

## ADR-011: The extraction pipeline has six separate stages

**Date:** 2026-09-09

**Decision:** Scope → Classification → Projection Basis → Driver → Projection → Consolidation. Each stays a separate concern with its own module and its own persisted result. Scope (which sheet, which columns, which period, which unit) is resolved before anything is staged.

**Why:** The A4-b pipeline collapses scope and classification into one parsing pass, which is why a 33-sheet workbook produces one undifferentiated list — there is no stage at which "which sheet, which period" is a question that gets answered, so it never is. Separating the stages makes each independently testable and independently correctable by an operator, and it means a wrong scope is fixed by re-scoping rather than by re-classifying 69 lines.

**Alternatives considered:**
- A single configurable extraction pass — rejected: it is what exists, and it cannot express scope at all.
- Merging Driver into Projection Basis — rejected: one driver feeds many bases; folding them means re-specifying the driver on every line, which is the per-line-work failure ADR-016 forbids.

---

## ADR-012: One universal set of eight bases, available on any head

**Date:** 2026-09-09

**Decision:** `annualise_part_year · grow_on_rate · driver_linked · percent_of_head · fixed_amount · schedule_driven · hold_flat · zero_discontinued`. Every basis is available on every head. No category-specific option lists. Basis is set at group level by default with line-level override.

**Why:** A category-specific list encodes a guess about what a head is, and Indian SME ledgers do not respect the guess — a head sitting under "Indirect Expenses" may legitimately be driver-linked, a percentage of another head, or contracted. A universal set has one code path, one test suite and no special cases. `percent_of_head` alone absorbs bonus on salary, EPF and ESIC on wages, and commission and freight outward on sales without a single bespoke rule.

**Alternatives considered:**
- Per-category basis menus — rejected: combinatorial special-casing, and demonstrably wrong on the RPIL file.
- Free-form formula entry — rejected: unauditable, and it makes the provenance chain of ADR-015 impossible to render.

---

## ADR-013: Seasonality-adjusted annualisation is the default

**Date:** 2026-09-09

**Decision:** `annualised = partYearActual × (priorYearFull ÷ priorYearSamePartPeriod)`. Straight `× (12 ÷ monthsElapsed)` is the fallback, used only when the prior-year same period is unavailable or the derived ratio fails a plausibility guard (outside ±50% of the naive multiplier). Straight multiplication also remains available as an explicit operator override. Provenance records which path was used and why. A zero or near-zero prior-year part period yields the straight annualisation and says so; it never divides by zero and never emits `NaN`.

**Why:** The client's own sheet uses `/6 × 12`, which assumes flat quarters in a seasonal business. That is the single largest silent error in the working papers this feature replaces. The guard exists because the ratio is only as good as the prior year — a one-off or a plant commissioned mid-year distorts it, and a silently-applied bad ratio is worse than a visibly-crude one.

**Alternatives considered:**
- Flat multiplication as the default — rejected: demonstrably wrong on this client, and wrong in the same direction for most seasonal manufacturers.
- Seasonality always, no fallback — rejected: a first-year client has no prior year and the model must still produce a number.
- Auto-detecting distorted prior years (one-offs, mid-year commissioning) — rejected: that is judgment, it is the paid value in "Virtual CFO as a Service", and a detector that is wrong one time in five is worse than an anomaly flag that is right every time. Surface the anomaly; let the CFO decide.

---

## ADR-014: Multi-unit clients project per segment, then consolidate by summation

**Date:** 2026-09-09

**Decision:** Where a client reports by unit, projection runs per segment and consolidates by summation — not by elimination, because segments of one legal entity have no inter-company transactions to eliminate (see ADR-019). The split is not uniform across the P&L:

- **Revenue, direct costs and indirect costs project per segment.** They have genuinely different structures; Dhaulana's electricity alone is a different order of magnitude from Greater Noida's whole direct base.
- **Tax is computed once, at entity level.** One company, one tax computation. Never per segment.
- **Depreciation and finance cost follow their schedules.** Where an asset block or a loan facility is attributable to a location they compute per segment and sum; where they are company-wide they compute at entity level. The client's sheet does split both, so per-segment schedules are supported — but tax stays entity-level regardless.
- **The balance sheet is entity-level only.** Segment balance sheets are not maintained by these clients and must not be invented.

**Why:** Flattening to a group total destroys the ability to answer which unit is dragging, which is the question the report exists to answer. But projecting *everything* per segment invents figures the client does not maintain — a per-segment tax charge or a per-segment balance sheet would be a fabrication wearing the same typeface as the real numbers.

**Alternatives considered:**
- Project everything at group level — rejected: loses unit-level diagnosis entirely.
- Project everything per segment including tax and the balance sheet — rejected: fabricates statements the client does not keep and cannot verify.
- Model units as child organizations — rejected; see ADR-019.

**Addendum — the decision was confirmed by a defect, not by reasoning (2026-09-09):** while building A4-d-1 against the real client workbook, requesting a period by DATE alone silently returned Dhaulana's column instead of the group Total, because `31.03.2026` appears three times in each block (Dhaulana, Greater Noida, Total). Nothing downstream would have caught it: the report would simply have shown one plant's figures labelled as the company's — a confident wrong number rather than an error. Segment is therefore part of a period's ADDRESS, not a reporting nicety, and scope requests are `(segment, date)` pairs. This was found by running against the real file rather than by reasoning about it, which is the standing argument for keeping a real-workbook test in the loop (ADR-020).

---

## ADR-015: Provenance is mandatory on every projected number

**Date:** 2026-09-09

**Decision:** Every projected figure retains, as structured data: source period, source head, the basis selected, the driver and its value, the base value, the factor applied, and the resulting calculation. A figure that cannot explain itself is a defect and fails tests.

**Why:** The product is a CFO's professional opinion rendered as numbers. A number a CFO cannot defend line by line in a board meeting — or in front of a lender, once A10 exists — is worse than no number. It is also the only mechanism by which an operator can audit a bad basis choice after the fact, rather than re-deriving the whole model to find one wrong assumption.

**Alternatives considered:**
- Provenance on aggregates only — rejected: the error is always in a line, never in the total.
- Provenance as a rendered string — rejected: it must be structured to be queryable and re-computable; a sentence cannot be re-run.

---

## ADR-016: The operator works by exception

**Date:** 2026-09-09

**Decision:** The system classifies; the human resolves what the system could not. Any design that asks an operator to touch every line has failed and is a defect, not a UX preference. The RPIL benchmark is the standard: 65 lines, 57 auto-classified, 8 decisions.

**Why:** The review screen exists to catch what extraction got wrong, not to be the mechanism by which extraction succeeds. An operator asked to classify 69 lines will classify the first ten carefully and the rest by pattern — which is worse than an unreviewed deterministic mapping, because it carries a human's signature and therefore a human's implied assurance.

**Alternatives considered:**
- Review-everything as a correctness guarantee — rejected: it is correctness theatre; attention does not scale linearly with rows.

---

## ADR-017: Classification memory keys on the normalized label alone; sheet context is an attribute, not part of the key

**Date:** 2026-09-09

**Decision:** `account_mappings` stays keyed `(organization_id, source_label_normalized)` and gains `head`, `basis`, `driver` and `group`, plus a non-key `source_context` (sheet name, section heading). A **global seed layer** — a standard Indian SME chart-of-accounts matcher — sits beneath org mappings, which override it. When a remembered mapping arrives from a different context than the one it was learned in, or lands on a line whose amount has moved sharply, it does not block and does not silently apply: it surfaces for confirmation.

**Why:** Label-only is what makes memory *transfer* — the same client's monthly file, quarterly file and audited pack name the head identically but sit on differently-named sheets. Adding sheet context to the key fragments memory across those files, so the second upload learns nothing, which defeats the purpose. Storing context without keying on it gives the safety signal without the fragmentation. The global seed layer is what makes the *first* upload mostly classified, rather than memory only helping from upload two onwards.

**Alternatives considered:**
- `(label + sheet)` as the composite key — rejected: fragments memory across a client's own files.
- Label-only with no context stored at all — rejected: loses the conflict signal that makes silent misapplication detectable.

---

## ADR-018: Published financial data is stored at line level; KPI values are a derived roll-up

**Date:** 2026-09-09

**Decision:** A new insert-only, period- and segment-addressable line-level table becomes the published store, carrying full provenance columns from the outset. `kpi_values` is derived from it through a declared line → head → KPI mapping. Report tabs and the dashboard continue to read KPIs through the KPI Engine — the single computation path is preserved — with drill-down reading the same rolled-up tree one level deeper, never a second path. The two must never become independent sources of truth that can disagree. The rule in `lib/review/actions.ts` rejecting two lines that map to one KPI is correct under the old model and is **replaced, not relaxed**: many-to-one is the normal case at line level.

**Why:** Line-level projection is required for the audit trail (the client's own accountant projects line by line), and the existing KPI-level store physically cannot hold it — the catalogue is roughly twenty keys and a real ledger scope is sixty-five lines. Provenance columns are added at creation because retrofitting them means backfilling nulls across published financial rows, which under ADR-006's insert-only rule cannot be corrected in place.

**Alternatives considered:**
- Projecting at KPI level — rejected: destroys the audit trail the feature is sold on.
- Using `extracted_lines` as the store — rejected: it is staging — mutable, staff-only, soft-deleted on re-extraction, and addressed by `job_id` rather than by period.
- Letting report tabs read lines directly — rejected: a second computation path; the dashboard and the P&L tab will eventually disagree, breaking the standing rule that they never do.

**Addendum — why a skipped line must be LOUD, with the worked example that proves it (2026-09-09):** the rollup skips any line it cannot place — one with no head, or with a head that has no entry in the map version in force. That omission is deliberately noisy: it returns the total, count, labels and per-segment breakdown, and it emits an `unclassified_value` KPI so the figure reaches the report through the same path as every other number.

This reads like a UI preference until it catches an accounting error. During A7-a, `stockChange` was deliberately left out of migration 0023's `head_kpi_map` seed on the defensible reasoning that stock movement has no published metric of its own. Because unmapped heads fall through to unclassified, opening and closing stock were **simultaneously counted as unclassified AND removed from cost of goods sold**. Gross profit broke and the unclassified figure was wrong, in the same test run, and the two failures together identified the cause immediately.

Had the rollup dropped unmapped heads silently, gross profit would have been wrong and **nothing would have said so**. The client would have seen a better margin than they earn, and it would have looked entirely plausible — because every unclassified line is a cost, so the error is always in the flattering direction. That asymmetry is what makes silent omission the worst failure mode this system has.

The fix closes the class, not the instance: `HEAD_MAP_V1` in `lib/kpi/head-map.ts` is typed `Record<ProjectionHead, string>`, which is total by construction, so adding a head to the classifier without mapping it is a COMPILE error rather than a runtime surprise (verified by removing one and watching the build fail). `head-map.test.ts` additionally asserts that the TypeScript declaration, the classifier's head list and the SQL seed all agree, since two of the three agreeing is exactly what produced the bug.

---

## ADR-019: A client's units are segments of one legal entity unless a real group structure exists; RPIL's plants are segments

**Date:** 2026-09-09

**Decision:** Reliable Packaging Industries Limited is one company with two plants, Dhaulana and Greater Noida — confirmed by its own workbook, which carries a single company-headed P&L with Dhaulana, Greater Noida and Total columns side by side. They are modelled as `kpi_values.segment` (and its line-level successor per ADR-018), **not** as child organizations. This confirms migration 0009's original reasoning and supersedes the loose description of them as "two legal units" in the A7 brief.

The general rule this sets: `segment` is for units of one legal entity — one PAN, one set of audited financials, company-wide tax. `organizations.parent_organization_id` (ADR-008) stays reserved for genuine group and subsidiary structures, where inter-company elimination and separate tax computations are real requirements.

**Why:** The distinction is not cosmetic — it determines whether consolidation is summation or elimination, whether tax is computed once or per unit, and whether a segment balance sheet is a legitimate output or a fabrication. Getting it wrong in either direction produces confidently-presented nonsense: eliminating transactions that do not exist, or summing tax charges that were never separately computed.

**Alternatives considered:**
- Modelling the plants as child organizations under ADR-008's hierarchy — rejected: there is no second legal entity, so every downstream consequence (elimination, per-unit tax, per-unit balance sheet) would be invented.
- Deciding per client at ingestion time without a recorded rule — rejected: this exact ambiguity has already cost one round-trip; the rule needs to be written down once.

---

## ADR-020: Derived client figures may be committed; source client documents never are

**Date:** 2026-09-09

**Decision:** A clear line, drawn deliberately rather than by drift:

- **Source client documents never enter version control.** The RPIL workbook is a 33-sheet working ledger holding two units' trial balances, month-by-month detail and the client's own internal observations. It stays out permanently. Tests that need it read it from a path supplied by the `RPIL_WORKBOOK` environment variable and SKIP when it is absent. This is the pattern for every future client-document fixture.
- **Derived figures may be committed** — line-level amounts, reconciliation targets, classification expectations. These sit at the level already present in migration 0010 and `public/r/rpil.html`, and they are what makes a golden test meaningful. `lib/ingestion/__fixtures__/rpil-projection-fixture.v2.json` is committed on this basis.

**Why:** "We already committed RPIL figures once" is not a principle, and without one this decision would be made differently by each session. Git history is permanent, repository access is broader than client-data access should be, and there is no RLS on a repository — so the source document, which contains far more than the figures the client has agreed to see reported, cannot be there. The derived figures are a different thing: they are the output the client already receives.

**Accepted consequence, stated plainly:** because CI runs only the synthetic-grid suites (`workbook.test.ts`, `row-class.test.ts`), **a regression in real-workbook handling will not be caught by CI.** That is a trade accepted for the boundary above, not an oversight. The mitigation is procedural and binding: the golden test (`rpil-golden.test.ts`) must be run locally, with `RPIL_WORKBOOK` set, before any parser change ships.

**Relationship to ADR-010:** this is the same family of question as the ADR-010 addendum on client documents passing through the Claude API, and the two are to be decided consistently — a client document may leave our infrastructure for a bounded, disclosed purpose, but it is never persisted anywhere it cannot later be revoked. A git repository is the clearest example of somewhere it cannot.

**Alternatives considered:**
- Commit the workbook so CI runs the golden test — rejected: permanent, broadly-readable storage of a client's internal working papers, to buy CI coverage that a local pre-ship run already provides.
- Keep the derived fixture out too, behind the same env var — rejected: it would leave CI with no expectation to check the classifier against at all, and the derived figures carry no exposure beyond what the client's own report already contains.
- Commit a redacted workbook with scrambled amounts — rejected: the labels and layout are the sensitive structure as much as the figures, and a fixture whose numbers do not reconcile cannot test the thing the golden test exists to test.

---

## ADR-021: A migration is not correct until a real database says so

**Date:** 2026-09-23

**Decision:** Every migration is applied, in filename order, to a throwaway Postgres matching the live major version, and the resulting STATE is asserted against — `.github/workflows/db-verify.yml` + `supabase/ci/`. **`db-verify` must be green before `db-migrate` is ever run against production.** That is a standing operating rule, not a suggestion.

No test that reads migration TEXT may be described as verifying the database. Such tests are useful as fast early warnings and are necessary-but-never-sufficient; they must say so in their own header, and they must not grow assertions they cannot honestly make.

**Why — two worked examples, both from the session that produced this rule:**

**1. The one that reached production.** Migration 0023 seeded `head_kpi_map` above the `kpi_definitions` rows its foreign key references. Postgres executes top to bottom, so it failed on the live database with `Key (kpi_key)=(cost_of_goods_sold) is not present in table "kpi_definitions"`. The test meant to prevent exactly this concatenated every migration file into one string and regex-searched for the key — finding it sixteen lines further down the same file, and passing. It had no model of execution order and no model of a database. It was reported as checking that every head "points at a key some migration actually **creates**"; the word implied execution, and nothing executed.

**2. The same error, repeated in the fix.** The first replacement assertion — "definitions are seeded before the map" — also searched all migrations concatenated, where `insert into public.kpi_definitions` appears in 0007 and 0009 as well. It matched an unrelated file and PASSED with 0023 deliberately re-broken. It was caught only by flipping the order to prove the test failed, and watching it pass.

The second example is the load-bearing one. The first can be read as a careless mistake. The second shows that someone who has just been burned by text-not-state reasoning, is actively trying to fix it, and knows exactly what the failure mode is, will still reproduce it — because text searching *feels* like verification. Cleverness applied to SQL text does not converge on correctness. Only executing it does.

**Why this mattered more than usual at the time:** when 0023 ran, the project was on the Supabase Free plan, which keeps **no backups**. There was no restore point. For that period `db-verify` was not a quality gate, it was **the sole substitute for a backup** — the only thing between a bad migration and an unrecoverable production database holding live client financial records. The project moves to Supabase Pro (daily backups + PITR) before further migration work, and the rule survives that change: a backup makes a bad migration recoverable, it does not make it acceptable.

**What the CI database does NOT prove, named so nobody over-reads a green run:** `auth.uid()` returns NULL in the shim, so RLS policies are proven syntactically valid and column-correct but NOT proven to admit and deny the right people. Tenant isolation continues to be proven by live testing, as recorded in the Changelog.

**Alternatives considered:**
- Smarter static analysis of the SQL (parse statements, order them, resolve dependencies) — rejected: it is a reimplementation of Postgres that is always behind Postgres, and example 2 shows the failure mode is *confidence* in text reasoning, not insufficient sophistication of it.
- Rely on the production run's `--single-transaction` rollback — rejected: it makes a failure survivable, not preventable, and it burns the attempt against live data. 0023 rolled back cleanly, which was luck of the draw on which statement failed first, not a guarantee.
- A shared staging Supabase project instead — rejected as the primary control because it is slower, costs money, drifts from production, and still requires someone to remember to use it. A per-run throwaway database cannot drift and cannot be skipped. (A preview-scoped project remains worth having for APPLICATION testing — see the standing risk that Preview currently shares production's database.)

---

## Template for future entries

```
## ADR-NNN: <short decision title>

**Date:** YYYY-MM-DD

**Decision:** <what was decided, stated plainly>

**Why:** <the reasoning — what problem this solves, what it prevents>

**Alternatives considered:**
- <alternative> — <why rejected>
```
