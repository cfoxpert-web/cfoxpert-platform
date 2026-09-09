/**
 * Amendment A4-d — head classification (pure). Stage 2 of ADR-011.
 *
 * The seed of the standard Indian SME chart-of-accounts matcher. This is
 * the global layer beneath a client's own `account_mappings` (ADR-017):
 * org-confirmed mappings override everything here, so this only has to be
 * right about the labels every Indian SME ledger shares.
 *
 * IT MATCHES BY RULE, NOT BY LIST. The RPIL fixture is a regression test,
 * never classifier logic — if a label classifies because it appears in a
 * fixture, the test has stopped testing anything. Every rule below is a
 * keyword or a structural fact that generalises past this one workbook.
 *
 * DELIBERATELY CONSERVATIVE. There is no catch-all "any unrecognised
 * indirect expense is admin" fallback. An unrecognised head returns null
 * and becomes one of the operator's exceptions — which is the whole point
 * of ADR-016. On the RPIL file that yields 8 decisions out of 66 lines,
 * and the arithmetic proves all 8 are genuine expenses: the question is
 * always "which head?", never "should this be here?".
 *
 * Rule ORDER matters and encodes two structural facts that beat keywords:
 *   1. Section context wins inside DIRECT EXPENSES. `Wages & Jobworks` is
 *      a production cost there, not employee benefit; `Rent of DG &
 *      Machine` is a direct cost, not admin rent.
 *   2. Credit-side INDIRECT INCOME wins over cost keywords. Six lines here
 *      (`Interest on FDR`, `Interest on IT Refund`, `Interest on Security
 *      Deposit with UPPCL`, `Profit on sale of FA`, `Account Write off`,
 *      `Difference in Exch Rate`) read as costs to any keyword matcher.
 *      This is §5's "credit-side lines the matcher reads as costs
 *      reclassify to other income", implemented structurally.
 */

/**
 * Projection heads. Distinct from `kpi_definitions.key` on purpose: those
 * are ~20 published report metrics, these are the P&L buckets a line-level
 * projection works in. A7-a declares the head → KPI roll-up (ADR-018).
 */
export const PROJECTION_HEADS = [
  "revenue",
  "cogs",
  "stockChange",
  "directExp",
  "adminExp",
  "sellingExp",
  "employee",
  "interest",
  "depreciation",
  "otherIncome",
  "otherExp",
] as const;

export type ProjectionHead = (typeof PROJECTION_HEADS)[number];

/** Which heads are costs — used by the credit-side contra/reclass rules. */
const COST_HEADS = new Set<ProjectionHead>([
  "cogs",
  "stockChange",
  "directExp",
  "adminExp",
  "sellingExp",
  "employee",
  "interest",
  "depreciation",
  "otherExp",
]);

export function isCostHead(head: ProjectionHead): boolean {
  return COST_HEADS.has(head);
}

export type HeadClassification = {
  head: ProjectionHead | null;
  /** Why this head was chosen — carried into provenance (ADR-015). */
  reason: string;
  /** 0..1 confidence in the MAPPING (never in the amount). */
  confidence: number;
};

type Rule = { head: ProjectionHead; test: RegExp; why: string };

/**
 * Keyword rules, first match wins within their phase.
 *
 * Note the absence of a generic /fee/ or /service/ rule. This workbook
 * carries `Audit Fees`, `Consultancy Fee`, `Licence fee`, `ROC Fee`,
 * `Processing Fee` and `Subscription fee` — all classifiable — alongside
 * `Annual Fee`, `Pestseal Service Fee` and `Service Fee for MSME
 * Certification`, which are not. A generic rule would confidently
 * misclassify the latter three; naming the specific fees leaves them as
 * honest exceptions.
 */
const RULES: Rule[] = [
  // ---- Stock movement (both sides; the credit contra is handled below).
  { head: "stockChange", test: /\b(opening|closing)\s+stock\b/i, why: "stock movement" },
  { head: "stockChange", test: /\bstock\s+(in\s+trade|movement)\b/i, why: "stock movement" },

  // ---- Revenue.
  { head: "revenue", test: /^sales?\b(?!\s*(promotion|discount|return))/i, why: "sales" },
  { head: "revenue", test: /\b(turnover|revenue from operations|gross sales|net sales)\b/i, why: "revenue" },

  // ---- Materials.
  { head: "cogs", test: /^purchase/i, why: "purchases" },
  { head: "cogs", test: /\b(raw material|consumable|packing material|stores and spares)\b/i, why: "materials" },

  // ---- Depreciation (matches the common 'Depreciaton' misspelling).
  { head: "depreciation", test: /\bdeprecia/i, why: "depreciation" },
  { head: "depreciation", test: /\bamortis|amortiz/i, why: "amortisation" },

  // ---- Finance cost.
  { head: "interest", test: /\binterest\b/i, why: "interest" },
  { head: "interest", test: /\bbank\s+charge/i, why: "bank charges" },
  { head: "interest", test: /\b(bill\s+discount|discounting)\b/i, why: "discounting charges" },
  { head: "interest", test: /\bprocessing\s+fee/i, why: "loan processing fee" },
  { head: "interest", test: /\b(loan|overdraft|cc\s+limit)\b/i, why: "borrowing cost" },

  // ---- Employee benefit.
  { head: "employee", test: /\b(salary|salaries|wages?|bonus|gratuity|remuneration)\b/i, why: "employee cost" },
  { head: "employee", test: /\b(epf|esic?|pf|provident|superannuation)\b/i, why: "statutory employee cost" },
  { head: "employee", test: /\b(staff|labour|employee)\b/i, why: "employee cost" },
  { head: "employee", test: /\bwelfare\b/i, why: "staff welfare" },
  { head: "employee", test: /\bsitting\s+fee/i, why: "director sitting fees" },

  // ---- Selling & distribution.
  { head: "sellingExp", test: /\bfreight\s*(outward|out)\b/i, why: "outward freight" },
  { head: "sellingExp", test: /\b(commission|brokerage)\b/i, why: "selling commission" },
  { head: "sellingExp", test: /\badvertis/i, why: "advertising" },
  { head: "sellingExp", test: /\b(business\s+promotion|sales\s+promotion|marketing)/i, why: "promotion" },
  { head: "sellingExp", test: /\b(distribution|forwarding)\b/i, why: "distribution" },

  // ---- Administration. Named specifics only; no generic fee/service rule.
  { head: "adminExp", test: /\bamc\b/i, why: "annual maintenance contract" },
  { head: "adminExp", test: /\b(audit|consultanc|legal|professional)/i, why: "professional services" },
  { head: "adminExp", test: /\b(courier|postage|telephone|internet|communication)\b/i, why: "communication" },
  { head: "adminExp", test: /\b(medical|insurance)\b/i, why: "insurance and medical" },
  { head: "adminExp", test: /\bsubscription\b/i, why: "subscription" },
  { head: "adminExp", test: /\b(travel|conveyance)/i, why: "travel and conveyance" },
  { head: "adminExp", test: /\boffice\b/i, why: "office expenses" },
  { head: "adminExp", test: /\b(repair|maint|mant)/i, why: "repairs and maintenance" },
  { head: "adminExp", test: /\b(generator|vehicle)\b/i, why: "running and maintenance" },
  { head: "adminExp", test: /\blicen[cs]e\b/i, why: "licence fee" },
  { head: "adminExp", test: /\broc\b/i, why: "statutory filing fee" },
  { head: "adminExp", test: /\bsecurity\b/i, why: "security services" },
  { head: "adminExp", test: /\b(printing|stationa)/i, why: "printing and stationery" },
  { head: "adminExp", test: /\b(testing|analysis|inspection)\b/i, why: "testing charges" },
  { head: "adminExp", test: /\bhouse\s*keeping\b/i, why: "housekeeping" },
  { head: "adminExp", test: /\brent\b/i, why: "rent" },
  { head: "adminExp", test: /\b(electricity|power|water)\b/i, why: "utilities" },

  // ---- Residual named bucket. NOT a catch-all.
  { head: "otherExp", test: /\b(miscellaneous|misc)\b/i, why: "miscellaneous" },
];

/** Heads a line inside DIRECT EXPENSES may take; anything else is directExp. */
const DIRECT_SECTION_OVERRIDES = new Set<ProjectionHead>([
  "cogs",
  "stockChange",
  "depreciation",
]);

function matchKeyword(label: string): { head: ProjectionHead; why: string } | null {
  for (const rule of RULES) {
    if (rule.test.test(label)) return { head: rule.head, why: rule.why };
  }
  return null;
}

/**
 * Classify one staged line into a projection head.
 *
 * @param label   the cleaned source label
 * @param section canonical section name from the heading above it, or null
 * @param side    which side of a T-format statement the line sits on
 */
export function classifyHead(input: {
  label: string;
  section: string | null;
  side: "debit" | "credit" | null;
}): HeadClassification {
  const { label, section, side } = input;
  const keyword = matchKeyword(label);

  // ---- Structural rule 1: credit-side indirect income outranks keywords.
  //      Without this, `Interest on FDR` books as finance cost and the
  //      P&L loses ₹5.97 L of other income while gaining ₹5.97 L of cost.
  if (section === "INDIRECT INCOME" || section === "OTHER INCOME" || section === "DIRECT INCOME") {
    return {
      head: "otherIncome",
      reason:
        keyword && isCostHead(keyword.head)
          ? `Credit-side line under ${section}; reads as ${keyword.why} but reclassifies to other income.`
          : `Credit-side line under ${section}.`,
      confidence: 0.9,
    };
  }

  // ---- Structural rule 2: inside DIRECT EXPENSES, section beats keyword
  //      unless the keyword names a materially different head. `Wages &
  //      Jobworks` is production cost here, not employee benefit.
  if (section === "DIRECT EXPENSES" || section === "DIRECT EXPS" || section === "DIRECT EXPENSE") {
    if (keyword && DIRECT_SECTION_OVERRIDES.has(keyword.head)) {
      return {
        head: keyword.head,
        reason: `Under ${section}, but ${keyword.why} places it in ${keyword.head}.`,
        confidence: 0.85,
      };
    }
    return {
      head: "directExp",
      reason: `Line under ${section}.`,
      confidence: 0.85,
    };
  }

  if (keyword) {
    return {
      head: keyword.head,
      reason: `Matched on ${keyword.why}.`,
      confidence: 0.8,
    };
  }

  return {
    head: null,
    reason: section
      ? `No rule matched under ${section} — needs an operator decision.`
      : "No rule matched — needs an operator decision.",
    confidence: 0,
  };
}

/**
 * Sign convention for a staged amount.
 *
 * Closing stock on the credit side is a CONTRA against cost, not income:
 * carrying it negative is what makes opening + purchases − closing equal
 * cost of goods sold. Every other credit-side line keeps its printed sign
 * (income is positive; a credit-side income line that happens to be
 * negative, like `Difference in Exch Rate` at −₹0.73 L, stays negative).
 */
export function applySignConvention(input: {
  amount: number;
  head: ProjectionHead | null;
  side: "debit" | "credit" | null;
  label: string;
}): { amount: number; note: string | null } {
  const { amount, head, side, label } = input;
  if (side === "credit" && head === "stockChange" && /\bclosing\b/i.test(label)) {
    return {
      amount: -Math.abs(amount),
      note: "Credit-side closing stock carried negative as a contra against cost.",
    };
  }
  return { amount, note: null };
}
