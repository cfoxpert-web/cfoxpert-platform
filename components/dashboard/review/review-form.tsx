"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Send, XCircle } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import type { IngestionStage } from "@/lib/documents/model";
import {
  publishIngestionJob,
  rejectIngestionJob,
  type PublishInput,
} from "@/lib/review/actions";
import type { ReviewLine } from "@/lib/review/queries";

/**
 * A4-c — the analyst's working surface. Selection, mapping and period
 * choices live only in this form until Publish: the click is the
 * decision (ADR-010), and it also confirms each chosen label→KPI mapping
 * into the client's mapping memory.
 */

type LineState = { include: boolean; kpiKey: string; segment: string };

const PERIOD_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function guessPeriodType(start: string | null, end: string | null): string {
  if (!start || !end) return "yearly";
  const days =
    (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  if (Number.isNaN(days)) return "yearly";
  if (days <= 35) return "monthly";
  if (days <= 100) return "quarterly";
  return "yearly";
}

function formatAmount(v: number | null): string {
  if (v === null) return "—";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const inputClass =
  "rounded-input border border-line bg-paper px-2 py-1.5 text-[12.5px] text-ink";

export function ReviewForm({
  jobId,
  stage,
  lines,
  catalogue,
  periods,
  periodHint,
}: {
  jobId: string;
  stage: IngestionStage;
  lines: ReviewLine[];
  catalogue: { key: string; label: string }[];
  periods: { id: string; label: string; type: string }[];
  periodHint: string | null;
}) {
  const router = useRouter();
  const readOnly = stage !== "needs_review";

  const extracted = useMemo(
    () => lines.find((l) => l.periodLabel || l.periodStart) ?? null,
    [lines],
  );
  const matchedPeriod = useMemo(() => {
    const label = extracted?.periodLabel ?? periodHint;
    return label ? periods.find((p) => p.label === label) : undefined;
  }, [extracted, periodHint, periods]);

  const [lineState, setLineState] = useState<Record<string, LineState>>(() => {
    const initial: Record<string, LineState> = {};
    for (const l of lines) {
      initial[l.id] = {
        include: l.proposedKpiKey !== null && l.amount !== null,
        kpiKey: l.proposedKpiKey ?? "",
        segment: l.segment ?? "",
      };
    }
    return initial;
  });
  const [periodChoice, setPeriodChoice] = useState<string>(
    matchedPeriod ? matchedPeriod.id : "new",
  );
  const [newPeriod, setNewPeriod] = useState(() => ({
    label: extracted?.periodLabel ?? periodHint ?? "",
    type: guessPeriodType(extracted?.periodStart ?? null, extracted?.periodEnd ?? null),
    start: extracted?.periodStart ?? "",
    end: extracted?.periodEnd ?? "",
  }));
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const EMPTY: LineState = { include: false, kpiKey: "", segment: "" };
  const st = (id: string): LineState => lineState[id] ?? EMPTY;
  const patch = (id: string, p: Partial<LineState>) =>
    setLineState((s) => ({ ...s, [id]: { ...(s[id] ?? EMPTY), ...p } }));

  const includedCount = lines.filter((l) => st(l.id).include).length;

  const publish = () => {
    setError(null);
    const selected: PublishInput["lines"] = [];
    for (const l of lines) {
      const s = st(l.id);
      if (!s.include) continue;
      if (s.kpiKey === "") {
        setError(`"${l.sourceLabel}" is selected but has no KPI assigned — pick one or deselect it.`);
        return;
      }
      selected.push({
        lineId: l.id,
        kpiKey: s.kpiKey,
        segment: s.segment.trim() === "" ? null : s.segment.trim(),
      });
    }
    if (selected.length === 0) {
      setError("Select at least one line to publish.");
      return;
    }

    const period: PublishInput["period"] =
      periodChoice === "new"
        ? {
            mode: "new",
            label: newPeriod.label,
            periodType: newPeriod.type,
            periodStart: newPeriod.start,
            periodEnd: newPeriod.end,
          }
        : { mode: "existing", periodId: periodChoice };

    startTransition(async () => {
      const result = await publishIngestionJob({ jobId, period, lines: selected });
      if (result.ok) {
        setDone(`Published ${result.published} value(s). The client's report reads them immediately.`);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const reject = () => {
    setError(null);
    startTransition(async () => {
      const result = await rejectIngestionJob(jobId, rejectReason);
      if (result.ok) {
        setDone("Job rejected. The client sees the status; the reason is in the job history.");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  if (done) {
    return (
      <Card className="p-8 text-center">
        <CheckCircle2 className="mx-auto h-6 w-6 text-teal" />
        <p className="mt-3 text-[14px] text-slate">{done}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="mb-1 font-display text-[16px] text-navy">Staged lines</h3>
      <p className="mb-4 text-[12.5px] text-slate-light">
        {readOnly
          ? "This job is closed — lines shown for reference."
          : "Tick the lines to publish, assign each a KPI, and confirm the period. Publishing also remembers every label→KPI choice for this client's future uploads."}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-light">
              {!readOnly && <th className="py-2 pr-2" />}
              <th className="py-2 pr-4">Source line</th>
              <th className="py-2 pr-4 text-right">Amount (₹)</th>
              <th className="py-2 pr-4">KPI</th>
              <th className="py-2 pr-4">Segment</th>
              <th className="py-2">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const s = st(l.id);
              return (
                <tr
                  key={l.id}
                  className={cn(
                    "border-b border-line/60",
                    !readOnly && !s.include && "opacity-50",
                  )}
                >
                  {!readOnly && (
                    <td className="py-2 pr-2 align-top">
                      <input
                        type="checkbox"
                        checked={s.include}
                        disabled={l.amount === null}
                        onChange={(e) => patch(l.id, { include: e.target.checked })}
                      />
                    </td>
                  )}
                  <td className="max-w-[260px] py-2 pr-4 align-top">
                    <div className="truncate text-[13px] font-medium text-ink">
                      {l.sourceLabel}
                    </div>
                    <div className="text-[11px] text-slate-light">
                      {l.statement}
                      {l.provenance ? ` · ${l.provenance}` : ""}
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-right align-top text-[13px] tabular-nums text-ink">
                    {formatAmount(l.amount)}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {readOnly ? (
                      <span className="text-[12.5px] text-slate">
                        {l.proposedKpiKey ?? "—"}
                      </span>
                    ) : (
                      <select
                        value={s.kpiKey}
                        onChange={(e) => patch(l.id, { kpiKey: e.target.value })}
                        className={inputClass}
                      >
                        <option value="">— not mapped —</option>
                        {catalogue.map((k) => (
                          <option key={k.key} value={k.key}>
                            {k.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    {readOnly ? (
                      <span className="text-[12.5px] text-slate">
                        {l.segment ?? "—"}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={s.segment}
                        placeholder="—"
                        onChange={(e) => patch(l.id, { segment: e.target.value })}
                        className={cn(inputClass, "w-28")}
                      />
                    )}
                  </td>
                  <td className="py-2 align-top text-[12.5px] text-slate">
                    {l.confidence === null ? "—" : `${Math.round(l.confidence * 100)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <>
          <div className="mt-6 border-t border-line pt-5">
            <h4 className="mb-2 text-[13px] font-semibold text-navy">
              Publish to period
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                Period
                <select
                  value={periodChoice}
                  onChange={(e) => setPeriodChoice(e.target.value)}
                  className={inputClass}
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.type})
                    </option>
                  ))}
                  <option value="new">＋ New period…</option>
                </select>
              </label>

              {periodChoice === "new" && (
                <>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                    Label
                    <input
                      type="text"
                      value={newPeriod.label}
                      placeholder="e.g. FY27 or Jul 2026"
                      onChange={(e) =>
                        setNewPeriod((p) => ({ ...p, label: e.target.value }))
                      }
                      className={cn(inputClass, "w-36")}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                    Type
                    <select
                      value={newPeriod.type}
                      onChange={(e) =>
                        setNewPeriod((p) => ({ ...p, type: e.target.value }))
                      }
                      className={inputClass}
                    >
                      {PERIOD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                    Start
                    <input
                      type="date"
                      value={newPeriod.start}
                      onChange={(e) =>
                        setNewPeriod((p) => ({ ...p, start: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                    End
                    <input
                      type="date"
                      value={newPeriod.end}
                      onChange={(e) =>
                        setNewPeriod((p) => ({ ...p, end: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {error && <p className="mt-4 text-[12.5px] text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={publish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {pending ? "Working…" : `Publish ${includedCount} line(s)`}
            </button>
            <span className="text-[12px] text-slate-light">
              Publishing writes these values to the client&apos;s report —
              corrections later are new rows, never edits.
            </span>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h4 className="mb-2 text-[13px] font-semibold text-navy">
              Or reject this upload
            </h4>
            <div className="flex flex-wrap items-end gap-3">
              <input
                type="text"
                value={rejectReason}
                placeholder="Reason (kept in the job history)"
                onChange={(e) => setRejectReason(e.target.value)}
                className={cn(inputClass, "w-80")}
              />
              <button
                onClick={reject}
                disabled={pending || rejectReason.trim() === ""}
                className="inline-flex items-center gap-2 rounded-pill border border-red-200 px-4 py-2 text-[12.5px] font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
