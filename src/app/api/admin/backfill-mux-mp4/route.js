import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { enableMp4SupportByPlaybackId } from "@/utils/ai/muxService";

export const dynamic = "force-dynamic";

// One-shot backfill: enable static MP4 rendition on all existing Mux assets
// so Facebook/Instagram can publish them.
export async function POST(req) {
    const supabase = await createClient();

    // Admin gate via env var — protects against abuse
    const secret = req.headers.get("x-admin-secret");
    if (!process.env.ADMIN_BACKFILL_SECRET || secret !== process.env.ADMIN_BACKFILL_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: cars, error } = await supabase
        .from("cars")
        .select("id, video_url")
        .like("video_url", "mux:%");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const results = [];
    for (const car of cars || []) {
        const playbackId = car.video_url.replace("mux:", "");
        try {
            const res = await enableMp4SupportByPlaybackId(playbackId);
            results.push({ carId: car.id, playbackId, ...res });
        } catch (err) {
            results.push({ carId: car.id, playbackId, error: err.message });
        }
    }

    return NextResponse.json({
        total: results.length,
        enabled: results.filter(r => r.skipped === false).length,
        alreadyOn: results.filter(r => r.skipped === true).length,
        errors: results.filter(r => r.error).length,
        results,
    });
}
