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
    title: "How often do you struggle to pay bills or salaries on time because cash hasn't come in yet?",
    sub: "This is about the gap between what you're owed and what you owe.",
    type: "options",
    options: [
      { label: "Almost never — cash flow is smooth", score: 90 },
      { label: "Occasionally, usually during busy periods", score: 65 },
      { label: "Fairly often, it's a recurring headache", score: 40 },
      { label: "Constantly — it's a real problem right now", score: 15 },
    ],
  },
  {
    key: "reporting",
    driverKey: "technology",
    eyebrow: "Visibility",
    title: "When you want to check how the business is really doing, what do you do?",
    sub: "Not what happened — but whether the business is actually improving.",
    type: "options",
    options: [
      { label: "Open a live dashboard — numbers are always current", score: 95 },
      { label: "Check the monthly report from my accountant/team", score: 60 },
      { label: "Ask my team and piece it together myself", score: 35 },
      { label: "I honestly don't have a clear way to check", score: 15 },
    ],
  },
  {
    key: "governance",
    driverKey: "governance",
    eyebrow: "Governance",
    title: "When something goes wrong, how clear is it whose job it was to prevent it?",
    sub: "Slide toward how your team actually operates today.",
    type: "slider",
    min: 0,
    max: 100,
    defaultValue: 50,
    lowLabel: "Nobody's really sure — I end up deciding",
    highLabel: "Always crystal clear who owns what",
  },
  {
    key: "growth",
    driverKey: "growth",
    eyebrow: "Strategic Growth",
    title: "If your single biggest customer left tomorrow, how much would it hurt?",
    sub: "This tells us how exposed the business is to one relationship.",
    type: "options",
    options: [
      { label: "Barely noticeable — we're well spread out", score: 90 },
      { label: "It would sting, but we'd recover in a few months", score: 65 },
      { label: "It would be a serious blow to revenue", score: 35 },
      { label: "It could threaten the business", score: 15 },
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
      { label: "More than ₹250 Crore", score: 80 },
    ],
  },
];
