/**
 * Amendment A6 — the entitlement taxonomy and resolver (pure).
 *
 * PER-ORGANIZATION DB ENTITLEMENTS — a different mechanism from
 * NEXT_PUBLIC_FEATURE_FLAGS (a dev rollout switch; see lib/feature-flags.ts).
 * Feature flags answer "is this capability deployed?"; entitlements answer
 * "has this client paid for it?". Never conflate the two.
 *
 * The taxonomy comes from the CFOXPERT package sheet's four tiers
 * (CFOXPERT_ver_2.docx), as recorded in docs/Integration Roadmap.md (A6):
 * Essential ₹5–25Cr / Growth ₹25–50Cr / Strategic ₹50–100Cr / Enterprise
 * ₹100Cr+. Each dashboard deliverable is an entitlement key; report tabs
 * map onto those keys in components/dashboard/report/tab-defs.ts.
 *
 * SINGLE COMBINED PACKAGE (current reality, ADR-009): every organization
 * still carries a legacy plan_tier ('internal'/'trial'/'standard'/
 * 'premium'). Those values mean "the one combined package" — every
 * tier-gated entitlement granted. Per-tier gating activates only when an
 * org is assigned one of the four tier values below (a data change).
 *
 * The organizations.entitlements jsonb column holds per-org OVERRIDES
 * beyond the tier default: `{"report.segment": false}` revokes,
 * `{"report.inventory": true}` grants. Interpretation happens HERE, in
 * application code — never in SQL (per migration 0001's contract).
 */

/** The four package tiers, cheapest first. Order IS the gating order. */
export const PLAN_TIERS = [
  "essential",
  "growth",
  "strategic",
  "enterprise",
] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];

export const TIER_INFO: Record<
  PlanTier,
  { label: string; revenueBand: string; tagline: string }
> = {
  essential: {
    label: "Essential",
    revenueBand: "₹5–25 Cr revenue",
    tagline: "The core financial report, every month.",
  },
  growth: {
    label: "Growth",
    revenueBand: "₹25–50 Cr revenue",
    tagline: "Unit-level visibility and forward-looking numbers.",
  },
  strategic: {
    label: "Strategic",
    revenueBand: "₹50–100 Cr revenue",
    tagline: "Board-level judgment: governance, advice, direction.",
  },
  enterprise: {
    label: "Enterprise",
    revenueBand: "₹100 Cr+ revenue",
    tagline: "Everything in Strategic, scoped to group structures.",
  },
};

/**
 * One entry per dashboard deliverable. `tier` = the cheapest tier that
 * includes it. `addOn` entries are industry add-ons, not tier-locked —
 * granted when the org's industry matches (or by explicit override).
 */
export const ENTITLEMENTS = {
  "report.overview": { label: "Overview dashboard", tier: "essential" },
  "report.pnl": { label: "P&L comparison", tier: "essential" },
  "report.balance_sheet": { label: "Balance Sheet", tier: "essential" },
  "report.ratios": { label: "Key ratios vs benchmarks", tier: "essential" },
  "report.cost_structure": { label: "Cost structure", tier: "essential" },
  "report.health_score": { label: "Business health score", tier: "essential" },
  "report.segment": { label: "Segment (unit-wise) reporting", tier: "growth" },
  "report.projections_forecasting": {
    label: "Projections — forecasting",
    tier: "growth",
  },
  "report.projections_modelling": {
    label: "Projections — scenario modelling",
    tier: "strategic",
  },
  "report.governance": { label: "Governance watch-list", tier: "strategic" },
  "report.recommendations": { label: "Recommendations", tier: "strategic" },
  "report.roadmap": { label: "Roadmap & ambition", tier: "strategic" },
  "report.inventory": {
    label: "Inventory & production",
    addOn: "manufacturing",
  },
} as const satisfies Record<
  string,
  { label: string; tier: PlanTier } | { label: string; addOn: string }
>;

export type EntitlementKey = keyof typeof ENTITLEMENTS;

export const ENTITLEMENT_KEYS = Object.keys(ENTITLEMENTS) as EntitlementKey[];

const TIER_RANK: Record<PlanTier, number> = {
  essential: 0,
  growth: 1,
  strategic: 2,
  enterprise: 3,
};

export function isPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

/** The cheapest tier that includes a key; null for industry add-ons. */
export function entitlementTier(key: EntitlementKey): PlanTier | null {
  const def = ENTITLEMENTS[key];
  return "tier" in def ? def.tier : null;
}

function matchesAddOn(def: { addOn: string }, industry: string | null): boolean {
  return industry !== null && industry.toLowerCase().includes(def.addOn);
}

export type OrganizationEntitlementInput = {
  /** organizations.plan_tier — legacy values mean the combined package. */
  planTier: string;
  /** organizations.entitlements jsonb — per-key boolean overrides. */
  overrides: unknown;
  /** organizations.industry — drives add-on applicability (ADR-008). */
  industry: string | null;
};

/**
 * Resolves an organization's effective entitlements: tier defaults (or the
 * combined package for legacy plan_tier values) + industry add-ons, then
 * explicit jsonb overrides, which win in both directions. Malformed
 * overrides are ignored — bad data must never crash the report.
 */
export function resolveEntitlements(
  input: OrganizationEntitlementInput,
): EntitlementKey[] {
  const tier = isPlanTier(input.planTier) ? input.planTier : null;

  const granted = new Set<EntitlementKey>();
  for (const key of ENTITLEMENT_KEYS) {
    const def = ENTITLEMENTS[key];
    if ("tier" in def) {
      // Legacy tier value = the single combined package: everything on.
      if (tier === null || TIER_RANK[def.tier] <= TIER_RANK[tier]) {
        granted.add(key);
      }
    } else if (matchesAddOn(def, input.industry)) {
      granted.add(key);
    }
  }

  const overrides = input.overrides;
  if (overrides !== null && typeof overrides === "object" && !Array.isArray(overrides)) {
    for (const [key, value] of Object.entries(overrides)) {
      if (!(key in ENTITLEMENTS) || typeof value !== "boolean") continue;
      if (value) granted.add(key as EntitlementKey);
      else granted.delete(key as EntitlementKey);
    }
  }

  return ENTITLEMENT_KEYS.filter((key) => granted.has(key));
}

/**
 * The sentence a locked surface shows for a not-included entitlement.
 * Kept here so every locked state describes the gate the same way.
 */
export function entitlementRequirement(key: EntitlementKey): string {
  const def = ENTITLEMENTS[key];
  if ("tier" in def) {
    return `${def.label} is part of the ${TIER_INFO[def.tier].label} package.`;
  }
  return `${def.label} is an industry add-on for ${def.addOn} businesses.`;
}
