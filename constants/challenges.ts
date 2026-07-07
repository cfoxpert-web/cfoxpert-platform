export interface Challenge {
  title: string;
  description: string;
}

/**
 * Appeared verbatim in both homepage.html and about.html. Centralizing here
 * means editing the copy once updates it everywhere it's used.
 */
export const BUSINESS_CHALLENGES: Challenge[] = [
  {
    title: "Founder dependency",
    description: "The business runs on people, not systems — so it can't run without you in the room.",
  },
  {
    title: "Poor cash conversion",
    description: "Sales are up. Cash isn't. Working capital quietly eats the growth.",
  },
  {
    title: "Low visibility",
    description: "Management gets activity reports, not the insight needed to act.",
  },
  {
    title: "Weak accountability",
    description: "Departments report what they did, not what it achieved.",
  },
  {
    title: "Slow decisions",
    description: "No real-time intelligence means decisions lag the business by a quarter.",
  },
  {
    title: "Stagnant valuation",
    description: "Revenue climbs. Enterprise value — what the business is actually worth — doesn't.",
  },
];
