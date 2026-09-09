/**
 * Amendment A4-d — row classification (pure).
 *
 * Stage 2 of the six-stage pipeline (ADR-011): before anything is staged,
 * every row in a scoped block is classified as what it actually IS. Only
 * `line` rows reach staging. Everything else is retained WITH a reason so
 * the review screen can list exclusions and let an operator reverse them
 * (§6: excluded lines are listed and reversible, never silently dropped).
 *
 * TWO RULE CLASSES, deliberately kept apart:
 *
 *  - VALUE-GATED (the noise class): signature blocks, report headers,
 *    accounting-policy notes, numbered footnotes. These are recognised by
 *    prose-like structure, and a rule in this class may NEVER discard a row
 *    that carries a value. The reference implementation this replaces
 *    carried `/^…|director\b|…/` to catch a signatory line reading
 *    "Director" and it silently deleted `Director remuneration`, a
 *    ₹223.80 L expense, on the prefix match. So: the whole class is gated
 *    on "no numeric value in any scoped column", and signatory terms match
 *    as WHOLE labels, never as prefixes. A prose-shaped row that does carry
 *    a value becomes `unclear` — surfaced for a human, never deleted.
 *
 *  - PATTERN-GATED (totals, subtotals, ratios, derived lines, section
 *    headings): recognised by a positive signal in the label itself, so
 *    they stay correct whether or not the row carries a value. They must,
 *    because they nearly always do — `TO INDIRECT EXPS` carries a
 *    ₹2,338.86 L roll-up and `% Total Direct Exp` carries ₹1,612.79 L,
 *    which is exactly the sum of the six direct lines beneath it. Staging
 *    either one double-counts the statement.
 *
 * Structure is NEVER inferred from absence of data. The reference
 * implementation read "row has no values" as "row is a section heading",
 * which made `Renewal Fee` — a real expense head that happens to be zero
 * in the scoped periods — the parent of `Bad debt`. Wrong parents feed
 * straight into head inference, so this is a correctness bug, not
 * untidiness. Headings are recognised by VOCABULARY; capitalisation only
 * corroborates and is never sufficient on its own (this workbook is full
 * of all-caps real lines: PURCHASE INKS, BONUS/INCENTIVE A/C,
 * SHORT & EXCESS A/C).
 *
 * "No value in any scoped period → not staged" is a separate rule applied
 * by the caller, not a classification. A head that is zero across the
 * whole scope has nothing to publish and nothing to project; it is still
 * a `line`, and it is still reported as excluded-with-a-reason.
 */

export type RowKind =
  | "line"
  | "section_heading"
  | "total"
  | "subtotal"
  | "derived"
  | "ratio"
  | "note"
  | "blank"
  | "unclear";

export type RowClassification = {
  kind: RowKind;
  /** Operator-facing explanation. Rendered in the excluded-lines list. */
  reason: string;
  /** Canonical section name when kind === 'section_heading'; else null. */
  sectionName: string | null;
};

/** Only `line` rows are eligible for staging. */
export function isStageable(kind: RowKind): boolean {
  return kind === "line";
}

/**
 * Section vocabulary — THE primary heading signal. Compared against the
 * label with any TO/BY bookkeeping prefix and trailing ACCOUNT/A/C removed,
 * upper-cased and whitespace-collapsed.
 *
 * Note what is deliberately ABSENT: PURCHASE and OPENING STOCK. Both appear
 * in this workbook as `TO PURCHASE A/C` and `TO OPENING STOCK` — bookkeeping
 * prefix, all caps, and both are real lines carrying real amounts. That is
 * precisely why the TO/BY prefix and capitalisation cannot promote a row to
 * a heading on their own.
 */
const SECTION_VOCABULARY = new Set([
  "SALES",
  "TRADING",
  "DIRECT EXPENSES",
  "DIRECT EXPS",
  "DIRECT EXPENSE",
  "DIRECT INCOME",
  "INDIRECT EXPENSES",
  "INDIRECT EXPS",
  "INDIRECT EXPENSE",
  "INDIRECT INCOME",
  "OPERATING EXPENSES",
  "ADMINISTRATIVE EXPENSES",
  "ADMIN EXPENSES",
  "SELLING EXPENSES",
  "SELLING AND DISTRIBUTION EXPENSES",
  "EMPLOYEE BENEFIT EXPENSES",
  "FINANCE COST",
  "FINANCE COSTS",
  "OTHER INCOME",
  "OTHER EXPENSES",
  "REVENUE FROM OPERATIONS",
]);

/**
 * Derived lines: computed from other rows on the same statement. Staging
 * one double-counts.
 *
 * `CONSUMPTION OF RAW MATERIAL` is the judgement call in this list — it is
 * excluded because it restates opening stock + purchases − closing stock,
 * all three of which stage individually. Where a client's intent is the
 * reverse (consumption stated, components not), that is an operator
 * override on the review screen, not a different parser default.
 */
const DERIVED_VOCABULARY = new Set([
  "GROSS PROFIT",
  "GROSS PROFIT C/F",
  "GROSS PROFIT B/F",
  "GROSS LOSS",
  "GROSS LOSS C/F",
  "GROSS LOSS B/F",
  "NET PROFIT",
  "NET LOSS",
  "NET PROFIT BEFORE TAX",
  "PROFIT BEFORE TAX",
  "PROFIT AFTER TAX",
  "OPERATING PROFIT",
  "EBITDA",
  "CONSUMPTION OF RAW MATERIAL",
  "COST OF GOODS SOLD",
  "COST OF MATERIAL CONSUMED",
]);

/**
 * Signatory / attestation terms. Matched as WHOLE labels only (optionally
 * followed by a colon or dash), never as prefixes — `director\b` as a
 * prefix is the exact bug this replaces. Value-gated by the caller path
 * below, so none of these can ever discard an amount.
 */
const SIGNATORY_TERMS = [
  "director",
  "directors",
  "partner",
  "partners",
  "proprietor",
  "chartered accountant",
  "chartered accountants",
  "auditor",
  "auditors",
  "frn",
  "firm registration no",
  "membership no",
  "m no",
  "din",
  "place",
  "date",
  "signature",
  "for and on behalf",
  "as per our report",
  "as per our report of even date",
  "significant accounting policies",
  "the accompanying notes",
  "notes to accounts",
  "notes",
  "note",
  "list of accounts",
];

const HEADER_TERMS = new Set([
  "particulars",
  "particular",
  "description",
  "account head",
  "head",
  "narration",
  "amount",
  "amount rs",
  "sr no",
  "s no",
  "sl no",
]);

/** Strip bookkeeping prefixes/suffixes to compare against the vocabularies. */
export function canonicalSectionName(label: string): string {
  return label
    .replace(/^\s*(to|by)\s+/i, "")
    .replace(/\s*(a\/c|account)\s*$/i, "")
    .replace(/[\s:.\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/**
 * Strip bookkeeping affixes for the STORED source label. Deliberately a
 * different function from `normalizeLabel()` in normalize.ts: that one is
 * the account_mappings key and migration 0013 pins every stored mapping to
 * it, so changing it would silently re-key the client's whole memory. This
 * one only affects how a label is displayed and stored on the staged row.
 */
export function cleanSourceLabel(label: string): string {
  // Only bookkeeping affixes and runs of whitespace are removed. Trailing
  // punctuation is KEPT: `Bonus Exp.` and `Vehicle Running & Mant.` are
  // the labels as printed, and §5 requires the source label to survive
  // intact. Normalisation for matching happens elsewhere.
  return label
    .replace(/^\s*(to|by)\s+/i, "")
    .replace(/\s*a\/c\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSignatory(normalized: string): boolean {
  const stripped = normalized.replace(/[\s:.\-–—]+$/g, "").trim();
  return SIGNATORY_TERMS.includes(stripped);
}

/** Numbered footnote: "1.The unbold figures represent the actual figures". */
function looksLikeFootnote(label: string): boolean {
  return /^\s*\d+\s*[.)]\s*\S/.test(label) && label.trim().length > 20;
}

/** Prose: long, many words, and reads as a sentence rather than a head. */
function looksLikeProse(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length < 60) return false;
  const words = trimmed.split(/\s+/).length;
  return words >= 9;
}

/**
 * Classify one row.
 *
 * @param label        the label exactly as printed
 * @param carriesValue whether the row has a numeric value in ANY scoped
 *                     column. Gates the noise class only.
 */
export function classifyRow(
  label: string | null | undefined,
  carriesValue: boolean,
): RowClassification {
  if (label === null || label === undefined || label.trim() === "") {
    return { kind: "blank", reason: "No label.", sectionName: null };
  }

  const raw = label.trim();
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const canonical = canonicalSectionName(raw);

  // ---- Column headers (value-gated: a real head could be called "Amount").
  if (!carriesValue && HEADER_TERMS.has(normalized.replace(/[.:]+$/, ""))) {
    return { kind: "blank", reason: "Column header.", sectionName: null };
  }

  // ---- PATTERN-GATED rules. Correct whether or not a value is present,
  //      because these rows almost always carry one.

  // Totals: "TOTAL", "Grand Total", "Total Assets".
  if (/^(grand\s+)?total\b/i.test(raw)) {
    return {
      kind: "total",
      reason: "Stated total — staging it would double-count the lines above.",
      sectionName: null,
    };
  }

  // Subtotals presented as a percentage-prefixed roll-up: "% Total Direct
  // Exp" carries the sum of the direct lines beneath it, not a percentage.
  if (/^%\s*total\b/i.test(raw)) {
    return {
      kind: "subtotal",
      reason: "Section subtotal — staging it would double-count its lines.",
      sectionName: null,
    };
  }


  // Derived subtotals carried across the T-account or computed from others.
  if (DERIVED_VOCABULARY.has(canonical)) {
    return {
      kind: "derived",
      reason: `Derived from other lines (${canonical}) — computed, not staged.`,
      sectionName: null,
    };
  }

  // Section headings — vocabulary is the PRIMARY signal, but never the
  // only one. `BY SALES ACCOUNT` (the heading) and `Sales` (the revenue
  // line directly beneath it) both canonicalise to SALES; promoting on
  // vocabulary alone swallows the revenue line and the P&L loses its top
  // line entirely. A heading must also carry a structural signal: a TO/BY
  // bookkeeping prefix, or full capitalisation. Capitalisation alone is
  // never enough — this workbook is full of all-caps real lines
  // (PURCHASE INKS, BONUS/INCENTIVE A/C, SHORT & EXCESS A/C).
  const hasBookkeepingPrefix = /^\s*(to|by)\s+/i.test(raw);
  const isAllCaps = raw === raw.toUpperCase() && /[A-Z]/.test(raw);
  if (SECTION_VOCABULARY.has(canonical) && (hasBookkeepingPrefix || isAllCaps)) {
    return {
      kind: "section_heading",
      reason: carriesValue
        ? `Section heading carrying a roll-up figure; its value is ignored and its name classifies the lines beneath it.`
        : "Section heading; classifies the lines beneath it.",
      sectionName: canonical,
    };
  }

  // ---- VALUE-GATED noise class. Never reachable for a row with an amount.
  //
  // This runs BEFORE the ratio check on purpose. A footnote may well
  // mention a percentage — "5.The reduction in NP margin from 6.50% in the
  // annualised June figures" — and testing for `%` first would exclude it
  // as a "ratio or percentage row". The outcome is the same either way,
  // but the REASON is what the review screen shows a human, and calling a
  // sentence a ratio row is nonsense. Ratio detection follows, for rows
  // that are not prose.
  const prose = looksLikeFootnote(raw) || looksLikeProse(raw);
  const signatory = isSignatory(normalized);

  if (prose || signatory) {
    if (!carriesValue) {
      return {
        kind: "note",
        reason: signatory
          ? "Signature or attestation block."
          : "Footnote or narrative note.",
        sectionName: null,
      };
    }
    // Reads like prose but carries an amount. Refuse to guess: surface it.
    return {
      kind: "unclear",
      reason:
        "Reads like a note but carries an amount — needs a human decision; not excluded automatically.",
      sectionName: null,
    };
  }

  // Ratio / percentage rows: "GP RATIO (%)", "Closing Stock (% of Sale)",
  // "Consumption % as per sale". Never a financial line.
  if (/%/.test(raw) || /\bratio\b/i.test(raw)) {
    return {
      kind: "ratio",
      reason: "Ratio or percentage row, not a financial line.",
      sectionName: null,
    };
  }

  return { kind: "line", reason: "Financial line.", sectionName: null };
}
