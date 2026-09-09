import Link from "next/link";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { GateResults } from "@/components/dashboard/review/gate-results";
import { ReviewForm } from "@/components/dashboard/review/review-form";
import { ScopePicker } from "@/components/dashboard/review/scope-picker";
import { ScopeUnreadable } from "@/components/dashboard/review/scope-unreadable";
import { UnitBasisControl } from "@/components/dashboard/review/unit-basis-control";
import { DOCUMENT_KINDS, stageLabel } from "@/lib/documents/model";
import { isInternalStaff } from "@/lib/documents/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getReviewJobDetail } from "@/lib/review/queries";
import { isUnitBasisName } from "@/lib/ingestion/workbook";

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

  // Show the picker when the job is parked for a scope decision, and also
  // whenever a readable workbook has no resolved scope — a job that stalled
  // mid-flow should offer the way forward, not an empty line table.
  const needsScope =
    detail.stage === "awaiting_scope" ||
    (detail.scope === null &&
      detail.lines.length === 0 &&
      detail.scopeOptions.some((o) => o.plausible));

  // Introspection ran and could not read the workbook. Without this the
  // operator meets an empty picker on a job that looks stalled, with
  // nothing to click — the failure mode this milestone exists to remove.
  const unreadable =
    detail.stage === "awaiting_scope" &&
    detail.scopeOptions.length === 0 &&
    detail.scopeWarnings.some((w) => w.startsWith("Could not read this workbook"));

  // Unit basis is not part of sheet scope: it applies to CSVs too.
  const isSpreadsheet =
    detail.mimeType !== "application/pdf" && detail.mimeType !== "";
  const unitBasis = isUnitBasisName(detail.unitBasis) ? detail.unitBasis : "rupees";

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

        {/*
          A4-d-2: a job whose scope is unresolved gets the picker, not the
          staged-lines form — there are no staged lines yet, and there will
          not be until someone says which sheet and which columns to read.
        */}
        {isSpreadsheet && !unreadable && (
          <UnitBasisControl
            jobId={detail.jobId}
            basis={unitBasis}
            detectedFrom={detail.unitEvidence?.detectedFrom ?? null}
            largestPrintedValue={detail.unitEvidence?.largestPrintedValue ?? null}
            readOnly={detail.stage === "published" || detail.stage === "rejected"}
          />
        )}

        {unreadable ? (
          <ScopeUnreadable jobId={detail.jobId} warnings={detail.scopeWarnings} />
        ) : needsScope ? (
          <ScopePicker
            jobId={detail.jobId}
            options={detail.scopeOptions}
            warnings={detail.scopeWarnings}
            autoScope={detail.scope}
          />
        ) : (
          <>
            <GateResults results={detail.validation} />

            <ReviewForm
              jobId={detail.jobId}
              stage={detail.stage}
              lines={detail.lines}
              catalogue={detail.catalogue}
              periods={detail.periods}
              periodHint={detail.document.periodHint}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
