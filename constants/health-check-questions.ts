import type { DriverKey } from "@/constants/drivers";

export interface QuestionOption {
  label: string;
  score: number;
}

interface BaseQuestion {
  key: string;
  eyebrow: string;
  title: string;
  sub: string;
  /** Which Enterprise Value driver this answer feeds. Absent for benchmark-only questions. */
  driverKey?: DriverKey;
}

export interface OptionsQuestion extends BaseQuestion {
  type: "options";
  options: QuestionOption[];
}

export interface SliderQuestion extends BaseQuestion {
  type: "slider";
  min: number;
  max: number;
  defaultValue: number;
  lowLabel: string;
  highLabel: string;
}

export type HealthCheckQuestion = OptionsQuestion | SliderQuestion;

/**
 * Each question maps to exactly one driver — this is the fix for a real bug
 * in the original HTML prototype, where two drivers (Operational Excellence
 * and Capital & Valuation) both read from the same "governance" question by
 * accident. Capital & Valuation has no question of its own by design — see
 * lib/health-check/score-engine.ts for why it's computed instead of asked.
 */
export const HEALTH_CHECK_QUESTIONS: HealthCheckQuestion[] = [
  {
    key: "dependency",
    driverKey: "operational",
    eyebrow: "Leadership",
    title: "If you took a 30-day break with no phone or email, what happens to the business?",
    sub: "Be honest — this tells us how much still runs through you personally.",
    type: "options",
    options: [
      { label: "Runs completely fine without me", score: 95 },
      { label: "Mostly fine, but a few decisions get stuck", score: 70 },
      { label: "Some real problems would come up", score: 45 },
      { label: "It would start falling apart within days", score: 20 },
    ],
  },
  {
    key: "cashcycle",
    driverKey: "financial",
    eyebrow: "Cash Flow",
    title: "After you raise an invoice, how long do customers actually take to pay?",
    sub: "Not the agreed terms — what really happens. This is your cash cycle.",
    type: "options",
    options: [
      { label: "Within 30 days", score: 90 },
      { label: "30 – 60 days", score: 65 },
      { label: "60 – 90 days", score: 40 },
      { label: "Over 90 days — or honestly unpredictable", score: 15 },
    ],
  },
  {
    key: "reporting",
    driverKey: "technology",
    eyebrow: "Visibility",
    title: "Do you know your actual profit for last month?",
    sub: "Not revenue — profit. The answer says a lot about your visibility.",
    type: "options",
    options: [
      { label: "Yes — exact number, from a report I trust", score: 95 },
      { label: "Roughly, in my head", score: 60 },
      { label: "I'll know when my CA closes the quarter", score: 35 },
      { label: "Only at year-end, honestly", score: 15 },
    ],
  },
  {
    key: "governance",
    driverKey: "governance",
    eyebrow: "Governance",
    title: "Apart from you, who can approve a significant expense — say ₹5 lakh?",
    sub: "This tells us whether decisions have owners and limits, or all roads lead to you.",
    type: "options",
    options: [
      { label: "A defined team, with clear approval limits", score: 90 },
      { label: "One trusted person can", score: 65 },
      { label: "Only me", score: 35 },
      { label: "Honestly, it depends on the day", score: 15 },
    ],
  },
  {
    key: "growth",
    driverKey: "growth",
    eyebrow: "Strategic Growth",
    title: "How much of your revenue comes from your single biggest customer?",
    sub: "Concentration is the quietest risk in a growing business.",
    type: "options",
    options: [
      { label: "Under 10%", score: 90 },
      { label: "10 – 25%", score: 70 },
      { label: "25 – 50%", score: 40 },
      { label: "More than half", score: 15 },
    ],
  },
  {
    key: "revenue",
    // No driverKey — this is a benchmark input, not a driver score.
    // Used only to weight the computed Capital & Valuation score. See score-engine.ts.
    eyebrow: "Business Profile",
    title: "What's your company's approximate annual turnover?",
    sub: "This helps us benchmark your score against similar-sized businesses.",
    type: "options",
    options: [
      { label: "Less than ₹5 Crore", score: 55 },
      { label: "₹5 – 25 Crore", score: 65 },
      { label: "₹25 – 50 Crore", score: 72 },
      { label: "₹50 – 100 Crore", score: 80 },
      { label: "₹100 – 250 Crore", score: 85 },
      // 82, not 80: deliberately close to the 50–100Cr band (very large
      // companies score slightly below the 100–250 peak) but UNIQUE — a
      // duplicate score once made two options highlight together (fixed in
      // the UI too, but scores stay unique as hygiene).
      { label: "More than ₹250 Crore", score: 82 },
    ],
  },
  {
    key: "diligence",
    // No driverKey — feeds the COMPUTED Capital & Valuation score directly
    // (see computeCapitalScore in score-engine.ts): valuation readiness is
    // the one part of that driver a founder CAN self-report.
    eyebrow: "Valuation Readiness",
    title: "If a bank or investor asked for three years of clean financials tomorrow, how ready are you?",
    sub: "This is exactly what happens in a real funding or sale conversation.",
    type: "options",
    options: [
      { label: "Ready this week — audited and organised", score: 90 },
      { label: "A few weeks of clean-up and we're there", score: 65 },
      { label: "It would take a serious effort", score: 40 },
      { label: "Not possible with today's records", score: 15 },
    ],
  },
  {
    key: "biztype",
    // No driverKey and NOT a score: the values are category codes
    // (1=Manufacturing, 2=Trading, 3=Services, 4=Other) stored in the
    // answers map for lead qualification and future benchmark
    // classification. The score engine ignores keys without a driverKey
    // unless it reads them explicitly — it does not read this one.
    eyebrow: "Business Profile",
    title: "What best describes your business?",
    sub: "So your score is read against the right kind of company.",
    type: "options",
    options: [
      { label: "Manufacturing", score: 1 },
      { label: "Trading & distribution", score: 2 },
      { label: "Services", score: 3 },
      { label: "Something else", score: 4 },
    ],
  },
];
