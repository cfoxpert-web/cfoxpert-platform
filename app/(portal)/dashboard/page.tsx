import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CommandCenter } from "@/components/dashboard/command-center";
import { getCurrentUserOrganization } from "@/lib/dashboard/data";

/** Collapse a possibly-repeated query param to its first value. */
const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [org, params] = await Promise.all([
    getCurrentUserOrganization(),
    searchParams,
  ]);

  return (
    <DashboardLayout title="CEO Command Center" companyName={org?.name}>
      <CommandCenter
        period={first(params.period)}
        compare={first(params.compare)}
        comparePeriod={first(params.comparePeriod)}
      />
    </DashboardLayout>
  );
}
