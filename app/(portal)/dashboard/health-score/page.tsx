import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { ScoreRing } from "@/components/health-score/score-ring";
import { DriverBarChart } from "@/components/charts/driver-bar-chart";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MOCK_PORTAL_HEALTH_RESULT } from "@/lib/mock-data/health-score";

/**
 * On the real-data path this page must never show the mock 72/A- —
 * the REAL score (computed from the client's financials, A2) lives on
 * the dashboard's Health Score tab, so send the viewer there. The mock
 * render survives only in mock mode (flag off), byte-identical.
 */
export default function HealthScorePage() {
  if (isFeatureEnabled("realDashboardData")) {
    redirect("/dashboard?tab=health");
  }

  const result = MOCK_PORTAL_HEALTH_RESULT;

  return (
    <DashboardLayout title="Business Health Score">
      <div className="mx-auto max-w-3xl">
        <Card className="mb-6 flex flex-wrap items-center gap-8 border-0 bg-gradient-to-br from-navy-deep via-navy to-[#1B3B6B] p-8 text-white">
          <ScoreRing score={result.overallScore} size={120} />
          <div>
            <div className="mb-1 font-display text-xl font-medium">
              Score: {result.overallScore}/100 · Grade {result.grade}
            </div>
            <p className="max-w-sm text-[14px] text-white/70">
              Recalculated quarterly from your Business Health Check answers across all six
              Enterprise Value drivers.
            </p>
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-[16px] text-navy">Driver Breakdown</h3>
          <DriverBarChart driverScores={result.driverScores} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
