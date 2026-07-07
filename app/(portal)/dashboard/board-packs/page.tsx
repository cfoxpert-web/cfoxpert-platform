import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BoardPackWidget } from "@/components/dashboard/board-pack-widget";
import { MOCK_BOARD_PACKS } from "@/lib/mock-data/dashboard";

export default function BoardPacksPage() {
  return (
    <DashboardLayout title="Board Packs">
      <div className="mx-auto max-w-2xl">
        <BoardPackWidget packs={MOCK_BOARD_PACKS} />
      </div>
    </DashboardLayout>
  );
}
