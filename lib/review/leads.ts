import { HEALTH_CHECK_QUESTIONS } from "@/constants/health-check-questions";
import { createClient } from "../supabase/server";

/**
 * Staff leads read path (health-check submissions). Authenticated client:
 * staff read policies on health_check_submissions/health_scores exist
 * since Milestone 9 — non-staff get zero rows, the page shows an honest
 * empty state.
 */

export type LeadListItem = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  submittedAt: string;
  score: number | null;
  grade: string | null;
  turnoverBand: string | null;
  businessType: string | null;
};

/** Reverse-map an answers-map score to its option label (scores are unique per question). */
function labelForAnswer(questionKey: string, value: unknown): string | null {
  if (typeof value !== "number") return null;
  const question = HEALTH_CHECK_QUESTIONS.find((q) => q.key === questionKey);
  if (!question || question.type !== "options") return null;
  return question.options.find((o) => o.score === value)?.label ?? null;
}

export async function getLeads(): Promise<LeadListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("health_check_submissions")
    .select(
      "id, submitted_name, submitted_email, submitted_phone, company_name, answers, created_at, health_scores ( overall_score, grade, computed_at )",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[leads] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const scores = Array.isArray(row.health_scores)
      ? row.health_scores
      : row.health_scores
        ? [row.health_scores]
        : [];
    const latest = [...scores].sort((a, b) =>
      String(b.computed_at ?? "").localeCompare(String(a.computed_at ?? "")),
    )[0];
    const answers =
      row.answers && typeof row.answers === "object"
        ? (row.answers as Record<string, unknown>)
        : {};

    return {
      id: row.id as string,
      name: (row.submitted_name as string | null) ?? null,
      email: (row.submitted_email as string | null) ?? null,
      phone: (row.submitted_phone as string | null) ?? null,
      company: (row.company_name as string | null) ?? null,
      submittedAt: row.created_at as string,
      score: latest ? Number(latest.overall_score) : null,
      grade: (latest?.grade as string | undefined) ?? null,
      turnoverBand: labelForAnswer("revenue", answers["revenue"]),
      businessType: labelForAnswer("biztype", answers["biztype"]),
    };
  });
}
