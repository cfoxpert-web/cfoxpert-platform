import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import { stageLabel } from "@/lib/documents/model";
import { isInternalStaff } from "@/lib/documents/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getReviewQueue } from "@/lib/review/queries";

/**
 * Amendment A4-c — the analyst review queue: every open ingestion job
 * across every client org. The platform's first internal-staff surface.
 * Not in the client sidebar; reached from the Documents page (staff see
 * a link) or directly. Non-staff get an honest empty state via RLS.
 */

export const dynamic = "force-dynamic";

function stageBadge(stage: string): string {
  switch (stage) {
    case "needs_review":
      return "bg-teal-light text-teal";
    case "failed":
      return "bg-red-50 text-red-600";
    default:
      return "bg-mist text-slate";
  }
}

export default async function ReviewQueuePage() {
  const staff = isFeatureEnabled("docIngestion") && (await isInternalStaff());

  if (!staff) {
    return (
      <DashboardLayout title="Review Queue">
        <div className="mx-auto max-w-2xl">
          <Card className="p-10 text-center">
            <p className="text-[14px] text-slate">
              This area is for CFOxpert analysts.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const queue = await getReviewQueue();

  return (
    <DashboardLayout title="Review Queue">
      <div className="mx-auto max-w-3xl">
        <Card className="p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="mb-1 font-display text-[16px] text-navy">
              Ingestion review queue
            </h3>
            <Link
              href="/dashboard/leads"
              className="text-[12px] font-semibold text-teal hover:underline"
            >
              Leads →
            </Link>
          </div>
          <p className="mb-4 text-[12.5px] text-slate-light">
            Every open document job across all clients. Jobs awaiting review
            carry staged numbers — nothing reaches a report until you publish
            it.
          </p>

          {queue.length === 0 ? (
            <p className="text-[13px] text-slate">Queue is empty. All caught up.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {queue.map((item) => (
                <div key={item.jobId} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {item.organizationName} · {item.fileName}
                    </div>
                    <div className="truncate text-[11px] text-slate-light">
                      {item.stageNote ?? "—"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
                      stageBadge(item.stage),
                    )}
                  >
                    {stageLabel(item.stage)}
                  </span>
                  {item.stage === "needs_review" && (
                    <Link
                      href={`/dashboard/review/${item.jobId}`}
                      className="shrink-0 rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:border-teal hover:text-teal"
                    >
                      Review
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
