"use server";

// NOTE: maxDuration cannot be exported from a "use server" module (Next.js
// requires every export to be an async function). The timeout for these
// Server Actions is configured on the admin layout instead:
// src/app/admin/layout.js → export const maxDuration = 300.

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { generateVehicleScript, optimizeVehicleDescription, buildFallbackDescription } from "@/utils/ai/scriptGenerator";
import * as veoEngine from "@/utils/ai/videoEngineProvider";
import * as seedanceEngine from "@/utils/ai/seedanceVideoEngine";
import { synthesizeVoiceover } from "@/utils/ai/elevenLabsService";
import { muxAudioOntoVideo } from "@/utils/ai/videoAudioMuxer";
import { stitchVideosWithFal } from "@/utils/ai/videoStitchingService";
import { createMuxAssetFromUrl } from "@/utils/ai/muxService";
import { createStreamFromUrl, enableDownloads } from "@/utils/ai/cloudflareStreamService";
import { composeSceneOneImage } from "@/utils/ai/nanoBananaService";
import { estimateSpokenMs, CLIP_DURATION_MS, VOICEOVER_BUDGET_MS } from "@/utils/ai/voiceoverDuration";
import { revalidatePath } from "next/cache";
import { sendVideoApprovalEmail } from "@/utils/video/approvalEmail";
import { applyVideoDecision } from "@/utils/video/decision";

// Pipeline selector. "seedance" = new Seedance 2 Pro (silent) + ElevenLabs SA
// voice + Fal mux. "veo" = legacy Veo 3.1 Fast with native audio. Default to
// seedance; set VIDEO_ENGINE=veo in env to revert to backup without a deploy.
function getEngine() {
    const choice = (process.env.VIDEO_ENGINE || 'seedance').toLowerCase();
    return choice === 'veo' ? veoEngine : seedanceEngine;
}

// 1. Mark as Pending (Called by VehicleForm on Submit)
export async function queueAiWalkaround(carId) {
    try {
        const supabase = await createAdminClient();
        await supabase.from('cars').update({
            video_url: 'ai_pending',
            ai_progress_at: null
        }).eq('id', carId);
        revalidatePath("/admin/inventory");
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Fetch next pending car (for queue manager)
export async function getNextPendingAiCarAction() {
    try {
        const supabase = await createAdminClient();
        const { data, error } = await supabase
            .from('cars')
            .select('*')
            .eq('video_url', 'ai_pending')
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        if (error || !data) return null;
        return data;

    } catch (e) {
        return null;
    }
}

// 2. Generate Script
export async function generateScriptAction(carId, carPayload) {
    try {
        const supabase = await createAdminClient();
        await supabase.from('cars').update({ video_url: 'ai_processing' }).eq('id', carId);

        console.log('[AI Server Action] Generating visual scene script via Gemini...');
        const scriptArray = await generateVehicleScript(carPayload);

        await supabase.from('cars').update({ video_url: 'ai_rendering_clips' }).eq('id', carId);
        return { success: true, scriptArray };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 3a. Pre-flight image URLs and return the 4 scene images. Runs the
// HEAD/GET checks server-side so a broken image bucket never causes a
// Kie.ai charge.
export async function preflightSceneImagesAction(carPayload) {
    try {
        const engine = getEngine();
        const sceneImages = await engine.preflightAndGetSceneImages(carPayload);
        return { success: true, sceneImages };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 3b. Start ONE scene's video clip on whichever engine is active.
// Designed to be called sequentially from the client — start scene 1,
// poll till done, then start scene 2. Caps a failure cost at one scene's
// worth of spend instead of all four.
export async function startSingleClipAction(scene, baseImageUrl) {
    try {
        const engine = getEngine();
        const task = await engine.startSingleClip(scene, baseImageUrl);
        return { success: true, task };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 4. Poll a single video task by id. Returns { isComplete, videoUrl } when
// done, { isComplete: false } while still processing, or { error } if the
// engine marked it failed.
//
// For the Seedance pipeline, once the silent clip is ready we ALSO
// generate the ElevenLabs voiceover and mux it onto the video inside this
// action — so the URL returned is already a sounded mp4 ready for
// stitching. Callers pass `voiceoverText`, `carId`, and `sceneNum` so the
// per-scene audio is generated against the right line and stored under a
// debuggable filename. These extra args are ignored by the Veo backup path.
export async function pollSingleClipAction(taskId, voiceoverText = null, carId = null, sceneNum = null) {
    try {
        const engine = getEngine();
        const result = await engine.pollCinematicTask(taskId);
        if (result.error) {
            return { success: false, error: result.error };
        }
        if (!result.isComplete || !result.videoUrl) {
            return { success: true, isComplete: false, videoUrl: null };
        }

        const usingSeedance = (process.env.VIDEO_ENGINE || 'seedance').toLowerCase() !== 'veo';

        // Veo path: native audio is baked in — return the URL as-is.
        if (!usingSeedance) {
            return { success: true, isComplete: true, videoUrl: result.videoUrl };
        }

        // Seedance path: clip is silent. Generate ElevenLabs voiceover and
        // mux it onto the video before handing the URL to the stitcher.
        // If voiceoverText is missing, skip muxing and return the silent
        // clip (Veo backup behaviour) so the pipeline still completes
        // rather than throwing — UI will show a sounded car video with
        // one silent scene if this happens, which is recoverable.
        if (!voiceoverText || !String(voiceoverText).trim()) {
            console.warn(`[poll] Scene ${sceneNum ?? '?'} completed but no voiceover_text supplied — returning silent clip.`);
            return { success: true, isComplete: true, videoUrl: result.videoUrl };
        }

        const { audioUrl, durationMs: actualAudioMs } = await synthesizeVoiceover({
            text: voiceoverText,
            carId,
            sceneNum,
        });

        // The synthesized mp3 includes ~3s of trailing silence (SSML break),
        // so it's reliably 7-8s long. Declaring audio.duration = clip length
        // makes Fal compose truncate the trailing silence at exactly 8s
        // rather than pad a gap with the held last voice sample.
        const VIDEO_MS = 8000;
        const muxedUrl = await muxAudioOntoVideo({
            videoUrl: result.videoUrl,
            audioUrl,
            videoDurationMs: VIDEO_MS,
            audioDurationMs: VIDEO_MS,
        });
        if (actualAudioMs && actualAudioMs < VIDEO_MS) {
            console.warn(`[poll] Scene ${sceneNum ?? '?'} mp3 was only ${actualAudioMs}ms (< ${VIDEO_MS}ms clip). SSML break may not have applied — voice may sound stuck at the end.`);
        }

        return { success: true, isComplete: true, videoUrl: muxedUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 5. Stitch Video
export async function stitchVideoAction(carId, clipUrls) {
    try {
        const supabase = await createAdminClient();
        await supabase.from('cars').update({ video_url: 'ai_stitching_video' }).eq('id', carId);

        console.log('[AI Server Action] Sending clips to Fal.ai for stitching...');
        const finalStitchedUrl = await stitchVideosWithFal(clipUrls);

        await supabase.from('cars').update({ video_url: 'cf_ingesting' }).eq('id', carId);
        return { success: true, finalStitchedUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 6. Ingest Cloudflare Stream
export async function ingestMuxAction(carId, finalStitchedUrl) {
    try {
        console.log('[AI Server Action] Ingesting final stitched video into Cloudflare Stream...');
        const cfData = await createStreamFromUrl(finalStitchedUrl, { car_id: carId });
        await enableDownloads(cfData.uid);

        const supabase = await createAdminClient();
        await supabase.from('cars').update({
            video_url: `cf:${cfData.uid}`
        }).eq('id', carId);

        revalidatePath("/admin/inventory");
        revalidatePath("/inventory");
        return { success: true, cloudflareUid: cfData.uid };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// 7. Mark Error State (called by browser if pipeline fails)
export async function markVideoErrorAction(carId, errorMessage) {
    try {
        const supabase = await createAdminClient();
        await supabase.from('cars').update({
            video_url: 'error: ' + (errorMessage || 'Unknown processing failure')
        }).eq('id', carId);
        revalidatePath("/admin/inventory");
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

// Check status is no longer heavily needed since the pipeline is awaited entirely in the background,
// but we keep a structural mock that checks the database for UI polling.
export async function checkHeyGenVideoStatus(carId) {
    try {
        const supabase = await createAdminClient();
        const { data } = await supabase.from('cars').select('video_url').eq('id', carId).single();

        if (!data || !data.video_url) return { status: 'failed', error: 'No video requested.' };

        if (data.video_url.startsWith('error: ')) {
            return { status: 'failed', error: data.video_url.replace('error: ', '') };
        }

        if (data.video_url.startsWith('mux:') || data.video_url.startsWith('cf:')) {
            return { status: 'ready', id: data.video_url.split(':')[1] };
        }

        if (data.video_url.startsWith('ai_') || data.video_url === 'mux_ingesting' || data.video_url === 'cf_ingesting') {
            // Let the UI know what specific phase we are in
            return { status: 'processing', phase: data.video_url };
        }

        return { status: 'failed', error: 'Unknown state' };

    } catch (err) {
        return { status: 'error' };
    }
}

// Composite the uploaded scene-1 photo onto the branded background via Nano Banana,
// upload the result to Supabase storage, and return its public URL.
// On any failure, returns the original URL so the listing still ships.
export async function composeSceneOneAction(originalCarImageUrl) {
    if (!originalCarImageUrl) {
        return { success: false, error: "No source image URL provided", url: null };
    }

    try {
        console.log("[Scene 1 Compose] Starting Nano Banana composite...");
        const { base64, mimeType } = await composeSceneOneImage(originalCarImageUrl);
        const buffer = Buffer.from(base64, "base64");

        const supabase = await createAdminClient();
        const ext = (mimeType.split("/")[1] || "png").split(";")[0];
        const fileName = `vehicles/scene1-composed-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from("vehicles")
            .upload(fileName, buffer, { contentType: mimeType });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("vehicles").getPublicUrl(fileName);
        console.log("[Scene 1 Compose] Composited image stored:", data.publicUrl);
        return { success: true, url: data.publicUrl };
    } catch (err) {
        console.error("[Scene 1 Compose] Failed — falling back to original image:", err.message);
        return { success: false, error: err.message, url: originalCarImageUrl };
    }
}

/**
 * Queue a partial regeneration of the AI walkaround video for the given car —
 * only the scenes in `sceneNumbers` (e.g. [1, 3]) are re-rendered, then the
 * pipeline re-stitches with the updated clips. Saves credits vs a full redo
 * (~$1.55/scene vs ~$5.60 for all four). The cron route's new
 * "ai_redoing_scenes" phase picks this up on the next tick and runs the
 * redo loop, then hands off to the existing stitch + ingest phases. After
 * a successful new ingest, the previously-live Cloudflare Stream entry is
 * deleted automatically so we don't orphan storage.
 */
export async function requestSceneRegenerationAction(carId, sceneNumbers) {
    // Defensive input validation.
    if (!Array.isArray(sceneNumbers) || sceneNumbers.length === 0) {
        return { success: false, error: "Invalid scene numbers" };
    }
    const seen = new Set();
    for (const n of sceneNumbers) {
        if (!Number.isInteger(n) || n < 1 || n > 4 || seen.has(n)) {
            return { success: false, error: "Invalid scene numbers" };
        }
        seen.add(n);
    }

    try {
        const supabase = await createAdminClient();
        const { data: car, error: fetchErr } = await supabase
            .from("cars")
            .select("id, video_url, ai_pipeline_state")
            .eq("id", carId)
            .limit(1)
            .single();
        if (fetchErr || !car) {
            return { success: false, error: "Car not found" };
        }

        const state = car.ai_pipeline_state;
        const isValid =
            typeof car.video_url === "string" &&
            car.video_url.startsWith("cf:") &&
            state &&
            Array.isArray(state.script) && state.script.length === 4 &&
            Array.isArray(state.images) && state.images.length === 4 &&
            Array.isArray(state.scenes) && state.scenes.length === 4 &&
            state.scenes.every(s => s && typeof s.muxed_url === "string" && s.muxed_url.length > 0);
        if (!isValid) {
            return { success: false, error: "Car must be in cf:<uid> state with a complete pipeline state to redo scenes" };
        }

        // Deep-clone the state so we don't mutate the original by accident.
        let nextState;
        try {
            nextState = typeof structuredClone === "function"
                ? structuredClone(state)
                : JSON.parse(JSON.stringify(state));
        } catch (e) {
            return { success: false, error: "Pipeline state is malformed" };
        }

        // Clear task_id + muxed_url for each scene the caller wants redone, so
        // the cron's redo phase starts fresh on those scenes.
        for (const n of sceneNumbers) {
            const entry = nextState.scenes.find(s => s.scene === n);
            if (!entry) {
                return { success: false, error: `Scene ${n} not present in pipeline state` };
            }
            delete entry.task_id;
            delete entry.muxed_url;
        }
        nextState.redo_scenes = [...sceneNumbers].sort((a, b) => a - b);
        nextState.previous_cf_uid = car.video_url.slice(3);

        const { error: updateErr } = await supabase
            .from("cars")
            .update({
                video_url: "ai_redoing_scenes",
                ai_pipeline_state: nextState,
                ai_progress_at: null,
            })
            .eq("id", carId);
        if (updateErr) {
            return { success: false, error: updateErr.message };
        }

        revalidatePath("/admin/inventory");
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message || "Unknown error" };
    }
}

/**
 * Queue an AUDIO-ONLY redo of the given scenes — re-runs the ElevenLabs
 * voiceover and re-muxes it onto the EXISTING silent video clip, so no Veo/Kie
 * video credits are spent. Costs only ElevenLabs characters + a Fal mux per
 * scene, plus one re-stitch and re-ingest. Requires each selected scene to have
 * a saved `clip_url` (the silent Veo output); videos rendered before clip
 * persistence don't have it, so those must use a full scene redo once first.
 * The cron's "ai_redoing_audio" phase picks this up.
 */
export async function requestAudioRedoAction(carId, sceneNumbers) {
    if (!Array.isArray(sceneNumbers) || sceneNumbers.length === 0) {
        return { success: false, error: "Invalid scene numbers" };
    }
    const seen = new Set();
    for (const n of sceneNumbers) {
        if (!Number.isInteger(n) || n < 1 || n > 4 || seen.has(n)) {
            return { success: false, error: "Invalid scene numbers" };
        }
        seen.add(n);
    }

    try {
        const supabase = await createAdminClient();
        const { data: car, error: fetchErr } = await supabase
            .from("cars")
            .select("id, video_url, ai_pipeline_state")
            .eq("id", carId)
            .limit(1)
            .single();
        if (fetchErr || !car) {
            return { success: false, error: "Car not found" };
        }

        const state = car.ai_pipeline_state;
        const isValid =
            typeof car.video_url === "string" &&
            car.video_url.startsWith("cf:") &&
            state &&
            Array.isArray(state.script) && state.script.length === 4 &&
            Array.isArray(state.scenes) && state.scenes.length === 4 &&
            state.scenes.every(s => s && typeof s.muxed_url === "string" && s.muxed_url.length > 0);
        if (!isValid) {
            return { success: false, error: "Car must be in cf:<uid> state with a complete pipeline state to redo audio" };
        }

        // Audio-only redo needs the silent source clip for each selected scene.
        // Videos rendered before clip persistence won't have it.
        for (const n of sceneNumbers) {
            const entry = state.scenes.find(s => s.scene === n);
            if (!entry || !entry.clip_url) {
                return { success: false, error: `Scene ${n} has no saved silent clip, so its audio can't be redone on its own yet. Use "Regenerate selected" once — after that, audio redos are free.` };
            }
        }

        let nextState;
        try {
            nextState = typeof structuredClone === "function"
                ? structuredClone(state)
                : JSON.parse(JSON.stringify(state));
        } catch (e) {
            return { success: false, error: "Pipeline state is malformed" };
        }

        // Clear ONLY muxed_url for each selected scene — keep clip_url (the
        // silent video) so the cron re-voices onto the existing clip instead of
        // re-rendering it.
        for (const n of sceneNumbers) {
            const entry = nextState.scenes.find(s => s.scene === n);
            delete entry.muxed_url;
        }
        nextState.audio_redo_scenes = [...sceneNumbers].sort((a, b) => a - b);
        nextState.previous_cf_uid = car.video_url.slice(3);

        const { error: updateErr } = await supabase
            .from("cars")
            .update({
                video_url: "ai_redoing_audio",
                ai_pipeline_state: nextState,
                ai_progress_at: null,
            })
            .eq("id", carId);
        if (updateErr) {
            return { success: false, error: updateErr.message };
        }

        revalidatePath("/admin/inventory");
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message || "Unknown error" };
    }
}

/**
 * Read the four spoken lines for a car so the admin can edit them, along with
 * an estimate of how long each takes to say. Anything over the clip length is
 * cut off mid-sentence in the finished video, which is why the estimate is
 * surfaced in the UI rather than left as an invisible trap.
 */
export async function getSceneVoiceoversAction(carId) {
    try {
        const supabase = await createAdminClient();
        const { data: car, error } = await supabase
            .from("cars")
            .select("id, video_url, ai_pipeline_state")
            .eq("id", carId)
            .limit(1)
            .single();
        if (error || !car) return { success: false, error: "Car not found" };

        const state = car.ai_pipeline_state;
        if (!state || !Array.isArray(state.script) || state.script.length !== 4) {
            return { success: false, error: "This video has no editable script (it predates script persistence, or the render failed). Regenerate it once to get one." };
        }

        const scenes = state.script.map((s, i) => {
            const text = s?.voiceover_text || "";
            const entry = (state.scenes || []).find((x) => x.scene === i + 1);
            return {
                scene: i + 1,
                text,
                estimatedMs: estimateSpokenMs(text),
                canRedoAudio: Boolean(entry?.clip_url),
            };
        });

        return { success: true, scenes, clipMs: CLIP_DURATION_MS, budgetMs: VOICEOVER_BUDGET_MS };
    } catch (err) {
        return { success: false, error: err.message || "Unknown error" };
    }
}

/**
 * Save edited voiceover lines and queue an audio-only redo for the scenes that
 * actually changed. Re-voicing reuses each scene's stored silent clip, so this
 * costs no video credits — just ElevenLabs, one re-stitch and one re-ingest.
 *
 * `edits` is { [sceneNumber]: newText }. Scenes whose text is unchanged are
 * ignored, so we never pay to re-render something the user didn't touch.
 *
 * Only `voiceover_text` is rewritten; the stale line embedded in the AUDIO
 * block of `visual_prompt` is left alone because the Seedance engine strips
 * that block before rendering (seedanceVideoEngine.stripAudioBlock).
 */
export async function updateSceneVoiceoversAction(carId, edits) {
    if (!edits || typeof edits !== "object" || Array.isArray(edits)) {
        return { success: false, error: "Invalid edits" };
    }

    try {
        const supabase = await createAdminClient();
        const { data: car, error: fetchErr } = await supabase
            .from("cars")
            .select("id, video_url, ai_pipeline_state")
            .eq("id", carId)
            .limit(1)
            .single();
        if (fetchErr || !car) return { success: false, error: "Car not found" };

        const state = car.ai_pipeline_state;
        const isValid =
            typeof car.video_url === "string" &&
            car.video_url.startsWith("cf:") &&
            state &&
            Array.isArray(state.script) && state.script.length === 4 &&
            Array.isArray(state.scenes) && state.scenes.length === 4;
        if (!isValid) {
            return { success: false, error: "Car must have a finished video with a complete script to edit its voiceover" };
        }

        let nextState;
        try {
            nextState = typeof structuredClone === "function"
                ? structuredClone(state)
                : JSON.parse(JSON.stringify(state));
        } catch (e) {
            return { success: false, error: "Pipeline state is malformed" };
        }

        const changed = [];
        for (const [key, rawText] of Object.entries(edits)) {
            const n = Number(key);
            if (!Number.isInteger(n) || n < 1 || n > 4) {
                return { success: false, error: `Invalid scene number: ${key}` };
            }
            const text = String(rawText ?? "").trim();
            if (!text) return { success: false, error: `Scene ${n}'s voiceover can't be empty` };
            if (text.length > 300) return { success: false, error: `Scene ${n}'s voiceover is far too long` };

            if (text === (nextState.script[n - 1]?.voiceover_text || "").trim()) continue;

            const entry = nextState.scenes.find((s) => s.scene === n);
            if (!entry?.clip_url) {
                return { success: false, error: `Scene ${n} has no saved silent clip, so its audio can't be redone on its own. Use "Redo video" on that scene once — after that, voiceover edits are free.` };
            }

            nextState.script[n - 1].voiceover_text = text;
            delete entry.muxed_url;
            changed.push(n);
        }

        if (changed.length === 0) {
            return { success: false, error: "No changes to save" };
        }

        changed.sort((a, b) => a - b);
        nextState.audio_redo_scenes = changed;
        nextState.previous_cf_uid = car.video_url.slice(3);

        const { error: updateErr } = await supabase
            .from("cars")
            .update({
                video_url: "ai_redoing_audio",
                ai_pipeline_state: nextState,
                ai_progress_at: null,
            })
            .eq("id", carId);
        if (updateErr) return { success: false, error: updateErr.message };

        revalidatePath("/admin/inventory");
        return { success: true, scenes: changed };
    } catch (err) {
        return { success: false, error: err.message || "Unknown error" };
    }
}

export async function optimizeDescriptionAction(carPayload, manualDescription) {
    console.log("=========================================");
    console.log("[SERVER ACTION HIT] optimizeDescriptionAction invoked!");
    console.log("PAYLOAD RECEIVED:", JSON.stringify(carPayload).substring(0, 150) + "...");
    console.log("=========================================");
    try {
        const result = await optimizeVehicleDescription(carPayload, manualDescription);
        console.log("[SERVER ACTION] optimizeVehicleDescription returned successfully.");
        // Defensive: if both AI providers + the fallback somehow returned empty, still
        // give the listing a non-null description so the field never saves as null.
        if (!result || !String(result).trim()) {
            return buildFallbackDescription(carPayload, manualDescription);
        }
        return result;
    } catch (e) {
        console.error("Failed to optimize description in Server Action — using template fallback:", e);
        return buildFallbackDescription(carPayload, manualDescription);
    }
}

// Ask the approver to review a walkaround video. The cron pipeline calls the
// helper directly when a render finishes; this wrapper exists for a manually
// supplied video link, which never enters the pipeline.
export async function requestVideoApprovalAction(carId) {
    return sendVideoApprovalEmail(carId);
}

// Approve or reject a walkaround from the admin inventory table. The emailed
// link authorises itself with a signed token; this route authorises with the
// caller's admin session. Both funnel into applyVideoDecision.
export async function decideVideoFromAdminAction(carId, action) {
    if (action !== "approve" && action !== "reject") {
        return { success: false, error: "Unknown action." };
    }

    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const admin = await createAdminClient();
    const { data: profile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || profile.role !== "admin") {
        return { success: false, error: "Unauthorized" };
    }

    return applyVideoDecision(carId, action);
}
