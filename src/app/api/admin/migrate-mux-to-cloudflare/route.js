import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { enableMp4SupportByPlaybackId } from "@/utils/ai/muxService";
import { createStreamFromUrl, getStreamStatus, enableDownloads } from "@/utils/ai/cloudflareStreamService";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes on Vercel Pro; adjust as needed

/**
 * Migrate all Mux-hosted car videos to Cloudflare Stream.
 * For each car with video_url starting "mux:":
 *   1. Ensure Mux MP4 support is enabled
 *   2. Pull MP4 into Cloudflare Stream via copy-from-URL
 *   3. Wait for Cloudflare to finish processing
 *   4. Enable MP4 downloads (for social publishing)
 *   5. Update video_url to "cf:{uid}"
 * Safe to re-run: cars with video_url already "cf:..." are skipped.
 */
export async function POST(req) {
    const secret = req.headers.get("x-admin-secret");
    if (!process.env.ADMIN_BACKFILL_SECRET || secret !== process.env.ADMIN_BACKFILL_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: cars, error } = await supabase
        .from("cars")
        .select("id, video_url, make, model, year")
        .like("video_url", "mux:%");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const results = [];

    for (const car of cars || []) {
        const playbackId = car.video_url.replace("mux:", "");
        const result = { carId: car.id, label: `${car.year} ${car.make} ${car.model}`, playbackId };

        try {
            // 1. Ensure Mux MP4 is enabled (so the URL we hand to Cloudflare resolves)
            const mp4Result = await enableMp4SupportByPlaybackId(playbackId);
            result.mp4Support = mp4Result;

            // Give Mux time to render the static MP4 (fresh enable can take 30-90s)
            // Skip wait if MP4 was already enabled
            if (!mp4Result.skipped) {
                await new Promise(r => setTimeout(r, 45000));
            }

            const muxMp4 = `https://stream.mux.com/${playbackId}/capped-1080p.mp4`;

            // 2. Start Cloudflare copy
            const cf = await createStreamFromUrl(muxMp4, {
                source: "mux-migration",
                car_id: car.id,
                original_mux_playback_id: playbackId,
            });
            result.cloudflareUid = cf.uid;

            // 3. Poll for readiness (timeout 90s per video)
            const start = Date.now();
            let ready = false;
            while (Date.now() - start < 90000) {
                const status = await getStreamStatus(cf.uid);
                if (status.readyToStream) { ready = true; break; }
                if (status.state === "error") {
                    throw new Error(`Cloudflare processing failed for ${cf.uid}`);
                }
                await new Promise(r => setTimeout(r, 4000));
            }

            if (!ready) {
                result.status = "pending";
                result.note = "Still processing on Cloudflare — re-run this endpoint later to finalize.";
                results.push(result);
                continue;
            }

            // 4. Enable MP4 downloads
            try {
                await enableDownloads(cf.uid);
            } catch (e) {
                result.downloadWarning = e.message;
            }

            // 5. Swap DB pointer
            await supabase
                .from("cars")
                .update({ video_url: `cf:${cf.uid}` })
                .eq("id", car.id);

            result.status = "migrated";
            results.push(result);
        } catch (err) {
            result.status = "error";
            result.error = err.message;
            results.push(result);
        }
    }

    return NextResponse.json({
        total: results.length,
        migrated: results.filter(r => r.status === "migrated").length,
        pending: results.filter(r => r.status === "pending").length,
        errors: results.filter(r => r.status === "error").length,
        results,
    });
}
