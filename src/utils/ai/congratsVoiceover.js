/**
 * Adds a celebratory congratulations voiceover onto a finished (silent) sale
 * handover clip. Reuses the ElevenLabs TTS (with silence padding) + Fal mux
 * pipeline. Used for both the delivery-photo Pixel Build and the no-photo case
 * (Pixel Build built from the car's main image).
 */

import { synthesizeVoiceover } from "./elevenLabsService";
import { muxAudioOntoVideo } from "./videoAudioMuxer";

const CLIP_MS = 8000;

export async function addCongratsVoiceover(videoUrl, { fullName, carLabel, carId } = {}) {
    const name = (fullName || "").trim() || "friend";
    const line = `Congratulations ${name}, on your new ${carLabel || "vehicle"}. From all of us at Everest Motoring.`;

    const { audioUrl, durationMs } = await synthesizeVoiceover({
        text: line,
        carId: carId || "congrats",
        sceneNum: "congrats",
    });

    return muxAudioOntoVideo({
        videoUrl,
        audioUrl,
        videoDurationMs: CLIP_MS,
        audioDurationMs: durationMs,
    });
}
