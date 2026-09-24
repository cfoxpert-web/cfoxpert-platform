# Architecture.md

**This document describes the architecture of the live `cfoxpert-platform` repository** (Next.js 15, React 19), which is the single source of truth per ADR-001. It does not describe the earlier discarded scaffold.

This file should be updated at the end of each milestone with what actually got built — not written speculatively ahead of implementation. Sections marked *(pending Milestone N)* are intentions confirmed by the frozen roadmap, not yet-built fact.

---

## Stack (confirmed, as installed in the live repo)

- **Framework:** Next.js 15 (App Router), React 19
- **Styling:** Tailwind CSS, one centralized design system in `tailwind.config.ts`
- **Auth (current):** mock session via `lib/auth/mock-session.ts` + `session-provider.tsx`, consumed everywhere through `hooks/use-session.ts`
- **Data (current):** none — `lib/mock-data/*` stands in for all backend responses, typed to match the shape real API responses will eventually take
- **Business logic pattern:** pure, React-free functions for anything computational — e.g. `lib/health-check/score-engine.ts`, `lib/knowledge/filter-articles.ts` — a convention this document treats as binding for all future computation (KPI Engine included)

*(pending Milestone 3+)*: Supabase (Postgres, Auth, Storage) replaces the mock layers behind the existing seams.

## Core architectural convention: the seam pattern

Every mockable concern in this codebase was built behind a single, narrow interface:
- Auth → `useSession()`
- Health check scoring → `computeHealthCheckResult()` (pure function, takes answers, returns a result — doesn't care where the answers came from)
- Dashboard/portal data → typed constants shaped like future API responses

**Rule going forward:** every future milestone replaces what's *behind* a seam, not the seam itself, unless a milestone explicitly documents why the seam itself needs to change (and that becomes a `Decisions.md` entry, not a silent change).

## Permission model *(pending Milestone 6)*

Role is scoped to `organization_members` (user × organization), not global to the user. See ADR-003. This is the correct mental model for every future feature: **"can this user do X, in the context of this organization"** — never just "can this user do X."

## Data integrity conventions *(pending Milestone 7)*

- Scored/financial rows (`health_scores`, `kpi_values`) are insert-only. See ADR-006.
- Every write-capable table participates in `audit_logs`. See ADR-005.
- KPI definitions are data, not code. See ADR-004.

## Migration safety (standing rule, ADR-021)

**`db-verify` green before `db-migrate` runs. No exceptions.**

- `.github/workflows/db-verify.yml` applies every migration in order to a
  throwaway Postgres 17 (matching `cfoxpert-prod`) and asserts against the
  resulting state. It runs on every branch and PR touching
  `supabase/migrations/**`.
- `.github/workflows/db-migrate.yml` applies migrations to the LIVE database.
  It triggers on pushes to `integration-milestones`/`main`, or manually
  against any branch.
- A test that reads migration TEXT is an early warning, never a verification.
  It must say so in its own header. See ADR-021 for the two worked examples
  of why — including one where the same text-not-state error was repeated
  inside the fix for it.
- `supabase/ci/bootstrap.sql` names what the CI database cannot prove:
  `auth.uid()` is NULL there, so RLS is checked for validity, not for who it
  admits.

**Also standing:** Vercel Preview currently shares Production's Supabase
project — all three Supabase env vars are single entries targeting both
environments, and `NEXT_PUBLIC_FEATURE_FLAGS` is shared too. So the rule
"Production stays on mock flows until Preview is validated, flags are the
enforcement mechanism" does not hold as configured. A preview-scoped
Supabase project is open work, not a someday.

## Tenancy reads (standing rule, ADR-022)

**RLS is a boundary, never a selector.** It answers "may this viewer see
this row", not "is this the organization I am looking at".

- Reads of org-scoped tables filter `organization_id` explicitly, or fetch
  a single row by primary key, or carry a written `rls-scope:` justification
  for a deliberate cross-org staff surface.
- `lib/rls-scope.test.ts` enforces it and fails the suite otherwise.
- Rows with a NULL `organization_id` (public lead submissions) belong to no
  organization and are invisible to membership predicates — RLS cannot
  protect against attributing one to a client. Only an explicit filter can.

## Computation boundary

KPI Engine (Milestone 10) is the *only* place aggregation/calculation logic lives once built. The Dashboard and the future Board Pack Generator both call into it — neither reimplements it. This mirrors the existing `score-engine.ts` pattern and prevents the dashboard and a PDF board pack from ever showing different numbers for the same period.

## What this document is not

This is not a database schema reference (see `Database Schema.md`), not an API reference (see `API Standards.md`), and not a roadmap (see `Integration Roadmap.md`). It's the place to understand *how the pieces are meant to fit together* before touching any one of them.
