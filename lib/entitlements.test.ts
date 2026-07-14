import { describe, expect, it } from "vitest";
import {
  ENTITLEMENT_KEYS,
  entitlementRequirement,
  entitlementTier,
  resolveEntitlements,
} from "./entitlements";

const TIER_KEYS = ENTITLEMENT_KEYS.filter((k) => entitlementTier(k) !== null);

describe("resolveEntitlements — single combined package (legacy plan_tier)", () => {
  it("legacy tier values grant every tier-gated entitlement", () => {
    for (const planTier of ["internal", "trial", "standard", "premium"]) {
      const got = resolveEntitlements({ planTier, overrides: {}, industry: null });
      for (const key of TIER_KEYS) expect(got).toContain(key);
    }
  });

  it("manufacturing industry grants the inventory add-on", () => {
    const got = resolveEntitlements({
      planTier: "trial",
      overrides: {},
      industry: "Manufacturing",
    });
    expect(got).toContain("report.inventory");
  });

  it("no industry → add-on not granted (honest non-applicability)", () => {
    const got = resolveEntitlements({ planTier: "trial", overrides: {}, industry: null });
    expect(got).not.toContain("report.inventory");
  });

  it("non-manufacturing industry → add-on not granted", () => {
    const got = resolveEntitlements({
      planTier: "premium",
      overrides: {},
      industry: "Software Services",
    });
    expect(got).not.toContain("report.inventory");
  });
});

describe("resolveEntitlements — real tiers", () => {
  it("essential: core report only", () => {
    const got = resolveEntitlements({ planTier: "essential", overrides: {}, industry: null });
    expect(got).toEqual([
      "report.overview",
      "report.pnl",
      "report.balance_sheet",
      "report.ratios",
      "report.cost_structure",
      "report.health_score",
    ]);
  });

  it("growth adds segment + forecasting, not strategic surfaces", () => {
    const got = resolveEntitlements({ planTier: "growth", overrides: {}, industry: null });
    expect(got).toContain("report.segment");
    expect(got).toContain("report.projections_forecasting");
    expect(got).not.toContain("report.governance");
    expect(got).not.toContain("report.projections_modelling");
  });

  it("strategic adds governance, recommendations, roadmap, modelling", () => {
    const got = resolveEntitlements({ planTier: "strategic", overrides: {}, industry: null });
    for (const key of [
      "report.governance",
      "report.recommendations",
      "report.roadmap",
      "report.projections_modelling",
    ]) {
      expect(got).toContain(key);
    }
  });

  it("enterprise grants every tier-gated key", () => {
    const got = resolveEntitlements({ planTier: "enterprise", overrides: {}, industry: null });
    for (const key of TIER_KEYS) expect(got).toContain(key);
  });

  it("tiers never grant a non-matching add-on", () => {
    const got = resolveEntitlements({ planTier: "enterprise", overrides: {}, industry: null });
    expect(got).not.toContain("report.inventory");
  });
});

describe("resolveEntitlements — jsonb overrides", () => {
  it("explicit false revokes under the combined package", () => {
    const got = resolveEntitlements({
      planTier: "trial",
      overrides: { "report.segment": false },
      industry: "Manufacturing",
    });
    expect(got).not.toContain("report.segment");
  });

  it("explicit true grants an add-on regardless of industry", () => {
    const got = resolveEntitlements({
      planTier: "essential",
      overrides: { "report.inventory": true },
      industry: null,
    });
    expect(got).toContain("report.inventory");
  });

  it("unknown keys and non-boolean values are ignored", () => {
    const got = resolveEntitlements({
      planTier: "essential",
      overrides: { bogus: true, "report.pnl": "off" },
      industry: null,
    });
    expect(got).toContain("report.pnl");
  });

  it("malformed overrides (array/string/null) never throw", () => {
    for (const overrides of [null, "corrupt", [1, 2], 42]) {
      expect(() =>
        resolveEntitlements({ planTier: "trial", overrides, industry: null }),
      ).not.toThrow();
    }
  });
});

describe("entitlementRequirement", () => {
  it("names the gating tier", () =>
    expect(entitlementRequirement("report.segment")).toBe(
      "Segment (unit-wise) reporting is part of the Growth package.",
    ));
  it("names the add-on industry", () =>
    expect(entitlementRequirement("report.inventory")).toBe(
      "Inventory & production is an industry add-on for manufacturing businesses.",
    ));
});
