"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, RotateCcw } from "lucide-react";
import { processIngestionJob } from "@/lib/documents/actions";
import type { IngestionStage } from "@/lib/documents/model";

/**
 * A4-b — the minimal staff-only extraction trigger (NOT the A4-c review
 * queue: it fires processing only, shows no numbers, decides nothing
 * about publish). On a 'received' job the click is the approve-to-process
 * decision, recorded against the real analyst.
 */
export function ProcessButton({
  jobId,
  stage,
}: {
  jobId: string;
  stage: IngestionStage;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label =
    stage === "received"
      ? "Approve & process"
      : stage === "failed"
        ? "Retry"
        : "Process";
  const Icon = stage === "failed" ? RotateCcw : Play;

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await processIngestionJob(jobId);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  };

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-[12px] font-semibold text-navy transition-colors hover:border-teal hover:text-teal disabled:opacity-50"
      >
        <Icon className="h-3 w-3" />
        {pending ? "Processing…" : label}
      </button>
      {error && (
        <span className="max-w-[240px] text-right text-[11px] text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
