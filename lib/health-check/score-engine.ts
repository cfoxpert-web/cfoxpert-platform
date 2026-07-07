import { ENTERPRISE_VALUE_DRIVERS, type DriverKey } from "@/constants/drivers";
import { HEALTH_CHECK_QUESTIONS } from "@/constants/health-check-questions";
import type { DriverScore, HealthCheckResult } from "@/types";

export type AnswerMap = Record<string, number>; // question key -> score (0-100)

/**
 * Capital & Valuation has no question of its own. Valuation isn't something
 * a founder can self-report — it's a function of everything else, weighted
 * with company scale. This mirrors the reasoning documented in the original
 * Health Check build: 75% average of the other five driver scores, 25% the
 * revenue-benchmark answer.
 */
function computeCapitalScore(driverScoresByKey: Record<DriverKey, number>, revenueScore: number): number {
  const others: DriverKey[] = ["financial", "operational", "growth", "governance", "technology"];
  const avgOthers = others.reduce((sum, key) => sum + driverScoresByKey[key], 0) / others.length;
  return Math.round(avgOthers * 0.75 + revenueScore * 0.25);
}

export function computeDriverScores(answers: AnswerMap): DriverScore[] {
  const revenueQuestion = HEALTH_CHECK_QUESTIONS.find((q) => q.key === "revenue");
  const revenueScore = revenueQuestion ? answers[revenueQuestion.key] ?? 50 : 50;

  const scoresByKey = {} as Record<DriverKey, number>;
  for (const question of HEALTH_CHECK_QUESTIONS) {
    if (question.driverKey) {
      scoresByKey[question.driverKey] = answers[question.key] ?? 50;
    }
  }

  return ENTERPRISE_VALUE_DRIVERS.map((driver) => {
    const score =
      driver.key === "capital"
        ? computeCapitalScore(scoresByKey, revenueScore)
        : Math.round(scoresByKey[driver.key] ?? 50);
    return { key: driver.key, score, weight: driver.defaultWeight };
  });
}

export function computeOverallScore(driverScores: DriverScore[]): number {
  return Math.round(driverScores.reduce((sum, d) => sum + d.score * d.weight, 0));
}

export function gradeFromScore(score: number): HealthCheckResult["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "A-";
  if (score >= 55) return "B";
  if (score >= 40) return "C";
  return "D";
}

export function computeHealthCheckResult(answers: AnswerMap): HealthCheckResult {
  const driverScores = computeDriverScores(answers);
  const overallScore = computeOverallScore(driverScores);
  return {
    overallScore,
    grade: gradeFromScore(overallScore),
    driverScores,
    completedAt: new Date().toISOString(),
  };
}
