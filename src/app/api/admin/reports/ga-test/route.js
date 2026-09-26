import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { fetchGaReport } from "@/lib/reports/ga";
import { getMonthWindows } from "@/lib/reports/period";

export const runtime = "nodejs";

/**
 * GET /api/admin/reports/ga-test
 *
 * Admin-gated debug route that returns GA4 data for the last 30 days vs
 * the prior 30 days.  Used to sanity-check GA4 credentials before the
 * full monthly report is wired.
 */
export async function GET() {
  // Auth check — must be admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = await createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Last 30 days vs prior 30
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  const start30 = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  const start60 = new Date(now.getTime() - 60 * 86400000).toISOString().split("T")[0];
  const end30 = new Date(now.getTime() - 31 * 86400000).toISOString().split("T")[0];

  const result = await fetchGaReport({
    curr: { start: start30, end },
    prev: { start: start60, end: end30 },
  });

  return NextResponse.json(result);
}
