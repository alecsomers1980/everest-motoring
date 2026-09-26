import { createClient, createAdminClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getMonthWindows } from "@/lib/reports/period";
import ReportDownloadClient from "./ReportDownloadClient";

export const metadata = {
  title: "Monthly Reports | Everest Motoring Admin",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/login");

  const supabaseAdmin = await createAdminClient();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return redirect("/login?error=You+must+be+logged+in+as+an+Admin+to+access+this+dashboard.");
  }

  // Generate the last 12 months for the selector
  const monthOptions = [];
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === "year").value);
  const m = Number(parts.find((p) => p.type === "month").value);

  for (let i = 0; i < 12; i++) {
    const target = new Date(y, m - 1 - i, 1);
    const year = target.getFullYear();
    const month = target.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;
    const label = target.toLocaleDateString("en-ZA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "long",
    });
    monthOptions.push({ value, label });
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight text-black">
          Monthly <span className="italic">Reports</span>
        </h1>
        <p className="text-slate-400 mt-1 font-medium">
          Download branded PDF performance reports covering website traffic, activity, emails, and social media.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <ReportDownloadClient monthOptions={monthOptions} />
      </div>
    </div>
  );
}
