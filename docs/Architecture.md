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

## Computation boundary

KPI Engine (Milestone 10) is the *only* place aggregation/calculation logic lives once built. The Dashboard and the future Board Pack Generator both call into it — neither reimplements it. This mirrors the existing `score-engine.ts` pattern and prevents the dashboard and a PDF board pack from ever showing different numbers for the same period.

## What this document is not

This is not a database schema reference (see `Database Schema.md`), not an API reference (see `API Standards.md`), and not a roadmap (see `Integration Roadmap.md`). It's the place to understand *how the pieces are meant to fit together* before touching any one of them.
