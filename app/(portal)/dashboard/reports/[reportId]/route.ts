import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Serves a published client report (client_reports) BYTE-FOR-BYTE as a
 * full HTML document. Auth model: must be signed in, and the row is
 * fetched with the AUTHENTICATED client — RLS decides visibility (own-org
 * members + internal staff). A user guessing another client's report id
 * gets the same 404 as a nonexistent one; nothing is reachable logged out.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const { reportId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/client-login", request.url));
  }

  if (!UUID_RE.test(reportId)) {
    return new NextResponse("Report not found.", { status: 404 });
  }

  const { data: report } = await supabase
    .from("client_reports")
    .select("html")
    .eq("id", reportId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!report) {
    return new NextResponse("Report not found.", { status: 404 });
  }

  return new NextResponse(report.html as string, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "private, no-store",
    },
  });
}
