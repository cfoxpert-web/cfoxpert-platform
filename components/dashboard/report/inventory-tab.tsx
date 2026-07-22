import { Card } from "@/components/cards/card";
import { getMonthlySeries } from "@/lib/kpi/queries";
import { formatInrTable } from "@/lib/dashboard/map-kpis";

/**
 * Amendment A3 — Inventory tab, v1: monthly inventory positions across
 * consolidated + units. Sparse months and basis differences are surfaced,
 * not smoothed over — the recorded provenance notes render as footnotes.
 */
export async function InventoryTab({ organizationId }: { organizationId: string }) {
  const series = await getMonthlySeries(organizationId, "inventory");

  if (series.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-[14px] text-slate">No monthly inventory data recorded.</p>
        <p className="mt-1 text-[12.5px] text-slate-light">
          Monthly positions appear here once stock statements are entered.
        </p>
      </Card>
    );
  }

  // period -> (column -> value); column null = consolidated.
  const GROUP = "Consolidated";
  const columns: string[] = [GROUP];
  const byPeriod = new Map<string, Map<string, number>>();
  const periodOrder: string[] = [];
  const notes = new Set<string>();

  for (const point of series) {
    const column = point.segment ?? GROUP;
    if (!columns.includes(column)) columns.push(column);
    if (!byPeriod.has(point.periodLabel)) periodOrder.push(point.periodLabel);
    const inner = byPeriod.get(point.periodLabel) ?? new Map<string, number>();
    inner.set(column, point.value);
    byPeriod.set(point.periodLabel, inner);
    if (point.note) notes.add(point.note);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="font-display text-[17px] text-navy">Inventory Position — Monthly</h3>
        <p className="mt-0.5 text-[12px] text-slate">
          Recorded month-end positions. Missing cells mean no figure was recorded
          for that unit/month — never interpolated.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wide text-slate">
                <th className="py-2 pr-4 font-semibold">Month</th>
                {columns.map((column) => (
                  <th key={column} className="py-2 pr-4 text-right font-semibold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periodOrder.map((label) => {
                const values = byPeriod.get(label);
                return (
                  <tr key={label} className="border-b border-line/60">
                    <td className="py-2.5 pr-4 text-slate">{label}</td>
                    {columns.map((column) => {
                      const value = values?.get(column);
                      return (
                        <td key={column} className="py-2.5 pr-4 text-right tabular-nums text-navy">
                          {value !== undefined ? formatInrTable(value) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {notes.size > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate">
              Recording basis
            </p>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-4">
              {[...notes].map((note) => (
                <li key={note} className="text-[12px] text-slate-light">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}
