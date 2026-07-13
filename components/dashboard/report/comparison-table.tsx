import { Card } from "@/components/cards/card";
import { cn } from "@/lib/utils";

/**
 * Amendment A3 — the report tabs' shared comparison table. Presentational
 * only: rows arrive fully formatted; all math happened in the KPI engine /
 * ratios layer.
 */

export type MovementTone = "good" | "bad" | "flat";

export type ComparisonRow = {
  label: string;
  current: string;
  prior: string;
  movement?: { symbol: string; label: string; tone: MovementTone } | null;
  /** indented percentage/detail row (e.g. "Gross Profit %") */
  sub?: boolean;
  /** total/result rows (Revenue, Net Profit) */
  emphasis?: boolean;
};

const toneClass: Record<MovementTone, string> = {
  good: "text-teal",
  bad: "text-coral",
  flat: "text-slate-light",
};

export function ComparisonTable({
  title,
  subtitle,
  currentLabel,
  priorLabel,
  rows,
}: {
  title: string;
  subtitle?: string;
  currentLabel: string;
  priorLabel: string | null;
  rows: ComparisonRow[];
}) {
  return (
    <Card className="p-6">
      <h3 className="font-display text-[17px] text-navy">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12px] text-slate">{subtitle}</p>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-slate">
              <th className="py-2 pr-4 font-semibold">Particulars</th>
              <th className="py-2 pr-4 text-right font-semibold">{currentLabel}</th>
              <th className="py-2 pr-4 text-right font-semibold">{priorLabel ?? "Prior"}</th>
              <th className="py-2 text-right font-semibold">Movement</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.label}-${i}`}
                className={cn(
                  "border-b border-line/60",
                  row.emphasis && "bg-mist/50",
                )}
              >
                <td
                  className={cn(
                    "py-2.5 pr-4",
                    row.sub ? "pl-4 text-[12px] text-slate" : "text-slate",
                    row.emphasis && "font-semibold text-navy",
                  )}
                >
                  {row.label}
                </td>
                <td
                  className={cn(
                    "py-2.5 pr-4 text-right tabular-nums",
                    row.sub ? "text-[12px] text-slate" : "text-navy",
                    row.emphasis && "font-semibold",
                  )}
                >
                  {row.current}
                </td>
                <td
                  className={cn(
                    "py-2.5 pr-4 text-right tabular-nums",
                    row.sub ? "text-[12px] text-slate" : "text-slate",
                  )}
                >
                  {row.prior}
                </td>
                <td className="py-2.5 text-right">
                  {row.movement ? (
                    <span
                      className={cn(
                        "text-[12px] font-semibold tabular-nums",
                        toneClass[row.movement.tone],
                      )}
                    >
                      {row.movement.symbol} {row.movement.label}
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-light">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
