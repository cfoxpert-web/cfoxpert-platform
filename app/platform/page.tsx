import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CTABanner } from "@/components/layout/cta-banner";
import { Reveal } from "@/components/animations/reveal";
import { Button } from "@/components/ui/button";
import { ModuleShowcase } from "@/components/platform/module-showcase";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "One operating system for every number that matters — CEO Command Center, Business Health Score, Board Packs, Action Tracker, and more.",
};

const ROADMAP_ITEMS = [
  { tag: "In Progress", title: "AI Insights Engine", description: "Automated anomaly detection and monthly recommendations, no analyst required." },
  { tag: "Planned", title: "ERP Integrations", description: "Direct sync with Tally, Zoho Books, and SAP Business One." },
  { tag: "Planned", title: "Industry Benchmarking", description: "Compare your Health Score against peers in your sector and revenue band." },
  { tag: "Exploring", title: "Mobile App", description: "Your CEO Command Center, in your pocket, with push alerts on key metrics." },
];

const SYSTEM_FLOW = ["Your Business Data", "CFOxpert Platform", "Monthly Board Review", "Enterprise Value ↑"];

export default function PlatformPage() {
  return (
    <>
      <Section
        spacing="compact"
        className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%),radial-gradient(900px_420px_at_5%_110%,#EEF1FB_0%,transparent_60%)] pt-24 text-center"
      >
        <Container>
          <Reveal>
            <p className="mb-5 inline-flex items-center justify-center gap-2 text-eyebrow font-bold uppercase text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              The Platform
            </p>
            <h1 className="mx-auto max-w-3xl font-display text-display-lg font-medium text-navy">
              One operating system for every number that{" "}
              <em className="text-teal not-italic">matters.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate">
              CFOxpert isn&apos;t a set of services. It&apos;s a single connected
              platform that turns your business into a system you can see,
              measure, and improve every month.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/health-check">Book Free Business Health Check</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="#modules">Explore Modules ↓</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section id="modules">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Inside the Platform"
              eyebrowColor="gold"
              heading="Eight modules. One system of record."
              description="Select a module to see how it works."
              align="center"
              className="mx-auto mb-14 max-w-xl"
            />
          </Reveal>
          <Reveal delay={0.1}>
            <ModuleShowcase />
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {SYSTEM_FLOW.map((node, i) => (
                <div key={node} className="flex items-center gap-3">
                  <div className="min-w-[150px] rounded-sm border border-line bg-white px-5 py-4 text-center text-[13.5px] font-semibold text-navy shadow-elevation-1">
                    {node}
                  </div>
                  {i < SYSTEM_FLOW.length - 1 && (
                    <span className="text-lg text-slate-light">→</span>
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <div className="rounded-card-lg bg-navy-deep p-10 text-white sm:p-14">
              <SectionHeader
                eyebrow="What's Next"
                eyebrowColor="gold"
                heading="Built to grow into a full platform."
                description="The modules above are live today. Here's what's being built next."
                align="center"
                className="mx-auto mb-9 max-w-xl [&_h2]:text-white [&_p]:text-white/60"
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ROADMAP_ITEMS.map((item) => (
                  <div key={item.title} className="rounded-sm border border-white/10 bg-white/6 p-5">
                    <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-wider text-teal-bright">
                      {item.tag}
                    </div>
                    <h4 className="mb-2 text-[15px] font-semibold">{item.title}</h4>
                    <p className="text-[12.5px] text-white/60">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <CTABanner
        heading="See the platform on your own numbers."
        description="Start with a free Business Health Check — no cost, no obligation, just clarity."
      />
    </>
  );
}
