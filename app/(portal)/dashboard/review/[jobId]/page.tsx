import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { GateResults } from "@/components/dashboard/review/gate-results";
import { ReviewForm } from "@/components/dashboard/review/review-form";
import { DOCUMENT_KINDS, stageLabel } from "@/lib/documents/model";
import { isInternalStaff } from "@/lib/documents/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getReviewJobDetail } from "@/lib/review/queries";

/**
 * Amendment A4-c — the review screen for one job: gate results up top
 * (never hidden — ADR-010), staged lines with mapping controls, target
 * period, and the publish/reject verbs.
 */

export const dynamic = "force-dynamic";

export default async function ReviewJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const staff = isFeatureEnabled("docIngestion") && (await isInternalStaff());
  const detail = staff ? await getReviewJobDetail(jobId) : null;

  if (!detail) {
    return (
      <DashboardLayout title="Review">
        <div className="mx-auto max-w-2xl">
          <Card className="p-10 text-center">
            <p className="text-[14px] text-slate">
              {staff ? "Job not found." : "This area is for CFOxpert analysts."}
            </p>
            <Link
              href="/dashboard/review"
              className="mt-3 inline-block text-[12.5px] font-semibold text-teal hover:underline"
            >
              Back to the queue
            </Link>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const kindLabel =
    DOCUMENT_KINDS.find((k) => k.key === detail.document.kind)?.label ?? "Other";

  return (
    <DashboardLayout title="Review" companyName={detail.organizationName}>
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="font-display text-[16px] text-navy">
                {detail.document.fileName}
              </h3>
              <p className="mt-1 text-[12.5px] text-slate-light">
                {detail.organizationName} · {kindLabel}
                {detail.document.periodHint
                  ? ` · period hint: ${detail.document.periodHint}`
                  : ""}
                {` · status: ${stageLabel(detail.stage)}`}
              </p>
              {detail.stageNote && (
                <p className="mt-1 text-[12.5px] text-slate">{detail.stageNote}</p>
              )}
            </div>
            <Link
              href="/dashboard/review"
              className="text-[12.5px] font-semibold text-teal hover:underline"
            >
              ← Queue
            </Link>
          </div>
        </Card>

        <GateResults results={detail.validation} />

        <ReviewForm
          jobId={detail.jobId}
          stage={detail.stage}
          lines={detail.lines}
          catalogue={detail.catalogue}
          periods={detail.periods}
          periodHint={detail.document.periodHint}
        />
      </div>
    </DashboardLayout>
  );
}
