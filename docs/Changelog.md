# Changelog.md

## 2026-07-14 (Amendment A4-a — ingestion schema, storage, upload surface)

- Migration 0013: the FULL A4 data shape in one migration so A4-b/A4-c are pure app code — `client_documents`, `ingestion_jobs` (own `ingestion_stage` enum; one live job per document) + insert-only `ingestion_job_events` with auto-recording trigger (status_history PATTERN, deliberately not the work_status enum), `extracted_lines` staging (staff-only in every verb — unreviewed numbers are never client-visible), `account_mappings` memory (unique live per org+normalized label, FK to kpi_definitions.key). `docIngestion` flag added to lib/feature-flags.ts + seeded in the registry.
- RLS: members read own-org documents/jobs and insert uploads; member-created jobs are FORCED to stage 'received' by the insert policy (the analyst-approval gate is schema-enforced, not just app logic); stage transitions staff-only; event notes staff-only (members get coarse stage from the job row).
- STORAGE (deliberate boundary, documented in 0013's header): bytes live in a private `client-documents` bucket with NO storage policies — every access goes through server actions via the service-role client (M8 precedent, always audit-logged), bucket lazily created on first upload; `client_documents` rows (authenticated-client writes, real actors) are the tenancy record. Avoids the storage.objects-policy-from-migration permission trap entirely.
- `lib/documents/`: `model.ts` (shared kinds/stages/limits vocabulary — same server/client boundary reasoning as tab-defs), `actions.ts` (upload: flag gate, type/size validation vs a 20 MB limit, staff-on-behalf support via `is_internal_staff` RPC, orphan-byte cleanup if the row insert fails, audit entry), `queries.ts` (member read path).
- Documents page real path: upload form (kind + optional period hint; copy promises analyst review, not instant numbers) + uploaded-documents list with member-facing stage badges. Mock mode byte-identical. Staff uploads auto-approve ('approved'); client uploads wait at 'received'.
- `next.config.ts`: server-action body limit raised to 25 MB (Next default 1 MB would reject every upload).
- Deferred to A4-c (recorded): approve/reject staff actions + queue UI; staff org-picker upload surface; document download via signed URLs.
- Verification pending: Vercel build (compile gate) + live Preview upload once pushed; migration 0013 auto-applies on push.

## 2026-07-14 (Amendment A4 SCOPED — document ingestion pipeline)

- Dedicated scoping pass completed with Parth (the treatment A2 got). Full scope recorded in `Integration Roadmap.md` under the A4 amendment; architecture keystone recorded as ADR-010.
- DECISIONS (Parth): source docs are a mix (Tally/Excel/ERP exports + digital PDFs; scans best-effort); clients AND analysts upload but processing runs only after analyst approval (approval gates the queue, not just the publish); review/confirm happens in an in-portal staff-gated UI — the platform's first internal-analyst surface.
- ARCHITECTURE (ADR-010): extraction ladder — deterministic parsers for known formats → Claude (`claude-opus-4-8`, structured outputs, one org's one document per request) → mandatory analyst review. Model output never touches kpi_values; staging (`extracted_lines`) + arithmetic validation gates (TB balance, BS equation, P&L recompute) + staff-confirmed publish through the existing insert-only path with document provenance. Org-scoped `account_mappings` memory makes repeat uploads deterministic.
- A4 becomes the platform's FIRST AI feature (ahead of M13); AI Design.md updated — "assistive, not autonomous" applies verbatim, model/provider and review-surface open questions resolved for this feature.
- Schema plan: `client_documents` (+ private storage bucket), `ingestion_jobs` (own stage enum + insert-only events history — deliberately NOT extending work_status), `extracted_lines`, `account_mappings`. Flag: `docIngestion`.
- Build split: A4-a schema/storage/upload (M) → A4-b extraction+validation (L) → A4-c review UI+mapping+publish (L). Non-goals recorded: no auto-publish ever, no narrative generation (separate future milestone), no OCR guarantee on scans, no live ERP (M15).

## 2026-07-14 (A6 verified on Preview and closed)

- Vercel build green on both projects after one type fix (pricing page indexed the PLAN_TIERS tuple with `i - 1`; `noUncheckedIndexedAccess` makes tuple indexing `| undefined` — the no-local-toolchain class of miss, caught at the Vercel gate as designed).
- Migration 0012 auto-applied by the Actions workflow (run green, ~40s): tier enum values live; RPIL classified Manufacturing / Flexible Packaging / ₹100Cr+.
- LIVE-VERIFIED on Preview: /pricing renders all four tier cards from the taxonomy module (cumulative deliverables correct per the A6 map), the manufacturing add-on note, the combined-package footnote, and the "Packages" nav item. Auth gate on /dashboard confirmed intact.
- DEFERRED (deliberate, low-risk): eyeball check of the 8 unlocked tabs on a logged-in session, and the jsonb-override grey-out demo (`{"report.segment": false}` → locked Segment tab). The resolution logic is unit-tested (18 tests); the combined package renders nothing locked by construction.
- Amendment ledger: only A4 (document ingestion) remains — needs its own scoping pass before implementation.

## 2026-07-13 (Amendment A6 — single combined package + entitlements + pricing page)

- Entitlement taxonomy is CODE-AS-DATA in one pure module, `lib/entitlements.ts` (+18 unit tests): four tiers from the package sheet (Essential ₹5–25Cr / Growth ₹25–50Cr / Strategic ₹50–100Cr / Enterprise ₹100Cr+), one key per dashboard deliverable, tab→tier map exactly as recorded in the A6 amendment. Inventory & Production is a manufacturing INDUSTRY ADD-ON (gates on `organizations.industry`), not tier-locked. Jsonb overrides (`{"report.inventory": true}`) win in both directions; malformed jsonb is ignored, never fatal.
- ADR-009: legacy `plan_tier` values (internal/trial/standard/premium) = the single combined package — everything granted; nobody is assigned a real tier yet, so moving a client onto one later is a one-row data change, no deploy. Entitlements are per-org DB state — a different mechanism from `NEXT_PUBLIC_FEATURE_FLAGS` (dev rollout), per the roadmap's do-not-conflate rule.
- Migration 0012: the four tier values added to the `plan_tier` enum (add-only, unused in-transaction — safe under the workflow's single-transaction run); RPIL classified per ADR-008 (Manufacturing / Flexible Packaging / ₹100Cr+, fill-NULLs-only) — the industry value is what keeps RPIL's Inventory tab unlocked.
- Report tabs now carry their entitlement key in `tab-defs.ts`; unentitled tabs stay VISIBLE but greyed with a lock (the package sheet sells progression — hiding kills the upgrade surface); navigating to one (incl. ?tab= deep links) renders `ReportLocked` and fetches NO data. `getCurrentUserOrganization` resolves effective entitlements from `plan_tier` + jsonb + industry. Mock mode untouched (no tabs there).
- `/pricing` marketing page renders the four tier cards FROM the taxonomy module — marketing claims and platform gates cannot drift. Revenue bands shown, not price points (engagements are priced on scope); combined-package-today note included; "Packages" added to site nav + footer. Enterprise is presented as scope (group/multi-entity, ADR-008), not extra tabs — no enterprise-exclusive entitlement key exists yet.
- On the live combined package nothing greys out, deliberately: A6 ships the MECHANISM. Verifiable by flipping a jsonb override (e.g. `{"report.segment": false}`) on RPIL and reloading.
- Remaining on the amendment ledger: A4 (document ingestion — needs its own scoping pass first).

## 2026-07-13 (A2 VERIFIED live and closed)

- LIVE-VERIFIED on Preview: FY26 scores 68/B (drivers 66/75/58/71; NP margin + unit concentration flagged), Q1 FY27 recomputes to 65/B (financial 75 — pre-tax NP margin clears the band; growth 40 — no prior quarter, 72% concentration breach; capital 68) — every value matches the unit-test math. Per-period scoring works: the health trend line foundation is in place.
- Fix en route: the card's breakdown link dropped the period param and the tab had no period control — link now carries the resolved period; tab gained a period-only selector (compare stays pinned to previous-same-type; the score is a property of the period).
- Known nuance for a future band pass: Capital's revenue-scale score uses the PERIOD's revenue (a quarter reads as a smaller company than its annualized run-rate). Fix belongs in the scale mapping (annualize by period days) alongside the first band-tuning session.
- Remaining on the amendment ledger: A6 (single package + entitlements + pricing page), A4 (document ingestion — final scoping pass first). Qualitative governance/tech inputs + insert-only score persistence land with the analyst-publish flow.

## 2026-07-13 (Amendment A2 — client health score from financials)

- CLIENT health score now computes from financial evidence (leads keep the questionnaire engine). Pure module `lib/health-check/financial-score.ts` (+16 unit tests against RPIL FY26 actuals): metric-vs-band bucket scores (favorable 90 / within 75 / breach 40), weighted driver scores, Capital via the lead engine's 75/25 rule with the scale score from ACTUAL revenue, overall reweighted across evidenced drivers.
- Bands are DATA: migration 0011 `health_metric_bands` (driver→metric map, healthy bands, weights; authenticated read like kpi_definitions) — tuning a threshold is a row update. Defaults seeded: GP≥15%, NP≥5%, CCC≤60d, borrowings/rev≤0.30x, indirect/rev≤15%, asset turnover≥2x, growth≥10%, largest-unit share≤70%.
- Governance & Technology (approved): not in the numbers → "Not yet assessed", excluded and reweighted — never fabricated. Analyst/questionnaire inputs slot in later.
- Storage (approved deviation from A2's original scope): computed AT READ TIME (like ratios); the insert-only `health_scores` audit row arrives with a deliberate analyst-publish step (A4-adjacent), not as a GET side effect. Growth is pinned to the previous same-type period so the score is a property of the period, not of the user's compare selection.
- UI: dashboard health card real on the real-data path (computed → persisted lead score → honest "Not yet assessed"; mock 82/A− only in mock mode; breakdown link → the new tab). New "Health Score" report tab: score ring, six-driver breakdown, metric-level detail with bands ("How the score is built").
- Expected RPIL FY26 score with default bands: **68 / B** — dragged by NP margin 3.3% (<5%) and 78% Greater-Noida revenue concentration (>70%); both are real diagnostics, not artifacts. Verification pending on Preview.

## 2026-07-13 (A3-UI VERIFIED live — multi-tab report closed)

- LIVE-VERIFIED on Preview (Q1 FY27 vs FY26): P&L line-by-line exact incl. margin sub-rows and correctly-absent Q1 lines; Segment tab shows branch P&L + BS (Dhaulana's net-advance payables render as accounting parentheses); Key Ratios scale day-ratios by real period length (Q1 DSO on 91 days) with direction-aware coloring (falling DPO flagged red). Overview confirmed with restated GP ₹30.02Cr.
- Two build/runtime fixes en route: (1) const-tuple label union widened by a filter predicate in cost-structure-tab (type error at Vercel gate); (2) REPORT_TABS exported from the "use client" nav module became an opaque client reference when the server page imported it — any ?tab= URL crashed server-side. Registry moved to report/tab-defs.ts (shared, non-client). Lesson recorded: values crossing the server/client module boundary are references, not data.
- Reading caveat carried in data provenance: Q1 net profit is before tax provisioning; FY26's is PAT — margin comparisons across those periods carry that basis difference.

## 2026-07-13 (Amendment A3-UI — multi-tab report)

- Dashboard becomes a 7-tab report on the real-data path (mock mode byte-identical, no tabs): Overview (existing CommandCenter) / P&L / Balance Sheet / Key Ratios / Cost Structure / Segment / Inventory. Tab state is URL-driven (`?tab=`), period/compare params persist across tabs.
- `lib/kpi/ratios.ts` (pure, unit-tested): GP%/NP%/DSO/DIO/DPO/CCC/borrowings-to-annualized-revenue computed AT READ TIME from statement-line primitives — ratios are never stored (single-computation-path). Day ratios scale by each period's real length (`periodDaysBetween`); `KpiSnapshot` now carries both periods' date ranges for exactly this.
- `getSegmentValues(periodId)` + `getMonthlySeries(org, key)` added to the query layer (authenticated client, RLS via period→org join). `getReportSnapshot()` is the tabs' shared fetch.
- New components under `components/dashboard/report/`: shared `ComparisonTable` + `statement.ts` row-builders (prior value = current − trend.delta from the engine; no new math), `ReportEmpty`, and the six tab components. `ReportTabs` nav (client, URL-param driven). All styled from existing tokens — no second design system.
- Honest-rendering rules throughout: lines a period doesn't carry don't render (never a fabricated zero); ratios with missing inputs show "—"; Cost Structure v1 is the GP→NP bridge (category breakdown is a named data gap awaiting expense-line definitions or A4); Inventory renders recorded provenance notes as footnotes and never interpolates sparse months.
- FIXED (flagged 2026-07-13): real-data path with an empty period now shows an honest "No data recorded" state instead of silently falling back to mock cards. Mock fallback remains only for mock mode.
- FIXED: `actions/checkout` v4 → v5 (Node 20 deprecation warning in the migration workflow).
- No DB changes in this milestone; verification is Vercel build + live Preview (tabs against RPIL's Q1 FY27 / FY26 / monthly data).

Tracks changes to the platform's plan and documentation itself — architecture, roadmap, and decisions — as distinct from a code-level CHANGELOG (which belongs in the repo root once real implementation begins, and should log shipped milestones, not planning).

## 2026-07-13 (A5 + A3-data VERIFIED live; A1 verification closed)

- CI pipeline's first real run: migrations 0009 + 0010 auto-applied by the Actions workflow (attempt #1 failed on the IPv6-only direct DB host — secret must be the SESSION-POOLER URI; attempt #2 green in 40s). Automation confirmed end-to-end: push → migrate → verify tables in the log.
- LIVE-VERIFIED on Preview (Q1 FY27 vs FY26, custom compare): all 8 KPI cards correct to the paisa — revenue −69.1%, GP −67.8% (proves the FY26 GP correction row ₹30.02Cr is what the engine reads), OI −99.7%, NP −29.3%, receivables +18.6%, payables −3.8%, cash +24.9%, inventory −3.6%. Selector URL-driven; comparator named in delta labels.
- A1 formally CLOSED: the resolver, selector, and custom comparison verified against real data in production-shaped conditions.
- Deferred hardening noted: bump actions/checkout (Node 20 deprecation warning), A3-UI must replace the mock fallback for empty periods (Apr/May 2026).

## 2026-07-13 (Strategic realignment + A5/A3-data + migration automation)

- ROADMAP: strategic realignment recorded; end-goal frozen against the two reference reports (multi-tab client report, eventually populated from uploaded TB/P&L/BS — numbers automated, narrative human-authored). Amendments A3 (multi-tab, split data/UI), A4 (doc ingestion, last), A5 (period granularity), A6 (single package + per-org entitlements ≠ env feature flags). Sequence: A5+A3-data → A3-UI(+A2) → A6 → A4.
- DESIGN DECISION (approved): branches are a `segment` dimension on `kpi_values` (null = consolidated), NOT child organizations — RPIL's units share one legal entity (tax/depreciation/finance company-wide); ADR-008 hierarchy stays reserved for real group structures.
- Migration 0009: `kpi_values.segment` + reindexed lookup; `kpi_current_values` recreated as latest-per-(period, definition, segment); 8 statement-line definitions (fixed_assets, secured/unsecured_borrowings, indirect_expenses, depreciation, finance_cost, pbt, tax_expense; sort_order 90+ keeps them off the dashboard row). Ratios deliberately NOT stored — computed at read time (single-computation-path).
- `queries.ts`: group snapshot filters `segment is null` — dashboard behavior unchanged.
- Migration 0010 (data seed from report _8): monthly periods Mar–Jun 2026 + quarterly Q1 FY27 (created_at backdated so FY26 stays the dashboard default, per approval); Q1 group+branch P&L and 30-Jun-2026 balance sheet; FY26 enrichment (PBT/tax/depreciation/finance cost, 31-Mar fixed assets & borrowings, branch segments); **FY26 gross profit CORRECTION row — restated to audited-FS basis ₹30.02Cr (supersedes ₹47.24Cr; dashboard GP card will change)**; monthly inventory Mar/Jun on BS basis + Apr/May Greater Noida only (materials & stores basis — Dhaulana absent from the report; group Apr/May honestly missing, never interpolated).
- AUTOMATION: `.github/workflows/db-migrate.yml` — new files in `supabase/migrations/` auto-apply to Supabase on push (filename order, tracked in `public._applied_migrations`, single-transaction each, verification queries printed in the Actions log). Push = consent. One-time setup: `SUPABASE_DB_URL` repo secret (SESSION-POOLER URI — GitHub runners have no IPv6). Bootstrap marks 0001–0007 applied; 0008 conditionally (its manual run was unconfirmed) so the pipeline self-heals either way.
- KNOWN SHARP EDGE (flagged, not fixed — UI out of scope): selecting a period with no group-level values (Apr/May 2026) makes the KPI row fall back to MOCK cards silently (pre-existing command-center behavior). A3-UI must replace that fallback with an honest empty state.

## 2026-07-11 (Amendment A1 — flexible period comparison)

- Migration 0008: `kpi_periods` gains `period_start`/`period_end` dates + a (org, type, start) index; backfilled RPIL FY25/FY26 on the Apr–Mar fiscal year. Nullable; the resolver degrades gracefully when a date is absent.
- `lib/kpi/period-comparison.ts` (pure): `resolveComparator(current, mode, candidates, customLabel)` — modes previous/mom/qoq/yoy/custom via month-offset date matching; `shiftMonthsBack` numeric date math (no timezone drift). Unit-tested (`period-comparison.test.ts`): year-boundary shifts, type-crossing guard, earliest-period and no-match → null (no fabricated delta).
- `getKpiSnapshot` now takes `{ periodLabel, compare, comparePeriodLabel }` and resolves the comparator by date relationship (was "next created"). New `getOrgPeriods()` feeds the selector. `KpiSnapshot`: `priorPeriodLabel` → `comparisonMode` + `comparisonLabel`. Engine stays the single computation path; the resolver only picks which two periods it evaluates.
- `getDashboardData(query)` threads the comparison and returns the period list; `map-kpis` delta label now names the actual comparator ("22.5% vs FY25").
- Dashboard: `PeriodComparisonSelector` (client, URL-param driven, Suspense-wrapped for `useSearchParams`) — Period + Compare dropdowns, the latter listing relationship modes plus explicit "vs &lt;period&gt;" custom pairs. `dashboard/page.tsx` reads `searchParams`. Real-data path only; mock path untouched.
- SCOPE REALITY: the framework covers MoM/QoQ/YoY/custom, but only YoY is demonstrable with RPIL's current data (annual FY25/FY26). MoM/QoQ light up once monthly/quarterly data is entered.
- Verification pending on Preview (no local toolchain; Vercel build is the compile gate). Requires migration 0008 run in Supabase before the real path returns data.

## 2026-07-11 (RPIL real-data dashboard on Preview + board KPI switch)

- SEED CONFIRMED & DATA LIVE: first platform-owner org (CFOXPERT, is_platform_owner) + first client org (Reliable Packaging Industries Ltd) + memberships (client membership most-recent so it resolves as active org, per §8 gotcha) + FY25/FY26 kpi_periods + 9 kpi_values. Prior lost seed was rebuilt from the real migration schema, not the handed-over copy.
- Migration 0007 (board-report KPI definitions): relabel `revenue`→"Total Revenue"; deactivate `ebitda_margin`/`cash_cycle_days`/`working_capital`; add 7 INR definitions (gross_profit, other_income, net_profit, trade_receivables, trade_payables, cash_bank, inventory). Definitions are data (ADR-004); deactivate-not-delete keeps historic values valid.
- Dashboard KPI row now shows the 8 board line items: `map-kpis.ts` ICON_BY_KEY repointed; `kpi-card.tsx` + `types` icon union extended with 7 lucide icons in lockstep. Card order deterministic via engine `sortOrder`.
- KPI VALUES are real RPIL figures from the June-2026 board report: FY26 = full-year FY2025-26 P&L (revenue 178.12Cr actual, GP, other income, PAT) + 31-Mar-2026 year-end balance sheet (receivables, payables, cash, inventory); FY25 = FY2024-25 revenue only (145.43Cr). Revenue shows real +22.5% YoY; derivation notes carried in each `kpi_values.note`.
- realDashboardData FLIPPED ON — PREVIEW ONLY. `NEXT_PUBLIC_FEATURE_FLAGS` was scoped "Production and Preview" (shared) + Sensitive; split into a Preview-only var (`realAuth:on,realDashboardData:on`), Production left with no flags var (all default off = mock, as designed). This also fixes the "realAuth is Preview-only" intent. Vercel build is the compile gate (no local toolchain); build green.
- LIVE-VERIFIED on Preview: RPIL's 8 real KPI cards render with correct values and YoY delta; health card / charts / working-capital widget stay mock by design (only the KPI row is real, per M11 scope).
- Company name now shown in the Topbar (org resolved server-side in dashboard/page.tsx, passed through DashboardLayout; falls back to the plain title in mock).
- ROADMAP AMENDMENTS recorded (docs/Integration Roadmap.md): A1 flexible period comparison (MoM/YoY/QoQ/custom — needs dated periods + comparison resolver); A2 client health score computed from financials (hybrid — governance & technology stay qualitative). Build A1 before A2. Saved to session memory.
- Note: PR #1 merged `integration-milestones` → `main`/Production; the 8-KPI code is on Production but inert (flags off = mock). Nothing real exposed on Production.

## 2026-07-08 (Consolidated close-out — full repo received)

- All milestone files merged into the live repo; full repo typecheck + production build verified (29 routes; sandbox font-fetch stub used for the build only and reverted).
- CLOSED: M11 final swap — command-center.tsx async, real KPI row (via toKpiCardData mapper matching KPIData exactly) + real latest health score behind realDashboardData; all other widgets mock until their milestones, byte-identical with flag off.
- CLOSED: M12 core — ProtectedLayout real guard (loading state + router.replace('/client-login') on no session).
- CLOSED: M8 wiring — health-check page calls persistHealthCheckSubmission when flagged, sendToWebhook otherwise; webhook payload shape preserved for downstream consumers.
- CLOSED: M8 caveat — score recomputed SERVER-SIDE via the same pure computeHealthCheckResult; client result never stored.
- CLOSED: M1 ledger — lib/webhook.ts reads through lib/env.ts.
- CLOSED: M6 Settings — full name editable + save via updateOwnProfile when realAuth on; original behavior otherwise.
- FIXED against real shapes: Session.user.role union mapping (unknown metadata degrades to 'member'); HealthCheckResult.driverScores array shape; noUncheckedIndexedAccess guard in kpi/queries.ts.
- Repo build note: @supabase/supabase-js emits a benign Edge Runtime warning via middleware — known upstream, non-blocking.

## 2026-07-08 (Milestone 11 — Dashboard Data, provider layer)

- realDashboardData flag added. lib/dashboard/data.ts: getCurrentUserOrganization() (the org-resolution question the mock era never had to answer; most-recent live membership until an org switcher exists) + getDashboardData() (flag-gated; null → caller keeps mock behavior; delegates all math to the KPI Engine).
- Live-verified: single-member resolution, multi-org recency pick, logged-out null — and testing caught a real bug: resolution must filter user_id explicitly because RLS deliberately shows teammates' membership rows; visibility must never drive resolution.
- Final swap in command-center.tsx pending its contents + lib/mock-data/dashboard.ts shapes (INTEGRATION.md included).

## 2026-07-08 (Milestone 10 — KPI Engine)

- lib/kpi/engine.ts: pure evaluation core (score-engine.ts pattern) — benchmark position, direction-aware health (higher/lower-is-better inversion), trend with improvement semantics. 19 unit tests incl. boundary inclusivity, div-by-zero, negative priors, deactivated definitions.
- lib/kpi/queries.ts: getKpiSnapshot(org, period?) — authenticated-client reads (RLS is the tenancy boundary), definitions from kpi_definitions (ADR-004), values ONLY through kpi_current_values. Query shapes verified live incl. prior-period trend inputs and cross-tenant zero-rows.
- Standing rule enforced: this is THE single computation path; Dashboard (M11) and Board Packs consume it.

## 2026-07-08 (Milestone 9 — CRM, backend)

- Migration 0006: internal-staff model (platform-owner org + is_internal_staff()), leads/pipeline_stages/deals/crm_activities, atomic convert_lead(), staff read access to health-check data, linkage-derived score visibility via submission_organization() helper.
- lib/crm/actions.ts: createLead / updateLeadStatus (cannot set 'converted') / logActivity / convertLead (RPC), flag-gated (crm), authenticated-client writes so RLS is the boundary and audit fields carry real actors.
- Live-verified (11 scenarios): single platform owner, staff/client isolation both ways, immutable activities, full atomic conversion incl. audit + linkage, double-conversion blocked, non-staff RPC blocked, linkage-derived score visibility + tenant-isolation regression.
- Two real gaps caught by testing and fixed in-migration: staff read on submissions; RLS-within-RLS on the linkage policy.
- CRM UI deferred pending representative component files (no-second-design-system rule).

## 2026-07-08 (Milestone 8 — Health Check Persistence)

- `lib/health-check/persistence.ts`: flag-gated (healthCheckPersistence) server action — validate → persist submission → persist score → audit log (ADR-005, first write-capable feature) → webhook as side effect of a successful write, never co-equal.
- `lib/supabase/admin.ts`: service-role client (first legitimate need: public submissions with deny-all RLS); SUPABASE_SERVICE_ROLE_KEY added server-only + optional.
- Verified: exact insert sequence live against Postgres; public submissions invisible to all client roles; recompute lands as new score row; lead-conversion linkage works. 6 validation unit tests.
- Deferred, recorded: server-side score recompute (pending score-engine signature); rate limiting on the public path.

## 2026-07-08 (Milestone 7 — Database Schema)

- Migrations 0003–0005: audit_logs (insert-only, ADR-005), feature_flags + per-org overrides (seeded), auth email-sync trigger (closes M6 ledger item), full KPI schema (definitions-as-data per ADR-004, insert-only values per ADR-006, canonical kpi_current_values view), health check submission/score tables, the standardized workflow shape (work_status + auto-recorded status_history), recommendations + action_items.
- Verified: 12-scenario suite on live Postgres — insert-only enforcement, correction-as-new-row with view recency, automatic status history, cross-org RLS through the security_invoker view, deny-all on audit/history, email sync.
- Deliberate deferral: lib/feature-flags.ts keeps its sync env-driven read path; DB read path activates when the first per-org flag is needed.

## 2026-07-07 (Milestone 6 — User Management)

- Migration 0002: `users` profile table (auto-provisioned on signup), `organization_members` role join table (ADR-003), `is_org_member()` RLS helper.
- First real RLS policies: organizations opened to live members (deny-all otherwise preserved); own-profile read/update; org-scoped member-list visibility.
- Verified with 14 live tests incl. cross-tenant isolation, cross-user update attack (0 rows), membership revocation, soft-delete + re-add.
- `lib/auth/profile-actions.ts`: updateOwnProfile server action (Settings edit path; accepts no user id by design).

## 2026-07-07 (Milestone 5 — Organizations)

- First real migration shipped: `supabase/migrations/0001_organizations.sql`.
- organizations table live with hierarchy, plan tier, entitlements, benchmark classification (ADR-008), full audit conventions, and deny-all RLS pending Milestone 6 membership policies.
- Migration verified against real PostgreSQL 16 with 9 behavioral tests (constraints, trigger, RLS posture).

## 2026-07-07

- `cfoxpert-platform` confirmed as the single source of truth; earlier standalone scaffold retired to reference material (ADR-001).
- Initial Integration Roadmap produced: full inventory of mocks/placeholders in the live repo, mapped to a 14-step build order.
- CTO-level architecture review performed. Roadmap updated and frozen as **Platform Roadmap v1.0**:
  - Added Milestone 2 (Feature Flags).
  - Expanded scope of Organizations, User Management, and Database Schema milestones (hierarchy, entitlements, benchmark classification, org-scoped roles, KPI-as-data, audit logging, insert-only scored entities).
  - No milestones removed; no other reordering.
- `/docs` established as a first-class part of the repository, seeded with real content (not placeholders) for: Product Vision, Architecture, Integration Roadmap, Database Schema (structural placeholder pending Milestone 7), API Standards, KPI Library, AI Design, Decisions.

## Template for future entries

```
## YYYY-MM-DD

- <what changed in the plan/architecture/docs, not the code>
```
