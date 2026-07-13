/**
 * Amendment A3 — financial ratios, computed at read time (pure).
 *
 * Ratios are NEVER stored as kpi_values (standing rule: single computation
 * path, no duplicated math). This module derives them from the statement-line
 * primitives the KPI engine already evaluated. Every ratio returns null when
 * an input is missing — the UI renders "—", never a fabricated number.
 *
 * Stock/flow correctness: day-based ratios (DSO/DIO/DPO) scale by the actual
 * period length, so a quarter uses ~91 days, not 365. Pure flow-vs-stock
 * ratios that would mislead on short periods (borrowings/revenue) annualize
 * the flow side and say so in their label.
 */

export type RatioInputs = {
  /** statement-line values keyed by kpi_definitions.key */
  values: Partial<Record<string, number>>;
  /** inclusive period length in days (drives DSO/DIO/DPO) */
  periodDays: number | null;
};

export type ComputedRatio = {
  key: string;
  label: string;
  unit: "%" | "days" | "x";
  value: number | null;
  higherIsBetter: boolean;
};

/** Inclusive day count between two ISO dates ('YYYY-MM-DD'); null-safe. */
export function periodDaysBetween(
  start: string | null | undefined,
  end: string | null | undefined,
): number | null {
  if (!start || !end) return null;
  const s = Date.UTC(
    Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)),
  );
  const e = Date.UTC(
    Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)),
  );
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return null;
  return Math.round((e - s) / 86_400_000) + 1;
}

const div = (a: number | undefined, b: number | undefined | null): number | null =>
  a === undefined || b === undefined || b === null || b === 0 ? null : a / b;

export function computeRatios(inputs: RatioInputs): ComputedRatio[] {
  const v = inputs.values;
  const days = inputs.periodDays;

  const revenue = v.revenue;
  const gp = v.gross_profit;
  // COGS on the report's basis: revenue less gross profit.
  const cogs =
    revenue !== undefined && gp !== undefined ? revenue - gp : undefined;
  const borrowings =
    v.secured_borrowings !== undefined || v.unsecured_borrowings !== undefined
      ? (v.secured_borrowings ?? 0) + (v.unsecured_borrowings ?? 0)
      : undefined;
  // Annualized revenue for stock-vs-flow ratios on sub-annual periods.
  const annualRevenue =
    revenue !== undefined && days !== null && days > 0
      ? (revenue * 365) / days
      : undefined;

  const pct = (x: number | null): number | null => (x === null ? null : x * 100);
  const dayScale = (x: number | null): number | null =>
    x === null || days === null ? null : x * days;

  const dso = dayScale(div(v.trade_receivables, revenue));
  const dio = dayScale(div(v.inventory, cogs));
  const dpo = dayScale(div(v.trade_payables, cogs));

  return [
    { key: "gp_margin", label: "Gross Profit Margin", unit: "%", higherIsBetter: true,
      value: pct(div(gp, revenue)) },
    { key: "np_margin", label: "Net Profit Margin", unit: "%", higherIsBetter: true,
      value: pct(div(v.net_profit, revenue)) },
    { key: "dso", label: "Debtor Days (DSO)", unit: "days", higherIsBetter: false,
      value: dso },
    { key: "dio", label: "Inventory Days (DIO)", unit: "days", higherIsBetter: false,
      value: dio },
    { key: "dpo", label: "Creditor Days (DPO)", unit: "days", higherIsBetter: true,
      value: dpo },
    { key: "ccc", label: "Cash Conversion Cycle", unit: "days", higherIsBetter: false,
      value: dso !== null && dio !== null && dpo !== null ? dso + dio - dpo : null },
    { key: "borrowings_to_revenue", label: "Borrowings / Revenue (annualized)", unit: "x",
      higherIsBetter: false, value: div(borrowings, annualRevenue) },
  ];
}
