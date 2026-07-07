import Link from "next/link";
import { Card } from "@/components/cards/card";
import { ScoreRing } from "@/components/health-score/score-ring";

interface HealthScoreCardProps {
  score: number;
  grade: string;
}

/**
 * This is the payoff of building ScoreRing generic back in Phase 3 — same
 * component, same props shape, zero duplication, just a dark card wrapper.
 */
export function HealthScoreCard({ score, grade }: HealthScoreCardProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 border-0 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-6 text-center text-white">
      <ScoreRing score={score} size={104} strokeWidth={9} label={`Grade ${grade}`} />
      <div>
        <h3 className="mb-1 font-display text-[15px]">Business Health Score</h3>
        <Link href="/health-check" className="text-[12.5px] text-teal-bright hover:underline">
          View full breakdown →
        </Link>
      </div>
    </Card>
  );
}
