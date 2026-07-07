# CFOxpert Platform — Complete (Phases 1–7)

Status: **All phases complete, including final polish.** See `DESIGN_REVIEW.md` in this
directory for the closing audit against Apple/Stripe/McKinsey/SaaS standards, including an
honest list of what still isn't done.

## What exists right now

```
cfoxpert-platform/
├── app/
│   ├── layout.tsx           Root layout — fonts, metadata, persistent Header/Footer
│   ├── page.tsx              Homepage (Phase 2)
│   ├── platform/page.tsx     Platform page (Phase 2)
│   ├── health-check/page.tsx Business Health Check (Phase 3) — thin orchestrator only
│   └── globals.css          Intentionally tiny — almost everything lives in tailwind.config.ts
├── components/
│   ├── ui/                 button.tsx, badge.tsx, input.tsx
│   ├── layout/               Container, Section, SectionHeader, CTABanner, Header, Footer
│   ├── animations/           Reveal
│   ├── cards/                Card, ChallengeGrid, DashboardCard, MetricTile
│   ├── charts/                DriverBarChart (Recharts)
│   ├── forms/                 ContactCaptureForm (React Hook Form + Zod)
│   ├── platform/               ModuleShowcase
│   ├── health-score/            EnterpriseValueEngine, ProgressBar, QuestionCard,
│   │                            AnalyzingScreen, ScoreRing, ResultsPanel
│   ├── dashboard/               empty — Phase 4
│   └── knowledge/                empty — Phase 6
├── constants/
│   ├── drivers.ts            The six Enterprise Value drivers, incl. hex — ONE definition
│   ├── site.ts                 Nav items, footer columns, contact info
│   ├── challenges.ts            The six scaling-problem cards
│   ├── platform-modules.ts       Mock data driving ModuleShowcase
│   ├── health-check-questions.ts Typed question bank, one driverKey per question
│   └── health-check-content.ts    Opportunities + roadmap copy
├── hooks/
│   ├── use-scroll-reveal.ts
│   └── use-multi-step-form.ts    Generic step-wizard state
├── lib/
│   ├── utils.ts                 cn() class-merging helper
│   ├── validation.ts             Zod schemas
│   ├── webhook.ts                 Pluggable submission service (env-driven)
│   └── health-check/score-engine.ts  Pure scoring functions, zero React dependency
├── types/
│   └── index.ts                 Shared contracts
├── tailwind.config.ts         THE design system — every token, one file
└── tsconfig.json               Strict mode + path aliases
```

## Key architectural decisions (and why)

1. **Tailwind config is the single source of truth for design tokens** — not scattered CSS
   variables like the HTML prototypes had. If the navy shade ever needs to change, it changes
   in one file and every component picks it up.

2. **The six Enterprise Value driver colors/descriptions live in `constants/drivers.ts` only.**
   The HTML redefined these three separate times (homepage wheel, Health Check results,
   Platform previews) with descriptions that could silently drift apart. Now there's one array;
   all three features import from it.

3. **Nav links and footer columns live in `constants/site.ts` only.** The HTML copy-pasted the
   same 5-link nav into 8 files. Here, `Header` and `Footer` both read from this file — adding a
   nav item is a one-line change, not an 8-file find-and-replace.

4. **The mobile hamburger menu is a proper React component with Framer Motion**, not a hand-patched
   fix. (For context: the static HTML shipped without any mobile nav at all initially, and it had
   to be retrofitted into all 8 files individually — exactly the failure mode this architecture
   prevents going forward.)

5. **`Reveal` wraps scroll-triggered animation declaratively.** Instead of an IntersectionObserver
   block copy-pasted per page, any component wraps in `<Reveal>` and gets fade-up-on-scroll,
   with `prefers-reduced-motion` handled once, centrally.

6. **Fonts are next/font, not CDN Google Fonts links.** Source Serif 4 substitutes for Georgia
   (renders identically across OSes, which raw Georgia does not) and Inter substitutes for the
   -apple-system stack. Self-hosted, zero layout shift, no extra network request.

## Phase 2 decisions (and why)

7. **EnterpriseValueEngine is one component used on two pages.** It renders the interactive
   six-wedge wheel with hover-to-explore driver details, built from `constants/drivers.ts`.
   The homepage uses it with `variant="dark"` on the navy section; it's the same component
   the Business Health Check results screen will reuse in Phase 3 for the driver breakdown.

8. **ModuleShowcase's mock data lives in `constants/platform-modules.ts`**, typed with a
   discriminated union (`grid | list | pills`) so each module's preview panel renders the
   right layout automatically — adding a 9th module later is a data change, not a new component.

9. **DashboardCard + MetricTile are now used in two different contexts** (homepage hero,
   Platform module preview) with zero duplicated markup — confirming the Phase 1 bet that
   pulling these out early would pay off immediately in Phase 2.

10. **Fixed a real bug from the HTML while rebuilding, not just translating it:** the static
    Enterprise Value wheel had two driver colors nearly invisible against the dark background
    (an actual visibility bug, fixed by hand in the HTML phase). Because `DRIVER_FILL` here
    is a single map read by one component, that class of bug structurally can't recur per-page.

## Phase 3 additions — Business Health Check

```
app/health-check/page.tsx              Thin orchestrator — no scoring/validation logic lives here
lib/health-check/score-engine.ts       Pure functions: computeDriverScores, computeOverallScore,
                                        gradeFromScore, computeHealthCheckResult. Zero React
                                        dependency — could be unit tested with no rendering at all.
lib/validation.ts                      Zod schema for contact capture (name/phone/email)
lib/webhook.ts                          Generic pluggable webhook sender — env-driven via
                                        NEXT_PUBLIC_WEBHOOK_URL (see .env.local.example), not a
                                        hardcoded string inside a component like the old HTML.
constants/health-check-questions.ts    Typed question bank, discriminated union (options | slider),
                                        each question mapped to exactly one driverKey
constants/health-check-content.ts       Opportunities + roadmap copy, separated from presentation
hooks/use-multi-step-form.ts            Generic step-wizard state — not Health-Check-specific,
                                        reusable for any future multi-step flow
components/forms/contact-capture-form.tsx   React Hook Form + Zod, reusable wherever contact
                                        details need collecting
components/health-score/
  progress-bar.tsx                     Generic step indicator
  question-card.tsx                    Renders options OR slider questions from one component
  analyzing-screen.tsx                 The transient checklist animation between quiz and results
  score-ring.tsx                       Animated SVG ring — designed for dashboard reuse in Phase 4
  results-panel.tsx                    Composes ScoreRing + DriverBarChart + opportunities + roadmap
components/charts/driver-bar-chart.tsx  Recharts-based driver breakdown, colored from drivers.ts
```

### Phase 3 decisions (and why)

11. **The score engine is pure functions with zero React/UI dependency.** `computeHealthCheckResult`
    takes an `AnswerMap` and returns a typed `HealthCheckResult` — no hooks, no components. This
    means it's testable in isolation and could later run server-side (e.g. in an API route) with
    no changes.

12. **Fixed the real driver-mapping bug from the original HTML, structurally this time.** The
    static prototype accidentally had two drivers reading from the same "governance" answer.
    Here, `constants/health-check-questions.ts` requires each question to declare its
    `driverKey` explicitly, and Capital & Valuation has no question at all — it's *computed*
    (75% average of the other five drivers + 25% revenue benchmark), which is the architecturally
    correct fix, not a patch.

13. **`drivers.ts` grew a `hex` field** so `EnterpriseValueEngine`'s SVG fills and
    `DriverBarChart`'s Recharts bar colors both read the same value — closing a duplication gap
    that Phase 2 had opened (a local `DRIVER_FILL` map inside the wheel component).

14. **The webhook is environment-driven (`NEXT_PUBLIC_WEBHOOK_URL`), not a hardcoded empty
    string inside a component** like the static HTML's `CONFIG.WEBHOOK_URL`. Set it in
    `.env.local` (copy from `.env.local.example`) once you have a real destination — zero code
    changes required anywhere that calls `sendToWebhook`.

15. **`ScoreRing` was deliberately built generic** (score, size, strokeWidth, label props) rather
    than Health-Check-specific, because Phase 4's CEO Command Center dashboard will need the
    exact same ring for its own Health Score tile.

## Phase 4 additions — Dashboard foundation

```
app/dashboard/page.tsx                  PREVIEW route only — no auth/protected layout yet (Phase 5)
components/dashboard/
  kpi-card.tsx                          Light-theme KPI tile (distinct from marketing's dark MetricTile)
  command-center.tsx                    Composes every widget below into the full dashboard layout
  working-capital-card.tsx              Receivables/payables/inventory days + cash conversion cycle
  health-score-card.tsx                 Reuses ScoreRing from Phase 3 — zero new ring code needed
  action-tracker.tsx                    Reuses the ActionItem type defined all the way back in Phase 1
  board-pack-widget.tsx
  notifications-panel.tsx
  recent-activity.tsx
  tasks-widget.tsx                      Only widget with local interactive state (checkbox toggle)
  documents-widget.tsx
  quick-actions.tsx
components/charts/
  revenue-chart.tsx                     Recharts AreaChart
  cash-flow-chart.tsx                   Recharts grouped BarChart (inflow vs outflow)
lib/mock-data/dashboard.ts              All mock data, shaped like real API responses so swapping
                                        in a real fetch later doesn't require touching components
```

### Phase 4 decisions (and why)

16. **`HealthScoreCard` reuses `ScoreRing` from Phase 3 with zero new code** — exactly the payoff
    the Phase 3 README predicted when `ScoreRing` was built generic instead of Health-Check-specific.

17. **Mock data is shaped like a future API response**, not ad-hoc test fixtures. Each `MOCK_*`
    export in `lib/mock-data/dashboard.ts` matches the type it will return when a real backend
    exists — components import the data, not the shape, so swapping the source later is a
    one-line change per component (a `fetch` instead of an import).

18. **`/dashboard` is explicitly unprotected right now**, with a visible on-page notice saying so.
    This is intentional per the phase brief ("prepare authentication architecture... do NOT
    implement authentication") — the protected shell (Sidebar, Topbar, ProtectedLayout) is Phase 5,
    and building it before the widgets existed would have meant designing blind.

19. **Every dashboard widget takes typed props and renders nothing it wasn't given** — no widget
    reaches into `lib/mock-data` itself except `command-center.tsx`. This means Phase 5's real
    Client Portal can render the exact same widgets with real per-client data just by changing
    what's passed in, not by rewriting the widgets.

## Phase 5 additions — Client Portal

```
app/(portal)/layout.tsx                 Wraps every /dashboard/* route in SessionProvider + ProtectedLayout
app/(portal)/dashboard/
  page.tsx                              CEO Command Center (moved here from the old public Phase 4 preview)
  health-score/page.tsx                  Reuses ScoreRing + DriverBarChart; reuses the REAL score
                                         engine from Phase 3 via lib/mock-data/health-score.ts
  board-packs/page.tsx                   Reuses BoardPackWidget
  action-tracker/page.tsx                Reuses ActionTracker
  documents/page.tsx                     Reuses DocumentsWidget
  notifications/page.tsx                 Full list view, complements the topbar's quick dropdown
  settings/page.tsx                      Placeholder — profile fields are read-only (from mock
                                         session), three sections visibly marked "Soon"
app/client-login/page.tsx               Split-screen login/request-access — Log In navigates
                                         straight to /dashboard (no password check — see in-page notice)
types/index.ts                          Session, User types added
lib/auth/
  mock-session.ts                       One hardcoded Session object — the ONLY place a real
                                         auth provider's output would replace
  session-provider.tsx                  React context wrapping the mock session + signOut()
hooks/use-session.ts                     useSession() — the one hook every component calls;
                                         swapping mock-session.ts for real auth requires no
                                         changes to any component using this hook
components/layout/
  protected-layout.tsx                   STRUCTURE ONLY — documents exactly what a real
                                         implementation still needs (loading state, redirect)
  dashboard-layout.tsx                    Sidebar + Topbar shell wrapping portal page content
  sidebar.tsx                             Desktop rail + animated mobile drawer (Framer Motion)
  topbar.tsx                              Sticky blurred header with notifications + profile menu
  notifications-dropdown.tsx              Radix Popover, reuses NotificationTone from Phase 4
  profile-menu.tsx                        Radix DropdownMenu, reads the live session via useSession()
constants/portal-nav.ts                  Portal sidebar nav items — separate list from the public
                                         marketing NAV_ITEMS in constants/site.ts on purpose
```

### Phase 5 decisions (and why)

20. **Authentication is structured, not implemented — and this is enforced by comments at every
    seam, not just stated once.** `mock-session.ts`, `session-provider.tsx`, `protected-layout.tsx`,
    and the Client Login page each carry an explicit "structure only" note explaining exactly
    what a real implementation still has to add. Anyone picking this up later (including a future
    version of me) can find the seam without reading the whole codebase.

21. **One `useSession()` hook is the only thing every component talks to.** `ProfileMenu`,
    `ProtectedLayout`, and the Settings page all call `useSession()` — none of them import
    `mock-session.ts` directly. When real auth exists, only `session-provider.tsx`'s internals
    change (e.g. calling NextAuth's `useSession` instead of returning a hardcoded object);
    zero changes ripple out to consuming components.

22. **The Health Score portal page reuses the real scoring engine, not a hardcoded result.**
    `lib/mock-data/health-score.ts` calls `computeHealthCheckResult()` from Phase 3 with example
    answers, rather than hand-writing a fake `{overallScore: 82, ...}` object. If the scoring
    model or driver weights ever change, this page's numbers update automatically and can't
    silently drift from the real engine.

23. **The old Phase 4 public `/dashboard` preview was retired, not duplicated.** It's now
    `app/(portal)/dashboard/page.tsx`, wrapped in the (currently permissive) `ProtectedLayout` —
    one dashboard route, not two diverging copies.

24. **Client Login honestly discloses its own limitation in the UI itself**, not just in code
    comments: a visible note under the Log In button states there's no real password check yet.
    This matters because you don't have a developer reviewing this code — the person who *does*
    encounter this page needs to know from the interface itself, not from a README, that it isn't
    production-ready.

## Phase 6 additions — Knowledge Hub

```
app/knowledge/page.tsx                  Client component: search + category filter + featured
                                        article + paginated grid, all client-side over mock data
app/knowledge/[slug]/page.tsx            Server component with generateStaticParams +
                                        generateMetadata for real per-article SEO
types/index.ts                          Article gained a typed `blocks?: ArticleBlock[]` union
                                        (paragraph | heading | quote | stats | list) — no markdown
                                        parser is in the approved stack, so content is structured
                                        data rendered by ArticleBody, same pattern as every other
                                        feature in this app
constants/article-categories.ts          One category-color map, referenced by ArticleCard,
                                        FeaturedArticle, CategoryFilter, and the article page
lib/mock-data/articles.ts                10 articles; 3 fully written with content blocks
                                        (ported from the original static prototypes), 7 as
                                        honest teaser cards with no body yet
lib/knowledge/filter-articles.ts         Pure functions: filterArticles, paginateArticles,
                                        totalPages, getRelatedArticles — zero React dependency
components/knowledge/
  article-card.tsx                       Standard grid card
  featured-article.tsx                    Dark hero band for the featured piece
  category-filter.tsx                     Pill chip row
  search-bar.tsx                          Controlled input
  pagination.tsx                          Page-number control
  article-body.tsx                        Renders the ArticleBlock union
  related-articles.tsx
```

### Phase 6 decisions (and why)

25. **Article bodies are typed content blocks, not markdown strings.** The approved stack has no
    markdown parser (correctly — adding one for three articles isn't worth a new dependency).
    `ArticleBlock` is a discriminated union (`paragraph | heading | quote | stats | list`), and
    `ArticleBody` renders each type with a real component — this is more restrictive than
    markdown but keeps every article visually consistent, and matches how every other data-driven
    feature in this app already works (typed data in, component renders it).

26. **7 of 10 articles are honestly teaser-only.** Their `blocks` field is simply absent, and the
    article detail page checks for that and shows a plain, honest "not written yet" state instead
    of either crashing or faking content. This mirrors the same honesty principle already applied
    to the Client Login page's "no real password check" notice.

27. **The listing page is a client component; the detail page is a server component.** The hub
    needs live client-side search/filter/pagination — server components can't do that
    interactively. The detail page has no interactivity and directly benefits from
    `generateStaticParams` + `generateMetadata`, i.e. real per-article SEO titles/descriptions,
    which only server components can produce at build time.

28. **`getRelatedArticles` prioritizes same-category articles, falling back to others** so a
    reader always sees 3 related links even for the only article in its category.

## Phase 7 — Final polish

**Real gap closed, not just cosmetic polish:** About, Contact, 404, Privacy Policy, and Terms
were required pages from the original Phase 1 brief that existed only as standalone HTML from
earlier in this project's history — they had never been built as actual Next.js routes. All five
now exist:

```
app/about/page.tsx        Philosophy-first, no company history — per the original brief
app/contact/page.tsx      Info cards + working (mock-submission) form via the shared webhook service
app/not-found.tsx          Next.js special-file 404, styled consistently with the rest of the app
app/privacy/page.tsx       Structural template — visibly marked as NOT reviewed by a lawyer
app/terms/page.tsx         Structural template — same caveat, same visible on-page notice
```

**SEO metadata gap fixed:** Contact, Knowledge Hub listing, Health Check, and Client Login are
all client components (`"use client"`), which Next.js does not allow to export `metadata`
directly. Each now has a thin server-component `layout.tsx` sibling supplying real per-page
titles and descriptions.

**Accessibility gap fixed:** form labels across the Health Check contact form, Contact page,
Settings page, and Client Login were visually associated with their inputs but not
programmatically (`<label>` without `htmlFor`/`id`) — a real screen-reader failure, not a
cosmetic one. Fixed everywhere it appeared, plus `aria-invalid`/`aria-describedby`/`role="alert"`
added to the Health Check form's validation errors.

**Footer gap fixed:** added a Legal column linking to the now-existing Privacy/Terms pages.

**Recurring bug swept one final time:** invalid Tailwind spacing classes (`.5` decimals outside
the default scale, e.g. `mb-4.5`) had been introduced and caught in every single phase of this
build. One more full-project sweep confirms zero remain anywhere in the codebase.

**The closing design review** — `DESIGN_REVIEW.md` — audits the whole project against Apple,
Stripe, McKinsey Digital, and general SaaS standards, exactly as the original brief's final
deliverable requested. It's an honest document: it states what passes each standard, what's
borderline, and names the single most important remaining gap (no real authentication yet, which
caps how far the "feels like software" claim can go until it's addressed) rather than declaring
the project finished.

## What's still genuinely not done (see DESIGN_REVIEW.md for full detail)

- No real authentication, database, or backend anywhere in the app — by design, per every
  phase's brief, but worth restating plainly here at the end
- Privacy Policy and Terms are structural templates only, not lawyer-reviewed text
- `next-themes` is installed but dark mode is not implemented
- Mock data is repetitive across contexts (same illustrative numbers appear in the homepage
  hero, Platform preview, and Client Login) — real or varied example data would strengthen
  credibility

## Setup (once you're ready to run this)

You'll need Node.js installed. Since you mentioned not having a developer yet, here's the exact
sequence — this is also documented in more detail if you ask me to walk through it live:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` for the real homepage, or `http://localhost:3000/platform`
for the Platform page.
