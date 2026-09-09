"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileWarning, RotateCw } from "lucide-react";
import { Card } from "@/components/cards/card";
import { retryIntrospection } from "@/lib/documents/scope-actions";

/**
 * Amendment A4-d-3 — the state an operator meets when introspection failed.
 *
 * Introspection runs in `after()`, which can time out on a large workbook,
 * hit a memory ceiling, or meet a malformed file. When it does, the job has
 * no scope data — and before this, the picker rendered empty on a job that
 * looked stalled with nothing to click. That is the "looks broken, no
 * explanation" failure this whole milestone exists to remove, reappearing
 * one level up.
 *
 * So: say what happened, in the reason's own words, and offer the retry.
 * The bytes are already in storage, so re-running costs nothing but time.
 */
export function ScopeUnreadable({
  jobId,
  warnings,
}: {
  jobId: string;
  warnings: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const retry = () => {
    setError(null);
    startTransition(async () => {
      const result = await retryIntrospection(jobId);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  };

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <h3 className="font-display text-[16px] text-navy">
            This document could not be read
          </h3>
          <p className="mt-1 text-[12.5px] text-slate">
            Nothing has been staged and nothing has been published. The file is
            stored safely — reading it again is the usual fix when the first
            attempt timed out.
          </p>

          {warnings.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 border-l-2 border-line pl-3">
              {warnings.map((w) => (
                <li key={w} className="text-[12.5px] leading-relaxed text-slate">
                  {w}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={retry}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <RotateCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              {pending ? "Reading again…" : "Read the document again"}
            </button>
            <span className="text-[12px] text-slate-light">
              If it fails a second time, ask the client to re-export it as
              .xlsx or .csv.
            </span>
          </div>

          {error && <p className="mt-3 text-[12.5px] text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  );
}
