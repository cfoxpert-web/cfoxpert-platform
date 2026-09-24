import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest never had a config, so the `@/*` path aliases declared in
 * tsconfig.json resolved under `tsc` and `next build` but NOT under the
 * test runner. Any suite importing through `@/` failed to load, and
 * `pnpm test` had been exiting non-zero as a result — which is worse than
 * one broken file, because a permanently red suite carries no signal and
 * the next real regression hides inside the existing failure.
 *
 * The aliases here mirror tsconfig.json's `paths` exactly. If one is added
 * there, add it here too — they are two declarations of one fact, and
 * nothing checks that they agree.
 */
const root = path.resolve(__dirname);

export default defineConfig({
  resolve: {
    alias: {
      "@/components": path.resolve(root, "components"),
      "@/lib": path.resolve(root, "lib"),
      "@/hooks": path.resolve(root, "hooks"),
      "@/types": path.resolve(root, "types"),
      "@/constants": path.resolve(root, "constants"),
      "@": root,
    },
  },
});
