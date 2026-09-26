import { createAdminClient } from "@/utils/supabase/server";
import { enableDownloads, getMp4Url } from "@/utils/ai/cloudflareStreamService";

// Cloudflare's own download URL always ends in "default.mp4" and a redirect
// or cross-origin link can't rename it, so we proxy the file through our own
// origin and set the filename ourselves. Model names can contain "/" (e.g.
// "Land Cruiser 79 4.2D P/U S/C"), so anything non-alphanumeric collapses to
// a single hyphen.
function buildVideoFilename(car) {
    const safe = `${car.year} ${car.make} ${car.model}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return `${safe}.mp4`;
}

export async function GET(request, { params }) {
    const { carId } = await params;
    const { searchParams } = new URL(request.url);
    const wantsRedirect = searchParams.get("redirect") === "1";

    const supabase = await createAdminClient();
    const { data: car, error } = await supabase
        .from("cars")
        .select("id, make, model, year, video_url")
        .eq("id", carId)
        .single();

    if (error || !car) {
        return wantsRedirect
            ? new Response("Car not found", { status: 404 })
            : Response.json({ ready: false, error: "Car not found" }, { status: 404 });
    }

    if (typeof car.video_url !== "string" || !car.video_url.startsWith("cf:")) {
        const message = "No video available for this vehicle yet";
        return wantsRedirect
            ? new Response(message, { status: 404 })
            : Response.json({ ready: false, error: message });
    }

    const uid = car.video_url.slice(3);

    try {
        await enableDownloads(uid);
        const mp4Url = getMp4Url(uid);

        if (!wantsRedirect) {
            // Point at our own proxy below, not Cloudflare's URL directly, so
            // the on-site "Download MP4" button also gets the right filename.
            return Response.json({ ready: true, url: `/api/affiliate/video-download/${carId}?redirect=1` });
        }

        const cfResponse = await fetch(mp4Url);
        if (!cfResponse.ok || !cfResponse.body) {
            return new Response("Video not ready", { status: 502 });
        }
        const headers = new Headers({
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${buildVideoFilename(car)}"`,
        });
        const length = cfResponse.headers.get("content-length");
        if (length) headers.set("Content-Length", length);
        return new Response(cfResponse.body, { headers });
    } catch (err) {
        return wantsRedirect
            ? new Response(`Video not ready: ${err.message}`, { status: 500 })
            : Response.json({ ready: false, error: err.message }, { status: 500 });
    }
}
