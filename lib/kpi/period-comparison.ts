/**
 * Milestone A1 — period comparison resolver (pure).
 *
 * Given a "current" period and a comparison mode, picks WHICH period to
 * compare against. It never touches the database and never does KPI math —
 * the KPI Engine (engine.ts) stays the single computation path; this module
 * only selects the pair of periods the engine then evaluates.
 *
 * Modes:
 *   previous — the same-type period immediately before current
 *   mom      — one month earlier   (−1 month)
 *   qoq      — one quarter earlier  (−3 months)
 *   yoy      — one year earlier     (−12 months)
 *   custom   — an explicitly chosen period (by label)
 */

export type ComparisonMode = "previous" | "mom" | "qoq" | "yoy" | "custom";

export const COMPARISON_MODES: ComparisonMode[] = [
  "previous",
  "yoy",
  "qoq",
  "mom",
  "custom",
];

export function isComparisonMode(value: string | undefined): value is ComparisonMode {
  return (
    value === "previous" ||
    value === "mom" ||
    value === "qoq" ||
    value === "yoy" ||
    value === "custom"
  );
}

export type ComparablePeriod = {
  id: string;
  label: string;
  type: string; // 'monthly' | 'quarterly' | 'yearly'
  start: string | null; // 'YYYY-MM-DD'
};

const MODE_OFFSET_MONTHS: Record<"mom" | "qoq" | "yoy", number> = {
  mom: 1,
  qoq: 3,
  yoy: 12,
};

/**
 * Shift an ISO date ('YYYY-MM-DD') back by `months`, preserving the day.
 * Operates on the numeric parts only — no Date object, so no timezone drift.
 * Period starts are the first of a month, so exact.
 */
export function shiftMonthsBack(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const monthIndex = y * 12 + (m - 1) - months;
  const ny = Math.floor(monthIndex / 12);
  const nm = (((monthIndex % 12) + 12) % 12) + 1;
  return `${String(ny).padStart(4, "0")}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Resolve the comparator period. Returns null when none applies — the caller
 * then renders the KPIs with no delta (an honest "no comparison available"
 * rather than a fabricated one).
 */
export function resolveComparator(
  current: ComparablePeriod,
  mode: ComparisonMode,
  candidates: ComparablePeriod[],
  customLabel?: string,
): ComparablePeriod | null {
  const others = candidates.filter((p) => p.id !== current.id);

  if (mode === "custom") {
    return others.find((p) => p.label === customLabel) ?? null;
  }

  // Fixed-offset modes: match a same-type period at the exact target start.
  if (mode === "mom" || mode === "qoq" || mode === "yoy") {
    if (!current.start) return resolvePrevious(current, others);
    const target = shiftMonthsBack(current.start, MODE_OFFSET_MONTHS[mode]);
    return (
      others.find((p) => p.type === current.type && p.start === target) ?? null
    );
  }

  return resolvePrevious(current, others);
}

/** The same-type period immediately before current, by start date. */
function resolvePrevious(
  current: ComparablePeriod,
  others: ComparablePeriod[],
): ComparablePeriod | null {
  if (!current.start) return null;
  const earlier = others
    .filter((p) => p.type === current.type && p.start && p.start < current.start!)
    .sort((a, b) => (a.start! < b.start! ? 1 : -1));
  return earlier[0] ?? null;
}
