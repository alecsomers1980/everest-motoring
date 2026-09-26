import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { renderReportPdf } from "@/lib/reports/build";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/admin/reports/monthly?month=YYYY-MM
 *
 * Admin-gated. Returns the branded PDF for the given month.
 */
export async function GET(request) {
  // Auth
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

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;

  try {
    const { buffer, filename } = await renderReportPdf(month);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/admin/reports/monthly] PDF render failed:", err);
    return NextResponse.json(
      { error: err.message || "PDF generation failed" },
      { status: 500 }
    );
  }
}
