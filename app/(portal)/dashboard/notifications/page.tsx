import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/dashboard";

export default function NotificationsPage() {
  const real = isFeatureEnabled("realDashboardData");
  return (
    <DashboardLayout title="Notifications">
      <div className="mx-auto max-w-2xl">
        {real ? (
          <ComingSoon feature="Notifications" />
        ) : (
          <NotificationsPanel items={MOCK_NOTIFICATIONS} />
        )}
      </div>
    </DashboardLayout>
  );
}
