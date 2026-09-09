"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react";
import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";
import { setJobUnitBasis } from "@/lib/documents/scope-actions";
import { UNIT_BASES, type UnitBasisName } from "@/lib/ingestion/workbook";

/**
 * Amendment A4-d-3 — the unit basis control.
 *
 * ITS OWN COMPONENT, deliberately, because it is not part of sheet scope.
 * Scope is three things — sheet, periods, unit — and only the first fails
 * to apply to a CSV. This one applies to every spreadsheet-family upload,
 * so it renders beside the scope picker for a workbook AND on its own for
 * a CSV that has no sheets to pick between.
 *
 * It is the highest-consequence field in the whole ingestion path. Every
 * other mistake makes one line wrong and something downstream notices.
 * Rupees-versus-lakhs is a 100,000× error that passes every check we
 * have — the statement still balances, every ratio still reconciles — and
 * only surfaces when a person reads the number. So it is always visible,
 * always overridable, and always shows the evidence it was judged on.
 */

const UNIT_LABELS: Record<UnitBasisName, string> = {
  rupees: "Rupees",
  thousands: "Thousands (₹ '000)",
  lakhs: "Lakhs (₹ in lakhs)",
  crores: "Crores (₹ in crores)",
};

export function UnitBasisControl({
  jobId,
  basis,
  detectedFrom,
  largestPrintedValue,
  readOnly,
}: {
  jobId: string;
  basis: UnitBasisName;
  detectedFrom: string | null;
  largestPrintedValue: number | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState<UnitBasisName>(basis);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = (next: UnitBasisName) => {
    if (next === value) return;
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      const result = await setJobUnitBasis(jobId, next);
      if (result.ok) router.refresh();
      else {
        setValue(previous);
        setError(result.error);
      }
    });
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 shrink-0 text-slate-light" />
          <h4 className="text-[13px] font-semibold text-navy">Figures are in</h4>
        </div>

        {readOnly ? (
          <span className="text-[13px] font-medium text-ink">
            {UNIT_LABELS[value]}
          </span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {UNIT_BASES.map((option) => (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() => change(option)}
                className={cn(
                  "rounded-pill border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50",
                  option === value
                    ? "border-navy bg-navy text-white"
                    : "border-line text-slate hover:border-slate-light",
                )}
              >
                {UNIT_LABELS[option]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* The evidence, permanently — not a warning that appears on failure. */}
      <p className="mt-2.5 text-[12px] leading-relaxed text-slate">
        {detectedFrom ?? "Not yet determined."}
        {largestPrintedValue !== null && (
          <>
            {" · largest figure in the source "}
            <span className="font-semibold tabular-nums text-ink">
              {largestPrintedValue.toLocaleString("en-IN")}
            </span>
          </>
        )}
      </p>
      {!readOnly && (
        <p className="mt-1 text-[12px] text-slate-light">
          Changing this re-reads the document. Everything is stored in rupees;
          this only says what the source was printed in.
        </p>
      )}
      {pending && (
        <p className="mt-2 text-[12px] text-slate-light">Re-reading…</p>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </Card>
  );
}
