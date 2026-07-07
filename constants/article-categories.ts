import type { ArticleCategory } from "@/types";

interface CategoryStyle {
  bg: string;
  fg: string;
}

/**
 * Hex values here intentionally reuse tokens already defined in
 * tailwind.config.ts (teal, sky, amber, coral, gold, indigo) — no new
 * colors are introduced for the Knowledge Hub.
 */
export const ARTICLE_CATEGORY_STYLES: Record<ArticleCategory, CategoryStyle> = {
  "CEO Guides": { bg: "#EEF1FB", fg: "#4C5FD5" },
  "Business Intelligence": { bg: "#E9F2FA", fg: "#3C8CD9" },
  "Cash Flow": { bg: "#E7F5F1", fg: "#0E8C77" },
  "Working Capital": { bg: "#FDF3E9", fg: "#D9A441" },
  "Enterprise Value": { bg: "#FBEEE8", fg: "#D97757" },
  Manufacturing: { bg: "#F3EEE3", fg: "#B4863F" },
  Governance: { bg: "#EEF1FB", fg: "#4C5FD5" },
  Growth: { bg: "#FDF3E9", fg: "#D9A441" },
  "Financial Strategy": { bg: "#E7F5F1", fg: "#0E8C77" },
  "KPI Library": { bg: "#E9F2FA", fg: "#3C8CD9" },
  "Industry Insights": { bg: "#F3EEE3", fg: "#B4863F" },
};

export const ARTICLE_CATEGORIES: ArticleCategory[] = Object.keys(
  ARTICLE_CATEGORY_STYLES
) as ArticleCategory[];
