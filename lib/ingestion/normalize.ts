/**
 * Amendment A4-b — label + amount normalization (pure).
 *
 * normalizeLabel is THE single implementation the account_mappings table's
 * comment points at: lower-cased, whitespace-collapsed, trailing
 * punctuation stripped. Change it and every stored mapping key shifts —
 * so don't, without a data migration.
 */

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\s:.\-–—]+$/g, "")
    .trim();
}

/**
 * Parse an amount as printed in Indian financial statements:
 *   "1,23,456.78"  → 123456.78   (lakh/crore comma grouping)
 *   "(1,234.00)"   → -1234       (accounting negatives)
 *   "-"  ""  "NA"  → null
 *
 * Dr/Cr suffix handling is OPT-IN (`drCr: true`, trial-balance context
 * only): "1,200 Dr" → 1200, "5,000 Cr" → -5000. Outside a trial balance
 * "Cr" usually abbreviates CRORE, not credit — interpreting it by default
 * would silently corrupt magnitudes, so we don't.
 */
export function parseAmount(
  raw: string | number | null | undefined,
  opts?: { drCr?: boolean },
): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = raw.trim();
  if (s === "" || s === "-" || s === "—" || /^n\.?a\.?$/i.test(s)) return null;

  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  if (opts?.drCr) {
    if (/\bcr\.?$/i.test(s)) {
      sign *= -1;
      s = s.replace(/\bcr\.?$/i, "");
    } else if (/\bdr\.?$/i.test(s)) {
      s = s.replace(/\bdr\.?$/i, "");
    }
  }

  s = s.replace(/[₹,\s]/g, "");
  if (s === "" || !/^-?\d+(\.\d+)?$/.test(s)) return null;

  const value = Number(s);
  return Number.isFinite(value) ? sign * value : null;
}

/** "Total", "Grand Total", "Total Assets" … — validation treats these specially. */
export function isTotalLabel(label: string): boolean {
  return /^(grand\s+)?total\b/i.test(label.trim());
}
