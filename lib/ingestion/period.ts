/**
 * Amendment A7-a-2 — deriving a reporting period from a column date (pure).
 *
 * A PROPOSAL, NEVER A FACT. A column headed 30.06.2026 is most likely the
 * quarter ending that date, but in a working ledger it could equally be a
 * cumulative position, a nine-month figure, or an as-on balance. So every
 * proposal carries `derivedFrom` — what it concluded and from what — and
 * every field is overridable on the review screen. Same treatment as the
 * unit basis: each inference in this pipeline shows its working.
 *
 * Indian fiscal year, April to March.
 */

export const PERIOD_TYPES = ["monthly", "quarterly", "yearly"] as const;
export type PeriodType = (typeof PERIOD_TYPES)[number];

export type PeriodProposal = {
  /**
   * The grouping key: the period's end date, which IS the column's own
   * canonical date. Deliberately not a new column — `extracted_lines`
   * already stores `period_end`, so staged lines group by it with no
   * schema change.
   */
  key: string;
  type: PeriodType;
  /** Inclusive ISO dates. */
  start: string;
  end: string;
  label: string;
  /** Operator-facing evidence, rendered beside the controls. */
  derivedFrom: string;
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const iso = (y: number, m: number, d: number): string =>
  `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Last day of a month, leap years included. */
function lastDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The April-starting fiscal year a date falls in. */
function fiscalYearStart(year: number, month: number): number {
  return month >= 4 ? year : year - 1;
}

/** "FY 2026-27" for a fiscal year starting April 2026. */
export function fiscalYearLabel(fyStart: number): string {
  return `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

const dmy = (isoDate: string): string =>
  `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.${isoDate.slice(0, 4)}`;

const spoken = (y: number, m: number, d: number): string =>
  `${d} ${MONTHS[m - 1] ?? "?"} ${y}`;

/**
 * Propose a period from a column's canonical date.
 *
 * 31 March resolves to the FULL YEAR rather than Q4. In an Indian P&L a
 * column headed 31.03.2027 is overwhelmingly the year then ending, and
 * proposing Q4 would be wrong far more often than right. An operator whose
 * file means Q4 changes the type — which is exactly why it is overridable.
 */
export function derivePeriod(canonicalDate: string): PeriodProposal {
  const y = Number(canonicalDate.slice(0, 4));
  const m = Number(canonicalDate.slice(5, 7));
  const d = Number(canonicalDate.slice(8, 10));
  const end = iso(y, m, d);
  const isMonthEnd = d === lastDay(y, m);

  // ---- Financial year end.
  if (m === 3 && d === 31) {
    const fyStart = y - 1;
    return {
      key: end,
      type: "yearly",
      start: iso(fyStart, 4, 1),
      end,
      label: fiscalYearLabel(fyStart),
      derivedFrom: `column date ${dmy(end)} — the financial year ending ${spoken(y, m, d)}`,
    };
  }

  // ---- Quarter end (Jun/Sep/Dec, on the last day of the month).
  const QUARTER_END_MONTHS: Record<number, { q: number; startMonth: number }> = {
    6: { q: 1, startMonth: 4 },
    9: { q: 2, startMonth: 7 },
    12: { q: 3, startMonth: 10 },
  };
  const quarter = QUARTER_END_MONTHS[m];
  if (quarter && isMonthEnd) {
    const fyStart = fiscalYearStart(y, m);
    return {
      key: end,
      type: "quarterly",
      start: iso(y, quarter.startMonth, 1),
      end,
      label: `Q${quarter.q} ${fiscalYearLabel(fyStart)}`,
      derivedFrom: `column date ${dmy(end)} — the quarter ending ${spoken(y, m, d)}`,
    };
  }

  // ---- Anything else: treat as the month it ends in.
  return {
    key: end,
    type: "monthly",
    start: iso(y, m, 1),
    end,
    label: `${MONTHS[m - 1] ?? "?"} ${y}`,
    derivedFrom: isMonthEnd
      ? `column date ${dmy(end)} — the month ending ${spoken(y, m, d)}`
      : `column date ${dmy(end)} — not a month, quarter or year end; assumed the month to ${spoken(y, m, d)}`,
  };
}

/**
 * Two distinct staged periods must never resolve to the SAME target period.
 *
 * This is the rail. Scoping two columns and publishing both into one period
 * merges FY 2025-26 into FY 2026-27 — on this client roughly ₹38,012 L of
 * revenue for a company doing 20,200 — into an INSERT-ONLY table, where it
 * can only ever be superseded, never removed.
 *
 * SEGMENT IS NOT PART OF THIS CHECK, deliberately. Dhaulana and Greater
 * Noida both landing in FY 2026-27 as separate segments is per-segment
 * publishing working as ADR-014 requires, not a collision. Segment is a
 * dimension WITHIN a period; only the period-to-period mapping can merge.
 */
export function findPeriodCollisions(
  resolved: { periodKey: string; targetPeriodId: string; label: string }[],
): { targetPeriodId: string; label: string; periodKeys: string[] }[] {
  const byTarget = new Map<string, { label: string; keys: Set<string> }>();
  for (const r of resolved) {
    const entry = byTarget.get(r.targetPeriodId) ?? { label: r.label, keys: new Set<string>() };
    entry.keys.add(r.periodKey);
    byTarget.set(r.targetPeriodId, entry);
  }
  const collisions: { targetPeriodId: string; label: string; periodKeys: string[] }[] = [];
  for (const [targetPeriodId, entry] of byTarget) {
    if (entry.keys.size > 1) {
      collisions.push({
        targetPeriodId,
        label: entry.label,
        periodKeys: [...entry.keys].sort(),
      });
    }
  }
  return collisions;
}
