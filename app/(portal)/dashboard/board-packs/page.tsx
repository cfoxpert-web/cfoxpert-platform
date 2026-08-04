import { FileText } from "lucide-react";
import { Card } from "@/components/cards/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { BoardPackWidget } from "@/components/dashboard/board-pack-widget";
import { ComingSoon } from "@/components/dashboard/coming-soon";
import { getCurrentUserOrganization } from "@/lib/dashboard/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getClientReports } from "@/lib/reports/queries";
import { MOCK_BOARD_PACKS } from "@/lib/mock-data/dashboard";

/**
 * Real path: published board reports (client_reports), served byte-for-byte
 * by /dashboard/reports/[id]. No reports yet → honest coming-soon. Mock
 * mode keeps the illustrative widget.
 */
export default async function BoardPacksPage() {
  const real = isFeatureEnabled("realDashboardData");
  const org = real ? await getCurrentUserOrganization() : null;
  const reports = org ? await getClientReports(org.id) : [];

  return (
    <DashboardLayout title="Board Packs" companyName={org?.name}>
      <div className="mx-auto max-w-2xl">
        {!real ? (
          <BoardPackWidget packs={MOCK_BOARD_PACKS} />
        ) : reports.length === 0 ? (
          <ComingSoon feature="Board pack delivery" />
        ) : (
          <Card className="p-6">
            <h3 className="mb-4 font-display text-[16px] text-navy">
              Board reports
            </h3>
            <div className="flex flex-col gap-3">
              {reports.map((report) => (
                <a
                  key={report.id}
                  href={`/dashboard/reports/${report.id}`}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-3 rounded-sm border border-line px-4 py-3 transition-colors hover:border-teal"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-mist text-slate">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink group-hover:text-navy">
                      {report.title}
                    </span>
                    <span className="block text-[11px] text-slate-light">
                      {report.periodLabel ?? ""}
                      {report.periodLabel ? " · " : ""}
                      Published{" "}
                      {new Date(report.publishedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-teal">
                    Open →
                  </span>
                </a>
              ))}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
