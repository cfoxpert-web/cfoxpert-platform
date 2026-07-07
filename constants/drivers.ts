/**
 * The six Enterprise Value drivers are used in THREE places across the
 * product (homepage wheel, Health Check results, Platform module preview).
 * In the static HTML they were redefined independently in each file with
 * copy-pasted colors and slightly drifting descriptions. This is the fix:
 * one typed source of truth, imported everywhere.
 */

export type DriverKey =
  | "financial"
  | "operational"
  | "growth"
  | "governance"
  | "technology"
  | "capital";

export interface EnterpriseValueDriver {
  key: DriverKey;
  label: string;
  shortLabel: string;
  description: string;
  tags: string[];
  /** Tailwind color token — see tailwind.config.ts `driver.*` */
  colorToken: `driver-${DriverKey}`;
  /** Literal hex, identical to the Tailwind token above. Needed anywhere
   *  Tailwind classes can't be used dynamically — SVG fills, Recharts bar
   *  colors. Single source so it's never redefined a second time. */
  hex: string;
  /** Default relative weight used in Business Health Score calculation */
  defaultWeight: number;
}

export const ENTERPRISE_VALUE_DRIVERS: EnterpriseValueDriver[] = [
  {
    key: "financial",
    label: "Financial Strength",
    shortLabel: "Financial",
    description:
      "A strong foundation of margins, cash flow, and capital efficiency that everything else is built on.",
    tags: ["Margins", "Cash Flow", "Capital Efficiency"],
    colorToken: "driver-financial",
    hex: "#1FB894",
    defaultWeight: 0.2,
  },
  {
    key: "operational",
    label: "Operational Excellence",
    shortLabel: "Operational",
    description:
      "Efficient processes and disciplined cost structures that convert activity into profit.",
    tags: ["Process Efficiency", "Cost Discipline", "Productivity"],
    colorToken: "driver-operational",
    hex: "#3C8CD9",
    defaultWeight: 0.2,
  },
  {
    key: "growth",
    label: "Strategic Growth",
    shortLabel: "Growth",
    description:
      "Profitable growth through the right markets, products, and customers — not just more revenue.",
    tags: ["Market Fit", "Product Mix", "Customer Economics"],
    colorToken: "driver-growth",
    hex: "#D9A441",
    defaultWeight: 0.2,
  },
  {
    key: "governance",
    label: "Governance & Leadership",
    shortLabel: "Governance",
    description:
      "Clear accountability, strong governance, and leadership systems that scale beyond the founder.",
    tags: ["Accountability", "Board Discipline", "Succession"],
    colorToken: "driver-governance",
    hex: "#D97757",
    defaultWeight: 0.1,
  },
  {
    key: "technology",
    label: "Technology & Intelligence",
    shortLabel: "Technology",
    description:
      "Data, dashboards, and AI that let the business make faster, sharper decisions.",
    tags: ["Dashboards", "Automation", "AI Insights"],
    colorToken: "driver-technology",
    hex: "#4C5FD5",
    defaultWeight: 0.1,
  },
  {
    key: "capital",
    label: "Capital & Valuation",
    shortLabel: "Capital",
    description:
      "The systems and story that build investor confidence and maximize what the business is worth.",
    tags: ["Investor Readiness", "Valuation", "Deal Structuring"],
    colorToken: "driver-capital",
    hex: "#E6C88A",
    defaultWeight: 0.2,
  },
];

// Sanity check at module load in dev — weights must sum to 1
if (process.env.NODE_ENV !== "production") {
  const total = ENTERPRISE_VALUE_DRIVERS.reduce((sum, d) => sum + d.defaultWeight, 0);
  if (Math.abs(total - 1) > 0.001) {
    // eslint-disable-next-line no-console
    console.warn(`[constants/drivers] Driver weights sum to ${total}, expected 1.0`);
  }
}
