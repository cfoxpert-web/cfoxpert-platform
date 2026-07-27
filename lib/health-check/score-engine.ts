import { ENTERPRISE_VALUE_DRIVERS, type DriverKey } from "@/constants/drivers";
import { HEALTH_CHECK_QUESTIONS } from "@/constants/health-check-questions";
import type { DriverScore, HealthCheckResult } from "@/types";

export type AnswerMap = Record<string, number>; // question key -> score (0-100)

/**
 * Capital & Valuation has no driver question of its own. Valuation isn't
 * something a founder can self-report — it's a function of everything else,
 * weighted with company scale. Original rule: 75% average of the other five
 * driver scores, 25% the revenue-benchmark answer.
 *
 * Questionnaire v2 (2026-07-27) added the ONE part of this driver a founder
 * CAN self-report: diligence readiness ("three years of clean financials
 * tomorrow?"). When that answer exists the blend becomes 55/20/25
 * (others/revenue/diligence); older answer maps without it keep the exact
 * original 75/25 — backward compatible with every persisted submission.
 */
function computeCapitalScore(
  driverScoresByKey: Record<DriverKey, number>,
  revenueScore: number,
  diligenceScore?: number,
): number {
  const others: DriverKey[] = ["financial", "operational", "growth", "governance", "technology"];
  const avgOthers = others.reduce((sum, key) => sum + driverScoresByKey[key], 0) / others.length;
  if (diligenceScore === undefined) {
    return Math.round(avgOthers * 0.75 + revenueScore * 0.25);
  }
  return Math.round(avgOthers * 0.55 + revenueScore * 0.2 + diligenceScore * 0.25);
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
        ? computeCapitalScore(scoresByKey, revenueScore, answers["diligence"])
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
