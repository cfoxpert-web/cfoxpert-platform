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
};

export default nextConfig;
