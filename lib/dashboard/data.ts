import { isFeatureEnabled } from "../feature-flags";
import { getKpiSnapshot, type KpiSnapshot } from "../kpi/queries";
import { createClient } from "../supabase/server";

/**
 * Milestone 11 — dashboard data provider. Server-side only.
 *
 * The seam command-center.tsx swaps onto: flag OFF (default) returns
 * null and the caller keeps rendering lib/mock-data/dashboard.ts
 * exactly as today; flag ON returns the real, RLS-scoped snapshot
 * computed by the KPI Engine (the single computation path — this file
 * contains NO KPI math and never will).
 */

export type DashboardData = {
  organizationId: string;
  organizationName: string;
  snapshot: KpiSnapshot | null; // null = org exists but no KPI periods yet
  healthScore: { score: number; grade: string } | null;
};

/**
 * Resolves the viewer's organization — the question the mock era never
 * had to answer. Deliberate v1 semantics: the user's single live
 * membership; if they have several (an analyst), the most recently
 * joined wins until an org switcher exists (future portal feature,
 * designed, not implied here).
 */
export async function getCurrentUserOrganization(): Promise<{
  id: string;
  name: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("organization_members")
    .select("organization_id, created_at, organizations ( id, name )")
    .eq("user_id", user.id) // REQUIRED: RLS shows teammates' membership
    // rows in shared orgs by design (team views), so visibility alone
    // must never drive resolution. Caught by live testing.
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  const org = Array.isArray(row?.organizations)
    ? row?.organizations[0]
    : row?.organizations;
  if (!org) return null;

  return { id: org.id as string, name: org.name as string };
}

export async function getDashboardData(): Promise<DashboardData | null> {
  if (!isFeatureEnabled("realDashboardData")) return null;

  const org = await getCurrentUserOrganization();
  if (!org) return null;

  const supabase = await createClient();
  const [snapshot, scoreRow] = await Promise.all([
    getKpiSnapshot(org.id),
    supabase
      .from("health_scores")
      .select("overall_score, grade")
      .order("computed_at", { ascending: false })
      .limit(1)
      .then(({ data }) => data?.[0] ?? null),
  ]);

  return {
    organizationId: org.id,
    organizationName: org.name,
    snapshot,
    healthScore: scoreRow
      ? { score: Number(scoreRow.overall_score), grade: scoreRow.grade as string }
      : null,
  };
}
