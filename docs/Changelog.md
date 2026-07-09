# Changelog.md

Tracks changes to the platform's plan and documentation itself — architecture, roadmap, and decisions — as distinct from a code-level CHANGELOG (which belongs in the repo root once real implementation begins, and should log shipped milestones, not planning).

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
