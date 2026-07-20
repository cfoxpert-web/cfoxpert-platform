import type { DocumentKind } from "../documents/model";
import { isTotalLabel } from "./normalize";
import type { CandidateLine, GateResult } from "./types";

/**
 * Amendment A4-b — deterministic validation gates (pure), run before a job
 * may reach needs_review. Gates prove INTERNAL CONSISTENCY, not fidelity
 * to the source — which is why a passing job still requires analyst
 * review (ADR-010). A failing gate FLAGS the job (stored on
 * ingestion_jobs.validation, shown by the A4-c review UI); it is never
 * silently dropped. Gates that don't apply report 'skipped' with a
 * reason — an honest "couldn't check" beats a fake "pass".
 */

/** Absolute tolerance in rupees — statements round to the rupee or paisa. */
const ABS_TOLERANCE = 1.5;
/** Relative tolerance for stated-total comparisons. */
const REL_TOLERANCE = 0.005;

function closeEnough(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  if (diff <= ABS_TOLERANCE) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b));
  return scale > 0 && diff / scale <= REL_TOLERANCE;
}

const fmt = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

function amountsOf(lines: CandidateLine[]): CandidateLine[] {
  return lines.filter((l) => l.amount !== null);
}

function tbBalanceGate(lines: CandidateLine[], kind: DocumentKind): GateResult {
  const gate = "tb_balance";
  if (kind !== "trial_balance") {
    return { gate, status: "skipped", detail: "Not a trial balance." };
  }
  const detail_lines = amountsOf(lines).filter(
    (l) => !isTotalLabel(l.sourceLabel),
  );
  if (detail_lines.length === 0) {
    return { gate, status: "skipped", detail: "No amounts to check." };
  }
  // Signed convention: debit positive, credit negative.
  const debits = detail_lines.reduce(
    (acc, l) => acc + Math.max(0, l.amount ?? 0),
    0,
  );
  const credits = detail_lines.reduce(
    (acc, l) => acc + Math.max(0, -(l.amount ?? 0)),
    0,
  );
  return closeEnough(debits, credits)
    ? { gate, status: "pass", detail: "Debits equal credits." }
    : {
        gate,
        status: "fail",
        detail: `Debits ₹${fmt(debits)} ≠ credits ₹${fmt(credits)}.`,
      };
}

function statedTotalGate(lines: CandidateLine[]): GateResult {
  const gate = "stated_total";
  const withAmounts = amountsOf(lines);
  const totals = withAmounts.filter((l) => isTotalLabel(l.sourceLabel));
  const details = withAmounts.filter((l) => !isTotalLabel(l.sourceLabel));
  if (totals.length !== 1 || details.length === 0) {
    return {
      gate,
      status: "skipped",
      detail:
        totals.length === 0
          ? "Document states no total line."
          : "Multiple total/subtotal lines — cannot attribute a single sum.",
    };
  }
  const total = totals[0];
  if (!total || total.amount === null) {
    return { gate, status: "skipped", detail: "Total line has no amount." };
  }
  const sum = details.reduce((acc, l) => acc + (l.amount ?? 0), 0);
  return closeEnough(sum, total.amount) ||
    closeEnough(Math.abs(sum), Math.abs(total.amount))
    ? { gate, status: "pass", detail: "Line items add up to the stated total." }
    : {
        gate,
        status: "fail",
        detail: `Lines sum to ₹${fmt(sum)} but the document states ₹${fmt(total.amount)}.`,
      };
}

function bsEquationGate(lines: CandidateLine[], kind: DocumentKind): GateResult {
  const gate = "bs_equation";
  if (kind !== "balance_sheet") {
    return { gate, status: "skipped", detail: "Not a balance sheet." };
  }
  const withAmounts = amountsOf(lines);
  const assetTotals = withAmounts.filter(
    (l) => isTotalLabel(l.sourceLabel) && /asset/i.test(l.sourceLabel),
  );
  const liabTotals = withAmounts.filter(
    (l) =>
      isTotalLabel(l.sourceLabel) &&
      /liabilit|equity|capital/i.test(l.sourceLabel),
  );
  if (assetTotals.length === 0 || liabTotals.length === 0) {
    return {
      gate,
      status: "skipped",
      detail: "Stated asset/liability totals not found.",
    };
  }
  const assets = assetTotals.reduce((a, l) => a + Math.abs(l.amount ?? 0), 0);
  const liab = liabTotals.reduce((a, l) => a + Math.abs(l.amount ?? 0), 0);
  return closeEnough(assets, liab)
    ? { gate, status: "pass", detail: "Assets equal liabilities + equity." }
    : {
        gate,
        status: "fail",
        detail: `Total assets ₹${fmt(assets)} ≠ liabilities + equity ₹${fmt(liab)}.`,
      };
}

function pnlConsistencyGate(
  lines: CandidateLine[],
  kind: DocumentKind,
): GateResult {
  const gate = "pnl_consistency";
  if (kind !== "pnl") {
    return { gate, status: "skipped", detail: "Not a P&L." };
  }
  const byKey = new Map<string, number>();
  for (const l of amountsOf(lines)) {
    if (l.proposedKpiKey && !byKey.has(l.proposedKpiKey)) {
      byKey.set(l.proposedKpiKey, l.amount ?? 0);
    }
  }
  const revenue = byKey.get("revenue");
  const gp = byKey.get("gross_profit");
  const np = byKey.get("net_profit");
  if (revenue === undefined || gp === undefined) {
    return {
      gate,
      status: "skipped",
      detail: "Revenue/gross-profit lines not yet mapped.",
    };
  }
  if (revenue > 0 && gp > revenue) {
    return {
      gate,
      status: "fail",
      detail: `Gross profit ₹${fmt(gp)} exceeds revenue ₹${fmt(revenue)}.`,
    };
  }
  if (np !== undefined && np > gp) {
    return {
      gate,
      status: "fail",
      detail: `Net profit ₹${fmt(np)} exceeds gross profit ₹${fmt(gp)}.`,
    };
  }
  return { gate, status: "pass", detail: "P&L levels are ordered sensibly." };
}

function periodGate(
  periodStart: string | null,
  periodEnd: string | null,
): GateResult {
  const gate = "period_dates";
  if (!periodStart || !periodEnd) {
    return { gate, status: "skipped", detail: "No period dates extracted." };
  }
  const start = Date.parse(periodStart);
  const end = Date.parse(periodEnd);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { gate, status: "fail", detail: "Period dates do not parse." };
  }
  const days = (end - start) / 86_400_000 + 1;
  if (days < 1 || days > 400) {
    return {
      gate,
      status: "fail",
      detail: `Implausible period length (${Math.round(days)} days).`,
    };
  }
  return { gate, status: "pass", detail: "Period dates are plausible." };
}

export function runValidationGates(input: {
  lines: CandidateLine[];
  kind: DocumentKind;
  periodStart: string | null;
  periodEnd: string | null;
}): GateResult[] {
  const { lines, kind, periodStart, periodEnd } = input;
  const results: GateResult[] = [
    tbBalanceGate(lines, kind),
    statedTotalGate(lines),
    bsEquationGate(lines, kind),
    pnlConsistencyGate(lines, kind),
    periodGate(periodStart, periodEnd),
  ];
  return results;
}

export function gateFailures(results: GateResult[]): GateResult[] {
  return results.filter((r) => r.status === "fail");
}
