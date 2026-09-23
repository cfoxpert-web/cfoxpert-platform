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
import { PROJECTION_HEADS } from "@/lib/ingestion/head-classify";

/** Operator-facing names for the projection heads. */
const HEAD_LABELS: Record<string, string> = {
  revenue: "Revenue",
  cogs: "Cost of Goods Sold",
  stockChange: "Stock Movement",
  directExp: "Direct Expenses",
  adminExp: "Indirect / Admin",
  sellingExp: "Selling & Distribution",
  employee: "Employee Cost",
  interest: "Finance Cost",
  depreciation: "Depreciation",
  otherIncome: "Other Income",
  otherExp: "Other Expenses",
};

/**
 * A4-c — the analyst's working surface. Selection, mapping and period
 * choices live only in this form until Publish: the click is the
 * decision (ADR-010), and it also confirms each chosen label→KPI mapping
 * into the client's mapping memory.
 */

type LineState = { include: boolean; head: string; segment: string };

/** One target-period resolution per staged period. */
type PeriodState = {
  choice: string; // an existing kpi_period id, or "new"
  label: string;
  type: string;
  start: string;
  end: string;
};

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

  /**
   * One group per STAGED period. A two-column scope stages both years, and
   * publishing them into a single period merged FY 2025-26 into FY 2026-27
   * — into an insert-only table. Each group resolves its own target.
   */
  const groups = useMemo(() => {
    const byKey = new Map<string, { key: string; lines: ReviewLine[] }>();
    for (const l of lines) {
      const key = l.periodKey ?? "unknown";
      const g = byKey.get(key) ?? { key, lines: [] };
      g.lines.push(l);
      byKey.set(key, g);
    }
    return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [lines]);

  const [lineState, setLineState] = useState<Record<string, LineState>>(() => {
    const initial: Record<string, LineState> = {};
    for (const l of lines) {
      initial[l.id] = {
        // A7-a: every line with an amount publishes, including the
        // unclassified ones — a fact table that omits rows cannot be
        // reconciled to its source.
        include: l.amount !== null,
        head: l.proposedHead ?? "",
        segment: l.segment ?? "",
      };
    }
    return initial;
  });

  // Per-period resolution, seeded from what staging derived.
  const [periodState, setPeriodState] = useState<Record<string, PeriodState>>(() => {
    const initial: Record<string, PeriodState> = {};
    for (const l of lines) {
      const key = l.periodKey ?? "unknown";
      if (initial[key]) continue;
      const existing = l.periodLabel
        ? periods.find((p) => p.label === l.periodLabel)
        : undefined;
      initial[key] = {
        choice: existing ? existing.id : "new",
        label: l.periodLabel ?? periodHint ?? "",
        type: guessPeriodType(l.periodStart, l.periodEnd),
        start: l.periodStart ?? "",
        end: l.periodEnd ?? "",
      };
    }
    return initial;
  });

  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const EMPTY: LineState = { include: false, head: "", segment: "" };
  const ps = (key: string): PeriodState =>
    periodState[key] ?? { choice: "new", label: "", type: "yearly", start: "", end: "" };
  const patchPeriod = (key: string, p: Partial<PeriodState>) =>
    setPeriodState((s) => ({ ...s, [key]: { ...ps(key), ...p } }));
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
      // A head is NOT required: an unclassified line still publishes and is
      // counted in unclassified_value, so the figure never goes missing.
      selected.push({
        lineId: l.id,
        head: s.head === "" ? null : s.head,
        segment: s.segment.trim() === "" ? null : s.segment.trim(),
      });
    }
    if (selected.length === 0) {
      setError("Select at least one line to publish.");
      return;
    }

    const selectedKeys = new Set(
      lines.filter((l) => st(l.id).include).map((l) => l.periodKey ?? "unknown"),
    );
    const periodInputs: PublishInput["periods"] = [];
    for (const key of selectedKeys) {
      const p = ps(key);
      periodInputs.push(
        p.choice === "new"
          ? {
              periodKey: key,
              mode: "new",
              label: p.label,
              periodType: p.type,
              periodStart: p.start,
              periodEnd: p.end,
            }
          : { periodKey: key, mode: "existing", periodId: p.choice },
      );
    }

    // Catch the merge in the UI too, so the operator sees it before a
    // round trip. The server refuses it regardless — this is convenience,
    // never the control.
    const targets = periodInputs.map((p) =>
      p.mode === "existing" ? `id:${p.periodId}` : `new:${p.label.trim()}`,
    );
    if (new Set(targets).size !== targets.length) {
      setError(
        "Two staged periods are pointing at the same target period. Give each its own — published values are insert-only and cannot be unmerged.",
      );
      return;
    }

    startTransition(async () => {
      const result = await publishIngestionJob({
        jobId,
        periods: periodInputs,
        lines: selected,
      });
      if (result.ok) {
        const unclassified = result.unclassifiedTotal ?? 0;
        const where = (result.periods ?? [])
          .map((p) => `${p.label} (${p.lines} line${p.lines === 1 ? "" : "s"})`)
          .join(", ");
        setDone(
          `Published ${result.published} line(s) into ${where || "the chosen period"}. The client's report reads them immediately.` +
            (unclassified !== 0
              ? ` ₹${unclassified.toLocaleString("en-IN")} across ${result.unclassifiedCount} line(s) is still unclassified and is shown on the report as Unclassified Value — it is NOT in any margin or ratio.`
              : ""),
        );
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
          : `Grouped by period. Confirm each period's target, tick the lines to publish, and assign a head where one is missing. Publishing remembers every label→head choice for this client's future uploads.`}
      </p>

      {/*
        ONE BLOCK PER STAGED PERIOD. Previously a single table and a single
        period selector: a two-column scope staged both years, every label
        appeared twice distinguishable only by cell reference, and Publish
        wrote all of it into one period — merging FY 2025-26 into
        FY 2026-27 in an insert-only table.
      */}
      {groups.map((group) => {
        const first = group.lines[0];
        const p = ps(group.key);
        const included = group.lines.filter((l) => st(l.id).include).length;
        return (
          <div key={group.key} className="mt-6 border-t border-line pt-5 first:mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-display text-[15px] text-navy">
                {first?.periodLabel ?? group.key}
              </h4>
              <span className="text-[12px] text-slate-light">
                {group.lines.length} line{group.lines.length === 1 ? "" : "s"}
                {!readOnly && ` · ${included} selected`}
              </span>
            </div>
            {/* The derived period is a PROPOSAL. Show what it concluded and
                from what, exactly as the unit basis does, and let it be
                changed — 30.06.2026 is most likely a quarter, but in a
                working ledger it could be a cumulative position. */}
            <p className="mt-1 text-[12px] text-slate">
              Derived from column date{" "}
              <span className="tabular-nums font-semibold text-ink">
                {first?.periodKey
                  ? `${first.periodKey.slice(8, 10)}.${first.periodKey.slice(5, 7)}.${first.periodKey.slice(0, 4)}`
                  : "—"}
              </span>
              {first?.periodStart && first?.periodEnd
                ? ` · ${first.periodStart} to ${first.periodEnd}`
                : ""}
              . Change anything below if the document means something else.
            </p>

            {!readOnly && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                  Publish into
                  <select
                    value={p.choice}
                    onChange={(e) => patchPeriod(group.key, { choice: e.target.value })}
                    className={inputClass}
                  >
                    {periods.map((existing) => (
                      <option key={existing.id} value={existing.id}>
                        {existing.label} ({existing.type})
                      </option>
                    ))}
                    <option value="new">＋ New period…</option>
                  </select>
                </label>

                {p.choice === "new" && (
                  <>
                    <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                      Label
                      <input
                        type="text"
                        value={p.label}
                        placeholder="e.g. FY 2026-27"
                        onChange={(e) => patchPeriod(group.key, { label: e.target.value })}
                        className={cn(inputClass, "w-36")}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                      Type
                      <select
                        value={p.type}
                        onChange={(e) => patchPeriod(group.key, { type: e.target.value })}
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
                        value={p.start}
                        onChange={(e) => patchPeriod(group.key, { start: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-semibold text-slate">
                      End
                      <input
                        type="date"
                        value={p.end}
                        onChange={(e) => patchPeriod(group.key, { end: e.target.value })}
                        className={inputClass}
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="mt-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-light">
                {!readOnly && <th className="py-2 pr-2" />}
                <th className="py-2 pr-4">Source line</th>
                <th className="py-2 pr-4 text-right">Amount (₹)</th>
                <th className="py-2 pr-4">Head</th>
                <th className="py-2 pr-4">Segment</th>
                <th className="py-2">Mapping conf.</th>
              </tr>
            </thead>
            <tbody>
              {group.lines.map((l) => {
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
                      {/*
                        A4-d-3: the classifier's head, shown plainly. Without
                        it a correctly-classified line rendered as nothing but
                        "— not mapped —", which reads as a classifier that
                        failed rather than one waiting on the head→KPI
                        roll-up (A7-a). Same row, opposite impression.
                      */}
                      {l.proposedHead && s.head !== "" && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-pill bg-teal/10 px-2 py-0.5 text-[10.5px] font-semibold text-teal">
                          {l.proposedHead} · mapping pending
                        </div>
                      )}
                      {s.head === "" && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-pill bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700">
                          needs a decision
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right align-top text-[13px] tabular-nums text-ink">
                      {formatAmount(l.amount)}
                    </td>
                    {/*
                      A7-a: the operator confirms a HEAD, not a KPI. The
                      head → KPI rollup is versioned data (ADR-018), so a
                      per-line KPI choice would be a second, hand-made copy of
                      a map that already exists. The override still has to
                      survive though — a classifier default that cannot be
                      corrected is worse than a dropdown — so this stays a
                      control, and the correction is remembered for this
                      client's next upload (ADR-017).
                    */}
                    <td className="py-2 pr-4 align-top">
                      {readOnly ? (
                        <span className="text-[12.5px] text-slate">
                          {l.proposedHead ?? "—"}
                        </span>
                      ) : (
                        <select
                          value={s.head}
                          onChange={(e) => patch(l.id, { head: e.target.value })}
                          className={inputClass}
                        >
                          <option value="">— needs a head —</option>
                          {PROJECTION_HEADS.map((h) => (
                            <option key={h} value={h}>
                              {HEAD_LABELS[h]}
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
                    {/*
                      Mapping confidence ONLY. The old column rendered the
                      AMOUNT's confidence here, so every deterministically
                      parsed row showed "100%" next to "— not mapped —" — a
                      contradiction on its face. A line with no head assigned
                      has no mapping to be confident about, so it shows a dash.
                    */}
                    <td className="py-2 align-top text-[12.5px] text-slate">
                      {s.head === "" || l.mappingConfidence === null
                        ? "—"
                        : `${Math.round(l.mappingConfidence * 100)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
            </div>
          </div>
        );
      })}

      {!readOnly && (
        <>
          {error && <p className="mt-4 text-[12.5px] text-red-600">{error}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={publish}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-pill bg-navy px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {pending
              ? "Working…"
              : `Publish ${includedCount} line(s) into ${groups.length} period(s)`}
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
