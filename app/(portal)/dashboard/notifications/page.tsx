import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { MOCK_NOTIFICATIONS } from "@/lib/mock-data/dashboard";

export default function NotificationsPage() {
  return (
    <DashboardLayout title="Notifications">
      <div className="mx-auto max-w-2xl">
        <NotificationsPanel items={MOCK_NOTIFICATIONS} />
      </div>
    </DashboardLayout>
  );
}
