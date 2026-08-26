import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      // A4 document upload goes through a server action; the Next default
      // body limit is 1 MB. Keep in sync with MAX_UPLOAD_BYTES in
      // lib/documents/actions.ts (20 MB) plus form overhead.
      bodySizeLimit: "25mb",
    },
  },
  async rewrites() {
    return [
      // Unlisted static reports live in public/r/ and are reachable only by
      // direct URL, extensionless.
      {
        source: "/r/sample-exports",
        destination: "/r/sample-exports.html",
      },
      {
        source: "/r/sample-trading-industries",
        destination: "/r/sample-trading-industries.html",
      },
      {
        source: "/r/sheetal-mercantile",
        destination: "/r/sheetal-mercantile.html",
      },
    ];
  },
  async headers() {
    return [
      {
        // Everything under /r/ is unlisted: keep crawlers out at the header
        // level in addition to any in-file robots meta.
        source: "/r/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
