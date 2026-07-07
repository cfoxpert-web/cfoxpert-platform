import { computeHealthCheckResult } from "@/lib/health-check/score-engine";

// Reuses the real scoring engine from Phase 3 with example answers, rather
// than hardcoding a result object — if the scoring model changes, this
// portal preview stays consistent with it automatically.
export const MOCK_PORTAL_HEALTH_RESULT = computeHealthCheckResult({
  dependency: 70,
  cashcycle: 65,
  reporting: 95,
  governance: 77,
  growth: 65,
  revenue: 80,
});
