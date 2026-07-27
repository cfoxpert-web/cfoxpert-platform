import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BoardPackWidget } from "@/components/dashboard/board-pack-widget";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MOCK_BOARD_PACKS } from "@/lib/mock-data/dashboard";

export default function BoardPacksPage() {
  const real = isFeatureEnabled("realDashboardData");
  return (
    <DashboardLayout title="Board Packs">
      <div className="mx-auto max-w-2xl">
        {real ? (
          <ComingSoon feature="Board pack delivery" />
        ) : (
          <BoardPackWidget packs={MOCK_BOARD_PACKS} />
        )}
      </div>
    </DashboardLayout>
  );
}
