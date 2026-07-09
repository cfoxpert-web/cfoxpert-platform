# Database Schema.md

**Status: not yet implemented.** No schema exists in the live repo as of this writing (Milestone 7 in the frozen roadmap). This file is the placeholder structure it will be written into — kept here now so the *shape of the documentation* exists before the *shape of the data* does, and so Milestone 7 has a clear template to fill rather than a blank page.

Do not treat anything below as implemented. Update each section with real detail as Milestone 7 is built, table by table, and keep this in sync with `prisma/schema.prisma` (or equivalent) from that point on — this file should never drift from the real schema.

---

## Standing conventions (apply to every table, per Decisions.md)

- Every table: `id`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- Soft deletes (`deleted_at`) on client-owned data.
- Scored/financial tables are insert-only (ADR-006) — never updated in place.
- Every write-capable table has a corresponding `audit_logs` entry pattern (ADR-005).
- Role/permission resolved via `organization_members`, never a role column on `users` (ADR-003).

## Tables — to be documented as built

### `organizations` — IMPLEMENTED (Milestone 5, migration 0001)
CFOXPERT client companies.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `name` | text | required, 1–200 chars (check constraint) |
| `parent_organization_id` | uuid FK → organizations | nullable; hierarchy per ADR-008; check: cannot equal own `id` |
| `plan_tier` | enum `plan_tier` | `internal · trial · standard · premium`; default `trial` (ADR-008) |
| `entitlements` | jsonb | default `{}`; interpreted in app code only, never SQL |
| `industry`, `sector`, `revenue_band` | text | benchmark classification (ADR-008), nullable |
| audit fields | | `created_at/updated_at` (trigger-maintained), `created_by/updated_by` → auth.users, `deleted_at` soft delete |

**Indexes:** partial on `parent_organization_id` (non-null), partial on live rows (`deleted_at is null`).
**RLS:** membership-based SELECT since Milestone 6 (`organizations_select_members`, via `is_org_member()`); writes remain service-role-only. Direct membership only — parent-org membership does NOT cascade to subsidiaries.
**Also introduced:** `public.set_updated_at()` — the generic updated_at trigger function every future table reuses.

### `organization_members` — IMPLEMENTED (Milestone 6, migration 0002)
ADR-003: role is a property of membership, never global. Columns: `id`, `organization_id` FK, `user_id` FK, `role` enum `org_role` (`owner · admin · member · analyst`), full audit fields + soft delete. **Partial unique index** on live (org, user) pairs — soft-deleted membership never blocks re-adding. RLS: members see their own orgs' member lists; no client-side writes.

### `users` — IMPLEMENTED (Milestone 6, migration 0002)
Profile table, 1:1 with `auth.users` (PK is the auth id, cascade delete). Auto-provisioned by the `on_auth_user_created` trigger (`handle_new_user()`, security definer), which copies email + `full_name` metadata at signup. RLS: own-row SELECT and UPDATE only — verified: cross-user update attempts affect 0 rows.

**Also introduced:** `is_org_member(org_id)` — the single security-definer membership check every current and future RLS policy uses. Never write a membership subquery inline in a policy; call this.

### `kpi_definitions` — IMPLEMENTED (Milestone 7, migration 0004)
ADR-004: KPIs as data. `key` (snake_case, unique), `label`, `unit`, `category` enum, `ideal_min/max`, `higher_is_better`, `sort_order`, `active`. Seeded with the FY26 board-report starting library (revenue, ebitda_margin, cash_cycle_days, working_capital). Read: any authenticated user (active rows). Writes: service role.

### `kpi_periods` / `kpi_values` — IMPLEMENTED (Milestone 7, migration 0004)
Periods: per-org, unique live (org, label), draft/finalized. Values: **insert-only (trigger-enforced, verified)** — corrections are new rows with an optional note. **`kpi_current_values` view** is the single canonical latest-value rule (`security_invoker`, so RLS flows through — verified cross-org). RLS: members read via period→org membership.

### `health_check_submissions` — IMPLEMENTED (Milestone 7, migration 0005)
Raw questionnaire submissions; `organization_id` nullable (public submissions pre-signup, linked at lead conversion). Deny-all RLS; server writes via service role (Milestone 8).

### `health_scores` — IMPLEMENTED (Milestone 7, migration 0005)
Insert-only (trigger-enforced, verified). `overall_score` 0–100 check, `grade`, `driver_scores` jsonb (six drivers). Members read own org's scores.

### `audit_logs` — IMPLEMENTED (Milestone 7, migration 0003)
ADR-005. Insert-only (trigger-enforced). Deny-all RLS — service-role writes, no client reads until an admin UI. **Also introduced:** `reject_mutation()` — the generic insert-only trigger every append-only table reuses.

### `status_history` + `work_status` — IMPLEMENTED (Milestone 7, migration 0005)
THE workflow shape, standardized once: `work_status` enum (`open · in_progress · resolved`), generic insert-only `status_history`, and `record_status_change()` trigger — attach it to any table with a `status work_status` column and every transition (including creation) is recorded automatically with the acting user. Verified: title-only updates record nothing. First consumers: `recommendations`, `action_items`.

### `recommendations` / `action_items` — IMPLEMENTED (Milestone 7, migration 0005)
Recommendations: org-scoped, `value_driver` enum (the six Enterprise Value drivers), `priority`, `status`, `source`. Action items: per-recommendation, assignee + due date + status. Both: full audit fields, soft delete, member-read RLS, service-role writes until analyst tooling defines write policies.

### `feature_flags` / `feature_flag_overrides` — IMPLEMENTED (Milestone 7, migration 0003)
Global flag registry (seeded to mirror `lib/feature-flags.ts`) + per-org overrides (ADR-007's pilot mechanism). Authenticated read; service-role writes. **Read path in app code remains env-driven/synchronous by design** — activates when the first per-org flag is needed, without breaking `isFeatureEnabled()`.

### CRM — IMPLEMENTED (Milestone 9, migration 0006)
**Access model:** `organizations.is_platform_owner` (unique-enforced single org = CFOXPERT itself); `is_internal_staff()` = live membership in it — ADR-003 reused, no parallel permission system. Internal staff get read/insert/update on all CRM tables via RLS (real-actor writes, no service role); clients see nothing; no hard-delete policies exist.
**Tables:** `leads` (status enum, source, submission linkage, converted org, assigned analyst), `pipeline_stages` (seeded, data-driven), `deals`, `crm_activities` (immutable log — no UPDATE policy; corrections are new rows).
**`convert_lead(lead_id, org_name)`** — atomic security-definer function: creates client org, links submission, marks lead converted, writes audit entry; internal-staff-gated, double-conversion blocked. `'converted'` status is unreachable except through it.
**Also:** `submission_organization()` security-definer helper — health_scores linkage visibility (an inline EXISTS would be filtered by the submissions table's own RLS; found by live testing). Staff read policies added on `health_check_submissions`/`health_scores` (analysts must review submissions to work leads).

### Notifications
*(pending Milestone 14)*

---

## How to keep this file honest

When Milestone 7 (and later, 9/10/14) actually ships, replace the relevant `*(pending Milestone N)*` section with the real table definition — columns, types, indexes, RLS policy reference. If a milestone changes a decision recorded in `Decisions.md`, add a new ADR entry before updating this file, not after.
