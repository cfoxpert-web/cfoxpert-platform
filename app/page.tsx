import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CTABanner } from "@/components/layout/cta-banner";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { DashboardCard } from "@/components/cards/dashboard-card";
import { MetricTile } from "@/components/cards/metric-tile";
import { ChallengeGrid } from "@/components/cards/challenge-grid";
import { EnterpriseValueEngine } from "@/components/health-score/enterprise-value-engine";

const TRUST_ITEMS = [
  "15-minute diagnostic",
  "No cost, no obligation",
  "Trusted by manufacturers & exporters",
];

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <Section
        spacing="compact"
        className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%),radial-gradient(900px_420px_at_5%_110%,#EEF1FB_0%,transparent_60%)] pt-24"
      >
        <Container>
          <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <Reveal>
              <p className="mb-5 inline-flex items-center gap-2 text-eyebrow font-bold uppercase text-teal">
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                Business Performance Platform
              </p>
              <h1 className="max-w-xl font-display text-display-lg font-medium text-navy">
                Build a business that doesn&apos;t depend on{" "}
                <em className="text-teal not-italic">you.</em>
              </h1>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-slate">
                Financial intelligence, performance systems, and governance —
                built into one integrated platform for founder-led companies
                between ₹20Cr and ₹250Cr.
              </p>
              <div className="mt-9 flex flex-wrap gap-4">
                <Button asChild size="lg">
                  <Link href="/health-check">Book Free Business Health Check</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/platform">Explore Platform →</Link>
                </Button>
              </div>
              <ul className="mt-11 flex flex-wrap gap-7 text-[13px] text-slate-light">
                {TRUST_ITEMS.map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <DashboardCard title="CEO Command Center">
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile
                    wide
                    label="Business Health Score"
                    value="82"
                    delta={{ direction: "up", label: "Improved 6 pts this quarter" }}
                  />
                  <MetricTile label="EBITDA Margin" value="18.6%" delta={{ direction: "up", label: "2.4%" }} />
                  <MetricTile label="Cash Cycle" value="32 days" delta={{ direction: "up", label: "8 days faster" }} />
                  <MetricTile label="Working Capital" value="₹4.1Cr" delta={{ direction: "down", label: "optimizing" }} />
                  <MetricTile label="Actions Closed" value="11/14" delta={{ direction: "up", label: "On track" }} />
                </div>
              </DashboardCard>
            </Reveal>
          </div>
        </Container>
      </Section>

      {/* ===== CHALLENGES ===== */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="The Problem"
              heading="Revenue is growing. Value isn't."
              description="Most founder-led companies scale revenue for years without becoming more valuable — because nothing underneath the top line is being engineered."
              className="mb-12"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <ChallengeGrid />
          </Reveal>
        </Container>
      </Section>

      {/* ===== ENTERPRISE VALUE ENGINE ===== */}
      <Section className="bg-navy-deep text-white">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Our Framework"
              eyebrowColor="gold"
              heading="The Enterprise Value Engine"
              description="Every dashboard, KPI, and monthly review we build is designed to move one of six drivers. This is the operating logic behind the platform."
              className="mb-14 [&_h2]:text-white [&_p]:text-white/60"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <EnterpriseValueEngine variant="dark" />
          </Reveal>
        </Container>
      </Section>

      <CTABanner
        heading="We build valuable businesses."
        description="Start with a free Business Health Check — no cost, no obligation, just clarity."
      />
    </>
  );
}
