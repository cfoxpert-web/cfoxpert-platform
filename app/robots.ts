import type { MetadataRoute } from "next";

/**
 * Pre-launch SEO pass: crawl the marketing site, keep crawlers out of the
 * client portal and auth surfaces. /r/* stays crawlable=false (unlisted
 * demo reports carry their own noindex headers/meta as well).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/client-login", "/r/"],
      },
    ],
    sitemap: "https://www.cfoxpert.in/sitemap.xml",
  };
}
