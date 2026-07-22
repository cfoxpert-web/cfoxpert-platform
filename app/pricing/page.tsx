import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CTABanner } from "@/components/layout/cta-banner";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Four ways to engage CFOxpert — from self-serve software at ₹3,000/month to a full board-level CFO function. Advice is never billed; only deliverables are.",
};

interface Tier {
  name: string;
  price: string;
  priceNote?: string;
  audience: string;
  description: string;
  cta: { label: string; href: string };
  emphasised?: boolean;
}

const TIERS: Tier[] = [
  {
    name: "CFOxpert Pulse",
    price: "₹3,000",
    priceNote: "/ month",
    audience: "Businesses ₹5–15 Cr turnover",
    description:
      "The software, self-serve. Your dashboard, your health score, your monthly numbers in one place. No advisory retainer.",
    cta: { label: "Start with a Health Check", href: "/health-check" },
  },
  {
    name: "Enterprise Value Diagnostic",
    price: "₹40,000",
    priceNote: "one-time",
    audience: "Any size",
    description:
      "A full assessment across all six Enterprise Value Drivers, a real health score, and a clear statement of what to fix first. Credited in full against your first three months if you go on to a retainer.",
    cta: { label: "Book a Diagnostic", href: "/contact" },
  },
  {
    name: "CFO Core",
    price: "₹60,000",
    priceNote: "/ month",
    audience: "Businesses ₹15–60 Cr turnover",
    description:
      "One package, one price. Monthly board-grade reporting across P&L, balance sheet, ratios, health score, cost structure and segment performance — plus ongoing CFO advisory. No tiers, no upsells.",
    cta: { label: "Book a Conversation", href: "/contact" },
    emphasised: true,
  },
  {
    name: "CFO Enterprise",
    price: "from ₹1,75,000",
    priceNote: "/ month",
    audience: "Businesses ₹60 Cr+",
    description:
      "Scoped to the business. Multi-entity, multi-location, and board-level engagement.",
    cta: { label: "Talk to us", href: "/contact" },
  },
];

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
              Pricing
            </p>
            <h1 className="max-w-3xl font-display text-display-md font-medium text-navy">
              Four ways to engage. One way to{" "}
              <em className="text-teal not-italic">start.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate">
              Published prices, no hourly billing, and a diagnostic that pays for
              itself if you go on to a retainer.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section spacing="compact">
        <Container>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 0.06} className="h-full">
                <div
                  className={cn(
                    "flex h-full flex-col rounded-card border p-7",
                    tier.emphasised
                      ? "border-white/8 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] text-white shadow-elevation-3"
                      : "border-line bg-paper"
                  )}
                >
                  <p
                    className={cn(
                      "text-eyebrow font-bold uppercase",
                      tier.emphasised ? "text-teal-bright" : "text-teal"
                    )}
                  >
                    {tier.name}
                  </p>
                  <p
                    className={cn(
                      "mt-2 font-display text-heading-md font-medium",
                      tier.emphasised ? "text-white" : "text-navy"
                    )}
                  >
                    {tier.price}
                    {tier.priceNote && (
                      <span
                        className={cn(
                          "ml-1.5 font-sans text-[13.5px] font-normal",
                          tier.emphasised ? "text-white/60" : "text-slate-light"
                        )}
                      >
                        {tier.priceNote}
                      </span>
                    )}
                  </p>
                  <p
                    className={cn(
                      "mt-2 text-[13px] font-semibold",
                      tier.emphasised ? "text-white/80" : "text-navy"
                    )}
                  >
                    {tier.audience}
                  </p>
                  <p
                    className={cn(
                      "mt-4 border-t pt-4 text-[14px]",
                      tier.emphasised ? "border-white/15 text-white/72" : "border-line text-slate"
                    )}
                  >
                    {tier.description}
                  </p>
                  <div className="mt-auto pt-6">
                    <Button
                      asChild
                      variant={tier.emphasised ? "onDark" : "secondary"}
                      className="w-full"
                    >
                      <Link href={tier.cta.href}>{tier.cta.label}</Link>
                    </Button>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container size="narrow">
          <Reveal>
            <SectionHeader
              eyebrow="How We Bill"
              heading="Advice is never billed. Only deliverables are."
              className="mb-6"
            />
            <p className="text-[17px] text-ink">
              You will never receive an invoice for a phone call, an email, or a
              conversation. If you want something new built — a specific model, an
              additional report, a one-off analysis — that&apos;s a defined
              deliverable at a published rate, agreed before we start.
            </p>

            {/*
              PLACEHOLDER — add-on rate card table goes here.
              The rates are not finalised yet. Replace this marked block with the
              published rate table when they are.
            */}
            <div className="mt-8 rounded-card border border-dashed border-line bg-mist p-8 text-center text-[13.5px] text-slate-light">
              [ADD-ON RATE CARD — TO BE ADDED]
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <p className="mx-auto mt-14 max-w-2xl text-center text-lg font-medium leading-relaxed text-navy">
              Every engagement starts the same way: an Enterprise Value Diagnostic.
              ₹40,000, credited against your retainer.
            </p>
          </Reveal>
        </Container>
      </Section>

      <CTABanner
        heading="Not sure where to start?"
        description="Start with a free Business Health Check — it tells you what your numbers say before any engagement is scoped."
      />
    </>
  );
}
