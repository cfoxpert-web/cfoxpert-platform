# API Standards.md

**Status: no API layer exists yet in the live repo.** This document sets the standard to follow *when* one is needed, so the first route handler ever written (likely during Milestone 8 — Health Check persistence, if the webhook receiver moves in-app, or Milestone 15 — ERP integrations, for inbound connector endpoints) doesn't have to invent conventions on the spot.

## Default: prefer Server Components/Server Actions over a REST layer

Most of this platform's data needs (Portal reads, Dashboard data, CRM) should go through Next.js Server Components calling the data layer directly. A versioned REST API is not the default — it's reserved for cases where data needs to be reachable *outside* a Server Component render:

- Public, unauthenticated submission endpoints (Health Check)
- Inbound webhooks (future ERP integrations, milestone 15)
- Anything a future mobile client or external partner would call

## When a route handler is needed

- **Path convention:** `/api/v1/<resource>` — versioned from the first endpoint, even though only v1 will exist for a long time. Breaking changes get `/api/v2`, not a mutation of v1.
- **Error shape:** `{ error: { code, message, details? } }`, correct HTTP status per case (400 validation, 401 unauth, 403 forbidden, 404 not found, 409 conflict, 500 server).
- **Validation:** one Zod schema per resource, shared between the client form (if any) and the route handler. Never define the same shape twice.
- **Pagination:** cursor-based for anything that can grow unbounded (activities, documents, audit logs).
- **Auth:** Supabase session for anything not explicitly public. Public endpoints (Health Check submission) are rate-limited.

## Inbound integrations (ERP, milestone 15)

Each connector gets its own namespaced route (`/api/v1/integrations/<provider>/webhook`), not a shared generic endpoint — different providers have different payload shapes and different auth mechanisms (API keys vs. OAuth vs. signed webhooks), and conflating them into one endpoint creates a maintenance trap the first time two providers disagree on a field name.

## What not to do

- Don't build a REST endpoint for data a Server Component can fetch directly. This was the explicit "don't over-engineer" call in the original architecture discussion, and it still holds.
- Don't let convenience during one milestone create an unversioned or ad hoc endpoint "just for now" — every route handler that ships, ships under `/api/v1` from day one.
