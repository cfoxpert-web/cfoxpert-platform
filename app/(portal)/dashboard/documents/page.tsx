import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DocumentsWidget } from "@/components/dashboard/documents-widget";
import { MOCK_DOCUMENTS } from "@/lib/mock-data/dashboard";

export default function DocumentsPage() {
  return (
    <DashboardLayout title="Documents">
      <div className="mx-auto max-w-2xl">
        <DocumentsWidget items={MOCK_DOCUMENTS} />
      </div>
    </DashboardLayout>
  );
}
