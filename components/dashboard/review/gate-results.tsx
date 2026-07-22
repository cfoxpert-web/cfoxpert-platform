import { AlertTriangle, CheckCircle2, MinusCircle } from "lucide-react";
import { Card } from "@/components/cards/card";
import type { GateResult } from "@/lib/ingestion/types";

/**
 * A4-c — validation gate results, always visible above the lines
 * (ADR-010: a failed gate flags the job; the analyst must see it before
 * publishing, and a 'skipped' gate says WHY it couldn't check).
 */

const GATE_LABELS: Record<string, string> = {
  tb_balance: "Trial balance: debits = credits",
  stated_total: "Line items vs stated total",
  bs_equation: "Balance sheet equation",
  pnl_consistency: "P&L level ordering",
  period_dates: "Period dates",
};

export function GateResults({ results }: { results: GateResult[] }) {
  if (results.length === 0) return null;
  const failures = results.filter((r) => r.status === "fail").length;

  return (
    <Card className="p-6">
      <h3 className="mb-1 font-display text-[16px] text-navy">
        Validation checks
      </h3>
      <p className="mb-4 text-[12.5px] text-slate-light">
        {failures > 0
          ? `${failures} check(s) FAILED — verify against the source document before publishing.`
          : "Automatic consistency checks on the staged numbers."}
      </p>
      <div className="flex flex-col gap-2.5">
        {results.map((r) => (
          <div key={r.gate} className="flex items-start gap-2.5">
            {r.status === "pass" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
            ) : r.status === "fail" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            ) : (
              <MinusCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-light" />
            )}
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-ink">
                {GATE_LABELS[r.gate] ?? r.gate}
              </span>
              <span className="ml-2 text-[12.5px] text-slate">{r.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
