import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CommandCenter } from "@/components/dashboard/command-center";

export default function DashboardPage() {
  return (
    <DashboardLayout title="CEO Command Center">
      <CommandCenter />
    </DashboardLayout>
  );
}
