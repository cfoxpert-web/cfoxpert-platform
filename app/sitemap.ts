import type { MetadataRoute } from "next";
import { MOCK_ARTICLES } from "@/lib/mock-data/articles";

const BASE = "https://www.cfoxpert.in";

/** Marketing surface only — the portal is auth-gated and disallowed in robots. */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    "",
    "/platform",
    "/health-check",
    "/knowledge",
    "/pricing",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const articles = MOCK_ARTICLES.map((article) => ({
    url: `${BASE}/knowledge/${article.slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...articles];
}
