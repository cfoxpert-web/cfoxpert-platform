import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ActionTracker } from "@/components/dashboard/action-tracker";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MOCK_ACTION_ITEMS } from "@/lib/mock-data/dashboard";

export default function ActionTrackerPage() {
  const real = isFeatureEnabled("realDashboardData");
  return (
    <DashboardLayout title="Action Tracker">
      <div className="mx-auto max-w-2xl">
        {real ? (
          <ComingSoon feature="The action tracker" />
        ) : (
          <ActionTracker items={MOCK_ACTION_ITEMS} />
        )}
      </div>
    </DashboardLayout>
  );
}
