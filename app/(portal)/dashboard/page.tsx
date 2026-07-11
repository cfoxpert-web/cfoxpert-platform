import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CommandCenter } from "@/components/dashboard/command-center";
import { getCurrentUserOrganization } from "@/lib/dashboard/data";

export default async function DashboardPage() {
  const org = await getCurrentUserOrganization();

  return (
    <DashboardLayout title="CEO Command Center" companyName={org?.name}>
      <CommandCenter />
    </DashboardLayout>
  );
}
