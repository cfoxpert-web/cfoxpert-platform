import type { Metadata } from "next";
import { Check, Factory } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { CTABanner } from "@/components/layout/cta-banner";
import { Reveal } from "@/components/animations/reveal";
import {
  ENTITLEMENTS,
  ENTITLEMENT_KEYS,
  PLAN_TIERS,
  TIER_INFO,
  entitlementTier,
  type PlanTier,
} from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Packages",
  description:
    "Four CFOxpert engagement tiers sized to your revenue — from the core monthly report to board-level governance and group structures.",
};

/**
 * Amendment A6 — the pricing page. Deliverables are rendered FROM the
 * entitlement taxonomy (lib/entitlements.ts), never retyped here: what a
 * tier claims to include and what the platform actually unlocks cannot
 * drift apart. Tiers show revenue bands, not price points — engagements
 * are priced on scope.
 */

const ownDeliverables = (tier: PlanTier) =>
  ENTITLEMENT_KEYS.filter((key) => entitlementTier(key) === tier).map(
    (key) => ENTITLEMENTS[key].label,
  );

/** Everything a tier includes beyond the previous one, for cumulative cards. */
const TIER_EXTRAS: Record<PlanTier, string[]> = {
  essential: ownDeliverables("essential"),
  growth: ownDeliverables("growth"),
  strategic: ownDeliverables("strategic"),
  // No entitlement key is enterprise-exclusive yet; the tier's substance is
  // scope (group/multi-entity structures per ADR-008), not extra tabs.
  enterprise: ["Group & multi-entity reporting structures", "Bespoke engagement scope"],
};

export default function PricingPage() {
  return (
    <>
      <Section
        spacing="compact"
        className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%)] pt-24"
      >
        <Container>
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 text-eyebrow font-bold uppercase text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Packages
            </p>
            <h1 className="max-w-3xl font-display text-display-md font-medium text-navy">
              One platform, sized to the{" "}
              <em className="text-teal not-italic">stage</em> your business is at.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate">
              Four engagement tiers, banded by revenue. Every client sees the full
              report — features outside your package stay visible, so you always
              know what the next stage looks like.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section spacing="compact">
        <Container>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {PLAN_TIERS.map((tier, i) => {
              const info = TIER_INFO[tier];
              return (
                <Reveal key={tier} delay={i * 0.06} className="h-full">
                  <div className="flex h-full flex-col rounded-card border border-line bg-paper p-7">
                    <p className="text-eyebrow font-bold uppercase text-teal">
                      {info.label}
                    </p>
                    <p className="mt-2 font-display text-heading-md font-medium text-navy">
                      {info.revenueBand}
                    </p>
                    <p className="mt-2 text-[14px] text-slate">{info.tagline}</p>
                    <ul className="mt-6 flex flex-col gap-2.5 border-t border-line pt-6">
                      {i > 0 && (
                        <li className="text-[13px] font-semibold text-navy">
                          Everything in {TIER_INFO[PLAN_TIERS[i - 1]].label}, plus:
                        </li>
                      )}
                      {TIER_EXTRAS[tier].map((label) => (
                        <li key={label} className="flex items-start gap-2 text-[13.5px] text-slate">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                          {label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.1}>
            <div className="mt-5 flex flex-col gap-4 rounded-card border border-line bg-mist p-7 sm:flex-row sm:items-start">
              <Factory className="h-5 w-5 shrink-0 text-teal" />
              <div>
                <p className="text-[14px] font-semibold text-navy">
                  Industry add-on: {ENTITLEMENTS["report.inventory"].label}
                </p>
                <p className="mt-1 max-w-2xl text-[13.5px] text-slate">
                  Stock, stores and production reporting for manufacturing
                  businesses — added to any tier, because it depends on what you
                  make, not how large you are.
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.14}>
            <p className="mt-8 max-w-2xl text-[13.5px] text-slate-light">
              Current client engagements run on a single combined package with
              every applicable feature enabled; these tiers describe how new
              engagements are scoped. Pricing is set per engagement — it depends
              on entity count, reporting cadence and data readiness.
            </p>
          </Reveal>
        </Container>
      </Section>

      <CTABanner
        heading="Not sure which stage you're at?"
        description="Start with a free Business Health Check — it tells you what your numbers say before any engagement is scoped."
      />
    </>
  );
}
