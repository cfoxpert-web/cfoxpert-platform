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

## ADR-022: RLS is a boundary, never a selector

**Date:** 2026-09-24

**Decision:** Row Level Security answers **"may this viewer see this row"**. It never answers **"is this row the organization I am currently looking at"**. Any read of an org-scoped table whose result is then attributed to a particular organization MUST filter `organization_id` explicitly. Fetching a single row by primary key is acceptable (RLS is a genuine boundary when the id is already known). A deliberate cross-organization read — a staff queue that spans clients — must carry a written `rls-scope:` justification at the call site.

Enforced by `lib/rls-scope.test.ts`, which fails the suite when an org-scoped table is read with no filter, no primary key and no justification.

**Why — this codebase has made the mistake twice, and the second was worse:**

**1. Milestone 11, org resolution.** `organization_members` was read without filtering `user_id`, because RLS deliberately shows teammates' membership rows so team views work. Visibility was driving resolution. Caught in live testing, and the Changelog recorded the lesson at the time: *"visibility must never drive resolution"*.

**2. A7-a-2, the Business Health Score.** `lib/dashboard/data.ts` read `health_scores` with no `organization_id` filter and rendered the most recent row as the viewed client's score. The rows in that table are **public lead self-assessments with `organization_id IS NULL`** — submissions from the marketing questionnaire, taken before any organization exists. RLS cannot scope those by membership because there is no membership to check. The result was a stranger's questionnaire score, 67/Grade B, displayed as a client's Business Health Score.

The second is worse than the first in a way worth naming: the M11 bug leaked between organizations the viewer already belonged to. This one surfaced a row belonging to **no organization at all**, which no amount of correct RLS could have prevented. That is the precise reason the rule has to live in application code — RLS is not capable of expressing it.

**A note on how it was found, because it nearly was not:** the first verification query for this investigation joined `health_scores` to `organizations` on `organization_id`. An INNER JOIN silently drops rows where that column is NULL — which was every row in the table. The conclusion drawn was "health_scores is empty", and it was wrong. A query written to check for a scoping bug reproduced the scoping bug. Verify with the narrowest query that can answer the question, not the most convenient one.

**Alternatives considered:**
- Fix the individual query and move on — rejected: one unfiltered query was found by accident while tracing something unrelated, which is not a search. The class needs a rule.
- Express the rule in RLS itself — rejected: impossible. RLS cannot know which organization a page is rendering, and rows with a NULL `organization_id` fall outside membership predicates entirely.
- A runtime assertion rather than a source check — rejected as the primary control: it would fire in production, on a client's screen, after the wrong number had already rendered. The source check fails before merge. (A runtime guard remains worth adding where a figure is attributed to a named organization.)

**Scope of the check, stated honestly (ADR-021):** it reads SOURCE. It proves every org-scoped list-read is filtered, keyed, or justified in writing. It does NOT prove the filter passes the correct id, and it does not claim to. Its value is that a new unfiltered read cannot be added silently — someone has to write down why.

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
