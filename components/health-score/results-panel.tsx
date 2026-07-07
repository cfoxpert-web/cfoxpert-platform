import Link from "next/link";
import { Card } from "@/components/cards/card";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/health-score/score-ring";
import { DriverBarChart } from "@/components/charts/driver-bar-chart";
import { HEALTH_CHECK_OPPORTUNITIES, HEALTH_CHECK_ROADMAP } from "@/constants/health-check-content";
import type { HealthCheckResult } from "@/types";

interface ResultsPanelProps {
  result: HealthCheckResult;
  firstName: string;
}

export function ResultsPanel({ result, firstName }: ResultsPanelProps) {
  const investorReady = result.overallScore >= 70;

  return (
    <Card className="p-8 sm:p-10">
      <div className="mb-9 text-center">
        <p className="mb-3 text-eyebrow font-bold uppercase text-teal">Your Results</p>
        <h2 className="font-display text-heading-lg font-medium text-navy">
          {firstName}, here&apos;s where your business stands today.
        </h2>
      </div>

      {/* Score hero */}
      <div className="mb-7 flex flex-wrap items-center gap-9 rounded-card bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-9 text-white">
        <ScoreRing score={result.overallScore} size={120} />
        <div>
          <div className="mb-1.5 font-display text-xl font-medium">
            Business Health Score: {result.overallScore}/100
          </div>
          <p className="max-w-sm text-[14.5px] text-white/70">
            Your business shows real strengths, but value is being held back
            by a small number of specific, fixable gaps — detailed below.
          </p>
          <span className="mt-3 inline-block rounded-pill border border-white/20 bg-white/10 px-3.5 py-1.5 text-[12.5px] font-semibold">
            Grade {result.grade} · {investorReady ? "Investor Ready path" : "Building toward Investor Ready"}
          </span>
        </div>
      </div>

      {/* Driver breakdown */}
      <div className="mb-8">
        <DriverBarChart driverScores={result.driverScores} />
      </div>

      {/* Opportunities */}
      <div className="mb-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        {HEALTH_CHECK_OPPORTUNITIES.map((opp) => (
          <div key={opp.title} className="rounded-sm bg-mist p-5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-coral">{opp.tag}</div>
            <h4 className="mb-1.5 text-[15px] font-semibold text-navy">{opp.title}</h4>
            <p className="text-[13px] text-slate">{opp.description}</p>
          </div>
        ))}
      </div>

      {/* Roadmap */}
      <div className="mb-8 rounded-sm border border-line p-6">
        <h4 className="mb-4 font-display text-[17px] text-navy">Your 90-day roadmap preview</h4>
        {HEALTH_CHECK_ROADMAP.map((step, i) => (
          <div key={step.title} className="flex gap-3.5 border-t border-line py-2.5 first:border-t-0 first:pt-0">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light text-[12px] font-bold text-teal">
              {i + 1}
            </div>
            <div>
              <b className="text-[14.5px] text-navy">{step.title}</b>
              <p className="text-[13.5px] text-slate">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Final CTA */}
      <div className="rounded-card border border-[#D6EEE6] bg-teal-light p-8 text-center">
        <h3 className="mb-2 font-display text-xl text-navy">Discuss your results with a Virtual CFO</h3>
        <p className="mb-5 text-sm text-slate">
          30-minute strategy session — walk through your score and roadmap in detail.
        </p>
        <Button asChild size="lg">
          <Link href="/contact">Book Your Strategy Session →</Link>
        </Button>
      </div>
    </Card>
  );
}
