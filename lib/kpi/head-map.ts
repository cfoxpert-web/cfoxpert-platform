import { PROJECTION_HEADS, type ProjectionHead } from "../ingestion/head-classify";

/**
 * Amendment A7-a — the canonical head → KPI declaration.
 *
 * THE TYPE IS THE ENFORCEMENT. `Record<ProjectionHead, string>` is TOTAL:
 * add a head to PROJECTION_HEADS without mapping it here and the project
 * does not compile. Not a lint, not a test that someone can skip — a build
 * failure. Mapping every head is impossible to forget rather than merely
 * inadvisable.
 *
 * WHY THIS EXISTS AT ALL. `stockChange` was deliberately left out of the
 * first draft of migration 0023's seed, on the defensible reasoning that
 * stock movement has no published metric of its own. Unmapped heads fall
 * through to `unclassified`, so opening and closing stock were
 * SIMULTANEOUSLY counted as unclassified AND removed from cost of goods
 * sold. Gross profit broke and the unclassified figure was wrong, in the
 * same test run.
 *
 * That is the whole argument for loud omission in one example: had the
 * rollup dropped unmapped heads silently, gross profit would have been
 * wrong and nothing would have said so. The client would have seen a
 * better margin than they earn, and it would have looked entirely
 * plausible.
 *
 * The DATABASE remains authoritative at runtime — `head_kpi_map` is
 * versioned, and a period recomputes under the version stamped on its
 * values (ADR-018). This module is the declaration that migration 0023's
 * seed must agree with, and head-map.test.ts asserts that it does.
 */

/** The head_kpi_map version this file declares. */
export const HEAD_MAP_VERSION = 1;

export const HEAD_MAP_V1: Record<ProjectionHead, string> = {
  revenue: "revenue",
  // Opening stock + purchases − closing stock IS cost of goods sold; closing
  // stock is already carried negative as a contra. This is the accounting
  // identity, not a convenience mapping.
  stockChange: "cost_of_goods_sold",
  cogs: "cost_of_goods_sold",
  directExp: "direct_expenses",
  adminExp: "indirect_expenses",
  sellingExp: "selling_expenses",
  employee: "employee_cost",
  interest: "finance_cost",
  depreciation: "depreciation",
  otherIncome: "other_income",
  otherExp: "other_expenses",
};

/** Every head the classifier can emit. Re-exported so callers need one import. */
export const ALL_HEADS: readonly ProjectionHead[] = PROJECTION_HEADS;

/** The distinct KPI keys the rollup can produce, excluding the data-quality flag. */
export function mappedKpiKeys(
  map: Record<string, string> = HEAD_MAP_V1,
): string[] {
  return [...new Set(Object.values(map))].sort();
}
