import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { DocumentsWidget } from "@/components/dashboard/documents-widget";
import { DocumentUploadForm } from "@/components/dashboard/documents/upload-form";
import { DocumentList } from "@/components/dashboard/documents/document-list";
import { getCurrentUserOrganization } from "@/lib/dashboard/data";
import { getClientDocuments, isInternalStaff } from "@/lib/documents/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { MOCK_DOCUMENTS } from "@/lib/mock-data/dashboard";

/**
 * Amendment A4-a: on the real path this page becomes the upload surface +
 * pipeline status list. Flag off (default) keeps the mock byte-identical.
 * A4-b: staff additionally see the Process/Retry trigger per job; this
 * page's server actions run extraction, hence the raised maxDuration.
 */
export const maxDuration = 60;

export default async function DocumentsPage() {
  const real = isFeatureEnabled("docIngestion");
  const org = real ? await getCurrentUserOrganization() : null;

  if (!real || !org) {
    return (
      <DashboardLayout title="Documents">
        <div className="mx-auto max-w-2xl">
          <DocumentsWidget items={MOCK_DOCUMENTS} />
        </div>
      </DashboardLayout>
    );
  }

  const [documents, staff] = await Promise.all([
    getClientDocuments(org.id),
    isInternalStaff(),
  ]);

  return (
    <DashboardLayout title="Documents" companyName={org.name}>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <DocumentUploadForm />
        <DocumentList items={documents} isStaff={staff} />
      </div>
    </DashboardLayout>
  );
}
