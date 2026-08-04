import { createClient } from "../supabase/server";

/** Published board reports for the viewer's org (RLS-scoped; no HTML here). */
export type ClientReportItem = {
  id: string;
  title: string;
  periodLabel: string | null;
  publishedAt: string;
};

export async function getClientReports(
  organizationId: string,
): Promise<ClientReportItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("client_reports")
    .select("id, title, period_label, published_at")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[reports] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    periodLabel: (r.period_label as string | null) ?? null,
    publishedAt: r.published_at as string,
  }));
}
