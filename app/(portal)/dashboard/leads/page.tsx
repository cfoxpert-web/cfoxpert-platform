import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/cards/card";
import { isInternalStaff } from "@/lib/documents/queries";
import { getLeads } from "@/lib/review/leads";

/**
 * Staff-only leads list: every Business Health Check submission with its
 * score and contact details, newest first. The capture path persists
 * submissions (healthCheckPersistence flag); this is where analysts work
 * them. Non-staff see an honest empty state (RLS returns nothing anyway).
 */

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeadsPage() {
  const staff = await isInternalStaff();
  const leads = staff ? await getLeads() : [];

  if (!staff) {
    return (
      <DashboardLayout title="Leads">
        <div className="mx-auto max-w-2xl">
          <Card className="p-10 text-center">
            <p className="text-[14px] text-slate">
              This area is for CFOxpert analysts.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Leads">
      <div className="mx-auto max-w-4xl">
        <Card className="p-6">
          <h3 className="mb-1 font-display text-[16px] text-navy">
            Health-check leads
          </h3>
          <p className="mb-4 text-[12.5px] text-slate-light">
            Every Business Health Check submission from the website, newest
            first. Call the hot ones.
          </p>

          {leads.length === 0 ? (
            <p className="text-[13px] text-slate">
              No submissions yet. Leads appear here the moment someone
              completes the health check on the site.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-wide text-slate-light">
                    <th className="py-2 pr-4">Lead</th>
                    <th className="py-2 pr-4">Contact</th>
                    <th className="py-2 pr-4">Profile</th>
                    <th className="py-2 pr-4 text-right">Score</th>
                    <th className="py-2 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-line/60">
                      <td className="max-w-[200px] py-2.5 pr-4 align-top">
                        <div className="truncate text-[13px] font-medium text-ink">
                          {lead.name ?? "—"}
                        </div>
                        {lead.company && (
                          <div className="truncate text-[11px] text-slate-light">
                            {lead.company}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 align-top text-[12.5px] text-slate">
                        <div>{lead.email ?? "—"}</div>
                        <div>{lead.phone ?? ""}</div>
                      </td>
                      <td className="py-2.5 pr-4 align-top text-[12.5px] text-slate">
                        <div>{lead.turnoverBand ?? "—"}</div>
                        <div className="text-[11px] text-slate-light">
                          {lead.businessType ?? ""}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-right align-top">
                        {lead.score !== null ? (
                          <span className="rounded-pill bg-mist px-2.5 py-1 text-[12px] font-semibold text-navy">
                            {lead.score} · {lead.grade}
                          </span>
                        ) : (
                          <span className="text-[12px] text-slate-light">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-right align-top text-[12px] text-slate-light">
                        {formatDate(lead.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
