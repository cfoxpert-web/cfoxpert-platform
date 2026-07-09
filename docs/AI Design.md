# AI Design.md

**Status: not yet built.** AI Services is Milestone 13 in the frozen roadmap, sequenced after CRM, KPI Engine, and Dashboard Data specifically because it needs real data to generate insight from — generating commentary on mock data was explicitly rejected as not being a real milestone.

## Guiding principle: assistive, not autonomous

AI in this platform drafts; it does not decide, and it does not reach a client unreviewed. This was an explicit call made during initial planning and hasn't changed: no autonomous agent makes decisions on a client's behalf or publishes content without a human (an analyst/virtual CFO) reviewing it first.

## Intended scope (v1, once built)

- Monthly commentary generation on a client's KPI trends — drafted, not published, until reviewed.
- Recommendation suggestions — surfaced to an analyst, not auto-created as a client-facing recommendation.
- A future client-facing chat assistant, grounded in that specific client's own data — explicitly a later phase, not part of the initial AI Services milestone.

## Non-goals

- No autonomous decision-making.
- No AI-generated content reaching a client without human review, at least through v1.
- No cross-client data leakage in any grounding/context — AI features must respect the same organization-scoped permission model as everything else (see `Architecture.md` — permission model).

## Open questions (to resolve when Milestone 13 is actually scoped)

- Model/provider choice.
- Where human review happens in the UI (a draft/approve queue, most likely — needs its own design pass, not assumed here).
- How grounding data is selected and bounded per organization to prevent leakage across clients.

This file should move from "intended scope" to "actual scope" once Milestone 13 is scoped in detail, immediately before implementation — not designed in full today, since AI tooling and CFOXPERT's own data maturity will both have moved by the time this milestone is reached.
