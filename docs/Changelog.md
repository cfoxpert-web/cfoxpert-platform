# Changelog.md

Tracks changes to the platform's plan and documentation itself — architecture, roadmap, and decisions — as distinct from a code-level CHANGELOG (which belongs in the repo root once real implementation begins, and should log shipped milestones, not planning).

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
