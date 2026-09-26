import Mux from "@mux/mux-node";

// Initialize Mux with the API keys from our environment
const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET
});

/**
 * Takes a raw public .mp4 URL (like the one returned by HeyGen) 
 * and ingests it into Mux for HLS streaming.
 */
export async function createMuxAssetFromUrl(videoUrl, carId) {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
        throw new Error("Missing Mux environment variables.");
    }

    try {
        const asset = await mux.video.assets.create({
            input: videoUrl,
            playback_policy: ["public"],
            // Static MP4 rendition — required for Facebook/Instagram video publishing (they don't accept HLS/m3u8)
            mp4_support: "capped-1080p",
            passthrough: `car_id_${carId}`
        });

        // The asset immediately generates a playback ID even while it is "preparing"
        // This is the string we will save to our Supabase database.
        const playbackId = asset.playback_ids && asset.playback_ids.length > 0
            ? asset.playback_ids[0].id
            : null;

        return {
            assetId: asset.id,
            playbackId: playbackId,
            status: asset.status
        };
    } catch (error) {
        console.error("Error creating Mux Asset:", error);
        throw error;
    }
}

/**
 * Enable static MP4 rendition on an existing asset (required for Facebook/Instagram publishing).
 * Takes a playback ID, looks up the asset, and enables MP4 support if not already on.
 */
export async function enableMp4SupportByPlaybackId(playbackId) {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
        throw new Error("Missing Mux environment variables.");
    }
    const auth = Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString("base64");

    // Look up asset ID from playback ID
    const playbackRes = await fetch(`https://api.mux.com/video/v1/playback-ids/${playbackId}`, {
        headers: { Authorization: `Basic ${auth}` },
    });
    if (!playbackRes.ok) {
        throw new Error(`${playbackRes.status} ${await playbackRes.text()}`);
    }
    const playbackData = await playbackRes.json();
    const assetId = playbackData.data?.object?.id;
    if (!assetId) throw new Error("Could not resolve asset ID from playback ID");

    // Fetch current asset to see if mp4_support is already on
    const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
        headers: { Authorization: `Basic ${auth}` },
    });
    const assetData = await assetRes.json();
    const currentSupport = assetData.data?.mp4_support;
    if (currentSupport && currentSupport !== "none") {
        return { assetId, mp4Support: currentSupport, skipped: true };
    }

    // Enable mp4 support
    const updateRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}/mp4-support`, {
        method: "PUT",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ mp4_support: "capped-1080p" }),
    });
    if (!updateRes.ok) {
        throw new Error(`Failed to enable MP4: ${updateRes.status} ${await updateRes.text()}`);
    }
    return { assetId, mp4Support: "capped-1080p", skipped: false };
}
