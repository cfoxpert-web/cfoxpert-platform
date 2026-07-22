import type { Metadata } from "next";
import { User } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeader } from "@/components/layout/section-header";
import { CTABanner } from "@/components/layout/cta-banner";
import { Reveal } from "@/components/animations/reveal";
import { ChallengeGrid } from "@/components/cards/challenge-grid";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why CFOxpert exists, why businesses stop scaling, and the operating philosophy behind the platform.",
};

const PILLARS = [
  { num: "01", title: "Systems over advice", description: "A recommendation that isn't built into a dashboard or a review cadence rarely survives contact with a busy quarter. We build the system, not just the slide." },
  { num: "02", title: "Cadence over one-off projects", description: "Enterprise value compounds through monthly discipline — reviews, tracked actions, updated numbers — not a single strategy engagement." },
  { num: "03", title: "Clarity over jargon", description: "Founders don't need to be finance experts to run a financially disciplined business. They need the truth, in plain language, on time." },
];

const OPERATING_MODEL = [
  { title: "Assess", description: "A deep-dive Business Health Assessment establishes an honest baseline across all six value drivers." },
  { title: "Design", description: "Dashboards, KPI ownership, and cash flow controls are built around your specific business — not a generic template." },
  { title: "Review", description: "Monthly board-style reviews turn data into decisions, with a live action tracker so nothing is decided twice." },
  { title: "Compound", description: "Each cycle builds on the last — the platform gets richer, the business gets less founder-dependent, value moves." },
];

const VISION = [
  { tag: "Today", title: "Virtual CFO Engagements", description: "Health checks, dashboards, and monthly reviews delivered by our team." },
  { tag: "Next", title: "AI-Assisted Insights", description: "Pattern detection that flags risks and opportunities before a human would." },
  { tag: "Next", title: "Self-Serve Client Portal", description: "Live access to your dashboards and board packs, any time, not just in meetings." },
  { tag: "Future", title: "A Benchmarked Platform", description: "Every client's Health Score benchmarked against peers — continuous, not annual." },
];

export default function AboutPage() {
  return (
    <>
      <Section spacing="compact" className="bg-[radial-gradient(1100px_480px_at_78%_-12%,#E8F2EF_0%,transparent_62%)] pt-24">
        <Container>
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 text-eyebrow font-bold uppercase text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Why We Exist
            </p>
            <h1 className="max-w-3xl font-display text-display-md font-medium text-navy">
              Most businesses don&apos;t fail from lack of ambition. They fail from lack of{" "}
              <em className="text-teal not-italic">systems.</em>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate">
              CFOxpert exists because growth and value aren&apos;t the same thing — and almost
              nobody is helping founder-led businesses build the second one deliberately.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container size="narrow">
          <Reveal>
            <h2 className="mb-5 font-display text-heading-lg font-medium text-navy">
              The problem we saw, repeatedly
            </h2>
            <p className="mb-5 text-lg font-medium text-navy">
              Across hundreds of hours inside founder-led businesses, the same pattern kept
              showing up — regardless of industry, size, or how talented the founder was.
            </p>
            <p className="mb-5 text-[17px] text-ink">
              A business would grow steadily for years. Revenue would climb, the team would
              expand, the founder would work harder than anyone else in the building. And then,
              somewhere between ₹40 and ₹100 crore, something would quietly stop compounding.
              Not the sales. The value.
            </p>
            <p className="text-[17px] text-ink">
              That gap — between advice and an operating system — is what CFOxpert was built to close.
            </p>
          </Reveal>
        </Container>
      </Section>

      <Section className="bg-navy-deep text-white">
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="What We See"
              eyebrowColor="gold"
              heading="Why growing businesses stop scaling"
              description="Six patterns we see again and again, independent of industry."
              align="center"
              className="mx-auto mb-12 max-w-xl [&_h2]:text-white [&_p]:text-white/60"
            />
            <div className="[&_.rounded-card]:border-white/10 [&_h3]:text-white [&_p]:text-white/65">
              <div className="rounded-card border border-white/10 bg-transparent">
                <ChallengeGrid />
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container size="narrow">
          <Reveal>
            <h2 className="mb-5 font-display text-heading-lg font-medium text-navy">
              Why enterprise value is the real scoreboard
            </h2>
            <p className="mb-5 text-[17px] text-ink">
              Revenue answers one question: is the business bigger than last year? Enterprise
              value answers the question that actually matters to a founder — is the business
              worth more, more resilient, and less dependent on any single person, including you?
            </p>
            <p className="text-[17px] text-ink">
              We treat enterprise value as the north star, not a side conversation for exit
              planning. Every dashboard, KPI, and monthly review we build is designed to move one
              of six underlying drivers.
            </p>
          </Reveal>
        </Container>
      </Section>

      {/* Founder section — placeholder structure and layout. Swap the image
          placeholder for a real photo and replace the marked bio paragraphs;
          no layout changes should be needed. */}
      <Section>
        <Container size="narrow">
          <Reveal>
            <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-[280px_1fr] md:gap-14">
              <div className="flex aspect-[4/5] items-center justify-center rounded-card border border-line bg-mist">
                <User className="h-16 w-16 text-slate-light" />
              </div>
              <div>
                <p className="mb-4 inline-flex items-center gap-2 text-eyebrow font-bold uppercase text-teal">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                  The Founder
                </p>
                <h2 className="mb-5 font-display text-heading-lg font-medium text-navy">
                  [FOUNDER NAME]
                </h2>
                <p className="mb-5 text-[17px] text-ink">[FOUNDER BIO — TO BE ADDED]</p>
                <p className="text-[17px] text-ink">[FOUNDER BIO — TO BE ADDED]</p>
              </div>
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Our Philosophy"
              heading="Three commitments that shape how we work"
              align="center"
              className="mx-auto mb-10 max-w-xl"
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {PILLARS.map((p) => (
                <div key={p.num} className="rounded-card border border-line p-7">
                  <div className="mb-3.5 font-display text-[13px] font-bold text-gold">{p.num}</div>
                  <h3 className="mb-2.5 text-[16px] font-semibold text-navy">{p.title}</h3>
                  <p className="text-[13.5px] text-slate">{p.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container size="narrow">
          <Reveal>
            <h2 className="mb-6 font-display text-heading-lg font-medium text-navy">
              How we actually work
            </h2>
            <div className="flex flex-col">
              {OPERATING_MODEL.map((step, i) => (
                <div key={step.title} className="flex gap-5 border-t border-line py-6 first:border-t-0 first:pt-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-light font-display text-sm font-bold text-teal">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="mb-1.5 text-[15.5px] font-semibold text-navy">{step.title}</h4>
                    <p className="text-sm text-slate">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              eyebrow="Where This Is Headed"
              eyebrowColor="gold"
              heading="Consulting funds the platform today"
              description="Here's what we're building toward."
              align="center"
              className="mx-auto mb-10 max-w-xl"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VISION.map((v) => (
                <div key={v.title} className="rounded-sm border border-line p-5">
                  <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-teal">{v.tag}</div>
                  <h4 className="mb-1.5 text-[14px] font-semibold text-navy">{v.title}</h4>
                  <p className="text-[12.5px] text-slate">{v.description}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      <CTABanner
        heading="See where your business stands today."
        description="Start with a free Business Health Check — no cost, no obligation, just clarity."
      />
    </>
  );
}
