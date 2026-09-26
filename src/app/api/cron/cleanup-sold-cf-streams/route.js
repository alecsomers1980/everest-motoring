import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { deleteStreamFromVideoUrl } from "@/utils/ai/cloudflareStreamService";

export const runtime = "nodejs";
export const maxDuration = 300;

// A sold car stays visible on the public inventory for 7 days (matches the
// rule in src/app/inventory/page.js line 53). After that it disappears, so
// the CF Stream entry can safely be removed.
const VISIBILITY_DAYS = 7;

function isAuthorized(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return process.env.NODE_ENV !== "production";
    }
    const authHeader = request.headers.get("authorization") || "";
    return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const admin = await createAdminClient();
        const cutoff = new Date(Date.now() - VISIBILITY_DAYS * 24 * 60 * 60 * 1000).toISOString();

        // Fetch sold cars whose latest sale is older than the cutoff and that
        // still have a Cloudflare Stream video attached.
        const { data: cars, error } = await admin
            .from("cars")
            .select("id, year, make, model, video_url, sales(sold_at)")
            .eq("status", "sold")
            .like("video_url", "cf:%");

        if (error) throw error;

        const stale = (cars || []).filter((car) => {
            const soldAt = car.sales?.[0]?.sold_at;
            if (!soldAt) return false;
            return new Date(soldAt) < new Date(cutoff);
        });

        const results = [];
        for (const car of stale) {
            const ok = await deleteStreamFromVideoUrl(car.video_url);
            // Clear the column so the public detail page won't render a 404
            // <video> tag for the now-gone Stream entry.
            const { error: updateErr } = await admin
                .from("cars")
                .update({ video_url: null })
                .eq("id", car.id);
            results.push({
                carId: car.id,
                label: `${car.year} ${car.make} ${car.model}`,
                videoUrl: car.video_url,
                cfDeleted: ok,
                rowUpdated: !updateErr,
                rowError: updateErr?.message || null,
            });
        }

        return NextResponse.json({
            success: true,
            cutoff,
            scanned: cars?.length || 0,
            cleanedUp: results.length,
            results,
        });
    } catch (err) {
        console.error("[cron/cleanup-sold-cf-streams] failed:", err);
        if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
            try {
                const Sentry = await import("@sentry/nextjs");
                Sentry.captureException(err, { tags: { cron: "cleanup-sold-cf-streams" } });
            } catch { /* sentry not installed */ }
        }
        return NextResponse.json(
            { success: false, error: err.message || "Cleanup failed" },
            { status: 500 }
        );
    }
}
