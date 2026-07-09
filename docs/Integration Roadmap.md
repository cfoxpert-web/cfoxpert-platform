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
