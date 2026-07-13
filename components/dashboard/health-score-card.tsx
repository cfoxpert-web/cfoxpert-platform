import Link from "next/link";
import { Card } from "@/components/cards/card";
import { ScoreRing } from "@/components/health-score/score-ring";

interface HealthScoreCardProps {
  /** null = no score computable yet (real-data path, honest empty state) */
  score: number | null;
  grade: string | null;
  /** where the full breakdown lives; defaults to the public health check */
  breakdownHref?: string;
}

/**
 * This is the payoff of building ScoreRing generic back in Phase 3 — same
 * component, same props shape, zero duplication, just a dark card wrapper.
 * A2: score may be null (not yet computable) — shown honestly, never faked.
 */
export function HealthScoreCard({ score, grade, breakdownHref = "/health-check" }: HealthScoreCardProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 border-0 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-6 text-center text-white">
      {score !== null && grade !== null ? (
        <ScoreRing score={score} size={104} strokeWidth={9} label={`Grade ${grade}`} />
      ) : (
        <div className="flex h-[104px] flex-col items-center justify-center">
          <span className="font-display text-[22px] text-white/80">—</span>
          <span className="mt-1 text-[11.5px] text-white/60">Not yet assessed</span>
        </div>
      )}
      <div>
        <h3 className="mb-1 font-display text-[15px]">Business Health Score</h3>
        <Link href={breakdownHref} className="text-[12.5px] text-teal-bright hover:underline">
          View full breakdown →
        </Link>
      </div>
    </Card>
  );
}
