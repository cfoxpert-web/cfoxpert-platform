import { env } from './env';

/**
 * Feature flags (Milestone 2 — see docs/Integration Roadmap.md, ADR-007).
 *
 * Pure, React-free logic, matching this repo's convention for
 * computational modules (lib/health-check/score-engine.ts,
 * lib/knowledge/filter-articles.ts).
 *
 * HOW IT WORKS
 * - Every flag is declared in FLAG_DEFAULTS with a safe default.
 * - Defaults can be overridden per environment via one env var:
 *     NEXT_PUBLIC_FEATURE_FLAGS="realAuth:on,crm:off"
 *   Changing a flag in Vercel's env settings + redeploy is enough;
 *   no code change required.
 * - Unknown flag names or malformed entries in the env var are
 *   ignored with a console warning — a typo in an env var must never
 *   crash the site.
 *
 * MIGRATION PATH (deliberate, per roadmap)
 * When the database schema exists (Milestone 7), flags migrate to a
 * feature_flags table with optional per-organization overrides.
 * Callers won't change: isFeatureEnabled() stays the single read
 * point; only its internals gain a data source. Do not read
 * FLAG_DEFAULTS or parse the env var anywhere else.
 */

/**
 * The flag registry. Add new flags here as milestones introduce them.
 * Names are camelCase and should describe the capability, not the
 * milestone number (milestone numbers change meaning over time;
 * capability names don't).
 */
export const FLAG_DEFAULTS = {
  /** Milestone 4: real Supabase auth replacing the mock session. */
  realAuth: false,
  /** Milestone 8: persist Health Check submissions to the database. */
  healthCheckPersistence: false,
  /** Milestone 9: CRM surface. */
  crm: false,
  /** Milestone 11: dashboard reads real KPI data instead of lib/mock-data. */
  realDashboardData: false,
  /** Milestone 13: AI-generated commentary/insight drafts. */
  aiInsights: false,
  /** Amendment A4: document upload + ingestion pipeline. */
  docIngestion: false,
} as const;

export type FeatureFlag = keyof typeof FLAG_DEFAULTS;

/** Values accepted in the env var, mapped to booleans. */
const TRUTHY = new Set(['on', 'true', '1', 'enabled']);
const FALSY = new Set(['off', 'false', '0', 'disabled']);

/**
 * Parses NEXT_PUBLIC_FEATURE_FLAGS ("name:on,other:off") into
 * overrides. Exported for testability; not intended for direct use —
 * call isFeatureEnabled() instead.
 */
export function parseFlagOverrides(
  raw: string | undefined,
): Partial<Record<FeatureFlag, boolean>> {
  if (!raw || raw.trim() === '') return {};

  const overrides: Partial<Record<FeatureFlag, boolean>> = {};

  for (const entry of raw.split(',')) {
    const [name, value] = entry.split(':').map((s) => s?.trim());

    if (!name || !value) {
      console.warn(`[feature-flags] Ignoring malformed entry: "${entry}"`);
      continue;
    }
    if (!(name in FLAG_DEFAULTS)) {
      console.warn(`[feature-flags] Ignoring unknown flag: "${name}"`);
      continue;
    }

    const lower = value.toLowerCase();
    if (TRUTHY.has(lower)) {
      overrides[name as FeatureFlag] = true;
    } else if (FALSY.has(lower)) {
      overrides[name as FeatureFlag] = false;
    } else {
      console.warn(
        `[feature-flags] Ignoring flag "${name}" with unrecognized value "${value}" (use on/off)`,
      );
    }
  }

  return overrides;
}

/** Resolved once at module load — env vars don't change mid-process. */
const resolvedFlags: Record<FeatureFlag, boolean> = {
  ...FLAG_DEFAULTS,
  ...parseFlagOverrides(env.NEXT_PUBLIC_FEATURE_FLAGS),
};

/**
 * The single read point for feature flags. Everything — components,
 * server code, future middleware — asks this function, never the
 * registry or env var directly. This is what makes the Milestone 7
 * migration to database-backed flags a change to one file.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return resolvedFlags[flag];
}

/** Snapshot of all resolved flags — useful for a future admin/debug view. */
export function getAllFlags(): Readonly<Record<FeatureFlag, boolean>> {
  return { ...resolvedFlags };
}
