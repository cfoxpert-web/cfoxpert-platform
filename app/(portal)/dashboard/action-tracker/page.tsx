import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ActionTracker } from "@/components/dashboard/action-tracker";
import { MOCK_ACTION_ITEMS } from "@/lib/mock-data/dashboard";

export default function ActionTrackerPage() {
  return (
    <DashboardLayout title="Action Tracker">
      <div className="mx-auto max-w-2xl">
        <ActionTracker items={MOCK_ACTION_ITEMS} />
      </div>
    </DashboardLayout>
  );
}
