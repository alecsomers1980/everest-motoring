export async function stitchVideosWithFal(videoUrls) {
    if (!process.env.FAL_KEY) {
        throw new Error("Missing FAL_KEY in environment variables.");
    }

    if (!videoUrls || videoUrls.length === 0) {
        throw new Error("No video URLs provided to stitcher.");
    }

    // Wrap with brand intro/outro when configured. Missing env vars are
    // tolerated (filtered out) so dev/test environments still work.
    const intro = process.env.EVEREST_INTRO_VIDEO_URL;
    const outro = process.env.EVEREST_OUTRO_VIDEO_URL;
    const finalUrls = [intro, ...videoUrls, outro].filter(Boolean);

    try {
        console.log(`[Stitching Service] Sending ${finalUrls.length} clips to Fal.ai FFMPEG (intro=${!!intro}, scenes=${videoUrls.length}, outro=${!!outro})...`);

        // We use the Fal.ai FFMPEG Merge Videos model
        // Documentation: fal.ai/models/fal-ai/ffmpeg-api/merge-videos
        const response = await fetch("https://fal.run/fal-ai/ffmpeg-api/merge-videos", {
            method: "POST",
            headers: {
                "Authorization": `Key ${process.env.FAL_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                video_urls: finalUrls
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Stitching Service] API Error:`, errText);
            throw new Error(`Fal.ai returned status ${response.status}`);
        }

        const data = await response.json();

        if (data && data.video && data.video.url) {
            console.log(`[Stitching Service] Videos stitched successfully: ${data.video.url}`);
            return data.video.url;
        } else {
            console.error(`[Stitching Service] Unexpected response format:`, data);
            throw new Error("Invalid stitching response payload.");
        }

    } catch (error) {
        console.error("Exception in stitchVideosWithFal:", error);
        throw error;
    }
}
