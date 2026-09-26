/**
 * Cron-driven AI walkaround pipeline state machine.
 *
 * Vercel Cron hits this every minute. Each invocation picks up the OLDEST
 * car still in an `ai_*` / `cf_ingesting` state and advances it by EXACTLY
 * ONE phase boundary, then exits. Over multiple ticks the car progresses
 * to completion without any dependency on a browser tab staying open.
 *
 * Phases (tracked by cars.video_url):
 *   ai_pending        -> generate script + preflight images
 *   ai_rendering_clips -> per-scene render / poll / TTS+mux loop
 *   ai_stitching_video -> stitch the 4 muxed clips with Fal
 *   cf_ingesting      -> Cloudflare Stream copy + enableDownloads
 *   cf:<uid>          -> terminal: done
 *   error: <msg>      -> terminal: failed
 *
 * Per-tick progress state lives in cars.ai_pipeline_state (JSONB):
 *   { script, images, scenes:[{scene,task_id?,muxed_url?}], stitched_url? }
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/utils/supabase/server";
import { generateVehicleScript } from "@/utils/ai/scriptGenerator";
import * as veoEngine from "@/utils/ai/videoEngineProvider";
import * as seedanceEngine from "@/utils/ai/seedanceVideoEngine";
import { synthesizeVoiceover } from "@/utils/ai/elevenLabsService";
import { muxAudioOntoVideo } from "@/utils/ai/videoAudioMuxer";
import { stitchVideosWithFal } from "@/utils/ai/videoStitchingService";
import { createStreamFromUrl, enableDownloads, deleteStream } from "@/utils/ai/cloudflareStreamService";
import { sendVideoApprovalEmail } from "@/utils/video/approvalEmail";

export const runtime = "nodejs";
export const maxDuration = 300;

const CLIP_DURATION_MS = 8000;
const TOTAL_SCENES = 4;

// If a car makes no real progress for this long it's considered stuck (a crash
// mid-step or a dead render task) and is auto-failed so the queue can move on.
// Must comfortably exceed the longest legitimate single step (a scene's render
// poll window). Tunable without a redeploy via AI_STUCK_TIMEOUT_MIN.
const STUCK_TIMEOUT_MS = Number(process.env.AI_STUCK_TIMEOUT_MIN || 20) * 60 * 1000;
const IN_PROGRESS_STATES = [
    "ai_pending",
    "ai_processing",
    "ai_rendering_clips",
    "ai_redoing_scenes",
    "ai_redoing_audio",
    "ai_stitching_video",
    "cf_ingesting",
];

function getEngine() {
    const choice = (process.env.VIDEO_ENGINE || "seedance").toLowerCase();
    return choice === "veo" ? veoEngine : seedanceEngine;
}

function isAuthorized(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        // Allow local dev without the secret. Production requires it.
        return process.env.NODE_ENV !== "production";
    }
    const authHeader = request.headers.get("authorization") || "";
    return authHeader === `Bearer ${cronSecret}`;
}

async function pickNextCar(admin) {
    const { data, error } = await admin
        .from("cars")
        .select("*")
        .in("video_url", IN_PROGRESS_STATES)
        .order("created_at", { ascending: true })
        .limit(1);
    if (error) throw new Error(`pickNextCar: ${error.message}`);
    return data && data.length > 0 ? data[0] : null;
}

async function updateCar(admin, carId, patch) {
    // Every updateCar call represents real progress (the pending-poll ticks
    // return without calling this), so stamp the progress time here — that's
    // what the stuck-timeout check measures against.
    const { error } = await admin
        .from("cars")
        .update({ ...patch, ai_progress_at: new Date().toISOString() })
        .eq("id", carId);
    if (error) throw new Error(`updateCar: ${error.message}`);
}

export async function GET(request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let admin;
    try {
        admin = await createAdminClient();
    } catch (e) {
        return NextResponse.json({ error: `Supabase client failed: ${e.message}` }, { status: 500 });
    }

    const car = await pickNextCar(admin).catch((e) => ({ __error: e }));
    if (car && car.__error) {
        return NextResponse.json({ error: car.__error.message }, { status: 500 });
    }
    if (!car) {
        return NextResponse.json({ idle: true, advanced: null });
    }

    const carLabel = `${car.year || "?"} ${car.make || "?"} ${car.model || "?"}`.trim();
    const logPrefix = `[Cron Pipeline] ${car.id} (${carLabel}) phase=${car.video_url}:`;

    try {
        // Self-heal: a car that hasn't progressed past the timeout is stuck
        // (crashed mid-step or a render task that never returns). Fail it so the
        // queue moves on to the next car. New cars have a null ai_progress_at
        // (not yet touched) and are exempt until their first step stamps it.
        if (car.ai_progress_at) {
            const stuckMs = Date.now() - Date.parse(car.ai_progress_at);
            if (stuckMs > STUCK_TIMEOUT_MS) {
                const mins = Math.round(stuckMs / 60000);
                console.error(`${logPrefix} no progress for ${mins} min -> auto-failing to unblock the queue`);
                // Keep ai_pipeline_state (don't null it out) — it may hold
                // already-completed scene clips (muxed_url) and the stuck
                // task_id, both needed to diagnose the failure or do a cheap
                // partial redo instead of re-rendering all 4 scenes from scratch.
                await updateCar(admin, car.id, {
                    video_url: `error: timed out — no progress for ${mins} min (auto-failed to unblock the render queue)`,
                });
                revalidatePath("/admin/inventory");
                return NextResponse.json({ advanced: car.id, timed_out: true, stuck_minutes: mins });
            }
        }

        if (car.video_url === "ai_pending") {
            // Phase 1: script + preflight. Mark intermediate state first so a
            // concurrent tick can't double-enter.
            await updateCar(admin, car.id, { video_url: "ai_processing" });
            console.log(`${logPrefix} starting script + preflight`);

            const script = await generateVehicleScript(car);
            if (!Array.isArray(script) || script.length !== TOTAL_SCENES) {
                throw new Error(`generateVehicleScript returned ${Array.isArray(script) ? script.length : "non-array"} scenes; expected ${TOTAL_SCENES}.`);
            }

            const engine = getEngine();
            const images = await engine.preflightAndGetSceneImages(car);
            if (!Array.isArray(images) || images.length !== TOTAL_SCENES) {
                throw new Error(`preflightAndGetSceneImages returned ${Array.isArray(images) ? images.length : "non-array"} images; expected ${TOTAL_SCENES}.`);
            }

            const pipelineState = {
                script,
                images,
                scenes: [{ scene: 1 }],
            };
            await updateCar(admin, car.id, {
                video_url: "ai_rendering_clips",
                ai_pipeline_state: pipelineState,
            });
            console.log(`${logPrefix} -> ai_rendering_clips, scene 1 queued`);
            return NextResponse.json({
                advanced: car.id,
                phase: "ai_rendering_clips",
                started_scene: 1,
            });
        }

        if (car.video_url === "ai_processing") {
            // Brief intermediate between ai_pending and ai_rendering_clips. If a
            // tick re-enters here it means the previous tick is still running
            // phase 1 (or crashed mid-update). Skip so we don't double-process;
            // if the previous tick truly died, the next tick will see this and
            // we'll eventually transition forward when it completes — or a
            // human can reset the car via the inspect script.
            console.log(`${logPrefix} skipping in-flight intermediate`);
            return NextResponse.json({
                advanced: car.id,
                phase: "ai_processing",
                skipped: "in-flight intermediate",
            });
        }

        if (car.video_url === "ai_rendering_clips") {
            const state = car.ai_pipeline_state;
            if (!state || !Array.isArray(state.script) || !Array.isArray(state.images) || !Array.isArray(state.scenes) || state.scenes.length === 0) {
                throw new Error("Missing or malformed ai_pipeline_state on ai_rendering_clips car.");
            }

            const idx = state.scenes.length - 1;
            const current = state.scenes[idx];
            const sceneNum = current.scene;
            const scriptForScene = state.script[sceneNum - 1];
            const imageForScene = state.images[sceneNum - 1];

            if (!scriptForScene || !imageForScene) {
                throw new Error(`Pipeline state inconsistent: missing script or image for scene ${sceneNum}.`);
            }

            const engine = getEngine();

            if (!current.task_id) {
                // Sub-phase 2a: start the Seedance/Veo task.
                console.log(`${logPrefix} starting scene ${sceneNum}`);
                const { taskId } = await engine.startSingleClip(scriptForScene, imageForScene);
                current.task_id = taskId;
                await updateCar(admin, car.id, { ai_pipeline_state: state });
                console.log(`${logPrefix} scene ${sceneNum} taskId=${taskId}`);
                return NextResponse.json({
                    advanced: car.id,
                    started_scene: sceneNum,
                    task_id: taskId,
                });
            }

            if (!current.muxed_url) {
                // Sub-phase 2b: poll once. If still pending, exit and wait for
                // the next cron tick. If complete, do TTS + mux and advance.
                const poll = await engine.pollCinematicTask(current.task_id);
                if (poll && poll.error) {
                    throw new Error(`Scene ${sceneNum}: ${poll.error}`);
                }
                if (!poll || !poll.isComplete || !poll.videoUrl) {
                    console.log(`${logPrefix} polling scene ${sceneNum} (task ${current.task_id}) — still pending`);
                    return NextResponse.json({
                        advanced: car.id,
                        polling_scene: sceneNum,
                        pending: true,
                    });
                }

                console.log(`${logPrefix} scene ${sceneNum} ready, running TTS + mux`);
                const voiceoverText = scriptForScene.voiceover_text;
                const { audioUrl, durationMs: audioDurationMs } = await synthesizeVoiceover({
                    text: voiceoverText,
                    carId: car.id,
                    sceneNum,
                });
                const muxedUrl = await muxAudioOntoVideo({
                    videoUrl: poll.videoUrl,
                    audioUrl,
                    videoDurationMs: CLIP_DURATION_MS,
                    audioDurationMs,
                });
                // Persist the silent Veo clip URL so the voiceover can later be
                // redone (audio-only) without paying to re-render the video.
                current.clip_url = poll.videoUrl;
                current.muxed_url = muxedUrl;

                if (sceneNum < TOTAL_SCENES) {
                    state.scenes.push({ scene: sceneNum + 1 });
                    await updateCar(admin, car.id, { ai_pipeline_state: state });
                    console.log(`${logPrefix} scene ${sceneNum} muxed, queued scene ${sceneNum + 1}`);
                    return NextResponse.json({
                        advanced: car.id,
                        muxed_scene: sceneNum,
                        next_scene: sceneNum + 1,
                    });
                }

                // All 4 muxed — advance to stitch phase.
                await updateCar(admin, car.id, {
                    video_url: "ai_stitching_video",
                    ai_pipeline_state: state,
                });
                console.log(`${logPrefix} all scenes muxed -> ai_stitching_video`);
                return NextResponse.json({
                    advanced: car.id,
                    muxed_scene: sceneNum,
                    phase: "ai_stitching_video",
                });
            }

            // Defensive: current scene fully muxed but we never advanced. Push
            // the next scene placeholder so we don't stall here.
            if (sceneNum < TOTAL_SCENES) {
                state.scenes.push({ scene: sceneNum + 1 });
                await updateCar(admin, car.id, { ai_pipeline_state: state });
                console.log(`${logPrefix} defensive advance after stale muxed scene ${sceneNum}`);
                return NextResponse.json({
                    advanced: car.id,
                    defensive_advance_from: sceneNum,
                });
            }
            await updateCar(admin, car.id, {
                video_url: "ai_stitching_video",
                ai_pipeline_state: state,
            });
            return NextResponse.json({ advanced: car.id, phase: "ai_stitching_video" });
        }

        if (car.video_url === "ai_redoing_scenes") {
            // Per-scene partial regeneration. The server action
            // requestSceneRegenerationAction set this phase, listed which
            // scenes to redo in state.redo_scenes, and cleared task_id +
            // muxed_url for those scene entries inside state.scenes. We pop
            // them one-at-a-time, mirroring Phase 2's start/poll/TTS+mux
            // loop. When the redo queue empties we hand off to Phase 3
            // (existing stitching) which works unchanged because
            // state.scenes still holds all four muxed_url entries in scene
            // order — just with the redone ones replaced.
            const state = car.ai_pipeline_state;
            if (!state || !Array.isArray(state.script) || !Array.isArray(state.images) || !Array.isArray(state.scenes) || !Array.isArray(state.redo_scenes)) {
                throw new Error("Missing or malformed ai_pipeline_state on ai_redoing_scenes car.");
            }
            if (state.redo_scenes.length === 0) {
                // Nothing left to redo — advance straight to stitch.
                await updateCar(admin, car.id, {
                    video_url: "ai_stitching_video",
                    ai_pipeline_state: state,
                });
                console.log(`${logPrefix} redo queue empty -> ai_stitching_video`);
                return NextResponse.json({ advanced: car.id, phase: "ai_stitching_video" });
            }

            const sceneNum = state.redo_scenes[0];
            const entry = state.scenes.find((s) => s.scene === sceneNum);
            if (!entry) {
                throw new Error(`Redo queue references scene ${sceneNum} but it is not in state.scenes.`);
            }
            const scriptForScene = state.script[sceneNum - 1];
            const imageForScene = state.images[sceneNum - 1];
            if (!scriptForScene || !imageForScene) {
                throw new Error(`Pipeline state inconsistent: missing script or image for redo scene ${sceneNum}.`);
            }

            const engine = getEngine();

            if (!entry.task_id) {
                console.log(`${logPrefix} starting redo scene ${sceneNum}`);
                const { taskId } = await engine.startSingleClip(scriptForScene, imageForScene);
                entry.task_id = taskId;
                await updateCar(admin, car.id, { ai_pipeline_state: state });
                console.log(`${logPrefix} redo scene ${sceneNum} taskId=${taskId}`);
                return NextResponse.json({
                    advanced: car.id,
                    started_redo_scene: sceneNum,
                    task_id: taskId,
                });
            }

            if (!entry.muxed_url) {
                const poll = await engine.pollCinematicTask(entry.task_id);
                if (poll && poll.error) {
                    throw new Error(`Redo scene ${sceneNum}: ${poll.error}`);
                }
                if (!poll || !poll.isComplete || !poll.videoUrl) {
                    console.log(`${logPrefix} polling redo scene ${sceneNum} (task ${entry.task_id}) — still pending`);
                    return NextResponse.json({
                        advanced: car.id,
                        polling_redo_scene: sceneNum,
                        pending: true,
                    });
                }

                console.log(`${logPrefix} redo scene ${sceneNum} ready, running TTS + mux`);
                const voiceoverText = scriptForScene.voiceover_text;
                const { audioUrl, durationMs: audioDurationMs } = await synthesizeVoiceover({
                    text: voiceoverText,
                    carId: car.id,
                    sceneNum,
                });
                const muxedUrl = await muxAudioOntoVideo({
                    videoUrl: poll.videoUrl,
                    audioUrl,
                    videoDurationMs: CLIP_DURATION_MS,
                    audioDurationMs,
                });
                entry.clip_url = poll.videoUrl;
                entry.muxed_url = muxedUrl;

                // Pop the head of the redo queue. If more to go, save state
                // and wait for the next tick. If empty, advance to stitch.
                state.redo_scenes.shift();
                if (state.redo_scenes.length > 0) {
                    await updateCar(admin, car.id, { ai_pipeline_state: state });
                    console.log(`${logPrefix} redo scene ${sceneNum} muxed; next redo scene ${state.redo_scenes[0]}`);
                    return NextResponse.json({
                        advanced: car.id,
                        muxed_redo_scene: sceneNum,
                        next_redo_scene: state.redo_scenes[0],
                    });
                }

                await updateCar(admin, car.id, {
                    video_url: "ai_stitching_video",
                    ai_pipeline_state: state,
                });
                console.log(`${logPrefix} all redos done -> ai_stitching_video`);
                return NextResponse.json({
                    advanced: car.id,
                    muxed_redo_scene: sceneNum,
                    phase: "ai_stitching_video",
                });
            }

            // Defensive: head entry already muxed but still in the queue —
            // pop and re-enter on next tick.
            state.redo_scenes.shift();
            await updateCar(admin, car.id, { ai_pipeline_state: state });
            console.log(`${logPrefix} defensive: popped already-muxed redo scene ${sceneNum}`);
            return NextResponse.json({ advanced: car.id, defensive_pop: sceneNum });
        }

        if (car.video_url === "ai_redoing_audio") {
            // Audio-only redo: re-voice selected scenes WITHOUT re-rendering the
            // (expensive) video clip. requestAudioRedoAction listed the scenes in
            // state.audio_redo_scenes and cleared each one's muxed_url while
            // keeping its clip_url (the silent Veo clip). We re-run TTS + mux
            // onto that stored clip — zero Kie/Veo credits — then hand off to the
            // existing stitch + ingest phases. One scene per tick.
            const state = car.ai_pipeline_state;
            if (!state || !Array.isArray(state.script) || !Array.isArray(state.scenes) || !Array.isArray(state.audio_redo_scenes)) {
                throw new Error("Missing or malformed ai_pipeline_state on ai_redoing_audio car.");
            }
            if (state.audio_redo_scenes.length === 0) {
                await updateCar(admin, car.id, {
                    video_url: "ai_stitching_video",
                    ai_pipeline_state: state,
                });
                console.log(`${logPrefix} audio redo queue empty -> ai_stitching_video`);
                return NextResponse.json({ advanced: car.id, phase: "ai_stitching_video" });
            }

            const sceneNum = state.audio_redo_scenes[0];
            const entry = state.scenes.find((s) => s.scene === sceneNum);
            if (!entry) {
                throw new Error(`Audio redo queue references scene ${sceneNum} but it is not in state.scenes.`);
            }
            if (!entry.clip_url) {
                throw new Error(`Audio redo scene ${sceneNum} has no stored clip_url — cannot re-voice without the silent clip.`);
            }
            const scriptForScene = state.script[sceneNum - 1];
            if (!scriptForScene) {
                throw new Error(`Pipeline state inconsistent: missing script for audio redo scene ${sceneNum}.`);
            }

            console.log(`${logPrefix} audio redo scene ${sceneNum}: TTS + mux onto stored clip (no video gen)`);
            const { audioUrl, durationMs: audioDurationMs } = await synthesizeVoiceover({
                text: scriptForScene.voiceover_text,
                carId: car.id,
                sceneNum,
            });
            const muxedUrl = await muxAudioOntoVideo({
                videoUrl: entry.clip_url,
                audioUrl,
                videoDurationMs: CLIP_DURATION_MS,
                audioDurationMs,
            });
            entry.muxed_url = muxedUrl;

            state.audio_redo_scenes.shift();
            if (state.audio_redo_scenes.length > 0) {
                await updateCar(admin, car.id, { ai_pipeline_state: state });
                console.log(`${logPrefix} audio redo scene ${sceneNum} done; next ${state.audio_redo_scenes[0]}`);
                return NextResponse.json({
                    advanced: car.id,
                    audio_redone_scene: sceneNum,
                    next_audio_scene: state.audio_redo_scenes[0],
                });
            }

            await updateCar(admin, car.id, {
                video_url: "ai_stitching_video",
                ai_pipeline_state: state,
            });
            console.log(`${logPrefix} all audio redos done -> ai_stitching_video`);
            return NextResponse.json({
                advanced: car.id,
                audio_redone_scene: sceneNum,
                phase: "ai_stitching_video",
            });
        }

        if (car.video_url === "ai_stitching_video") {
            const state = car.ai_pipeline_state;
            if (!state || !Array.isArray(state.scenes) || state.scenes.length !== TOTAL_SCENES) {
                throw new Error("Cannot stitch — pipeline state missing or has wrong number of scenes.");
            }
            const clipUrls = state.scenes.map((s) => s.muxed_url);
            if (clipUrls.some((u) => !u)) {
                throw new Error("Cannot stitch — at least one scene has no muxed clip URL.");
            }
            console.log(`${logPrefix} stitching ${clipUrls.length} clips`);
            const stitchedUrl = await stitchVideosWithFal(clipUrls);
            state.stitched_url = stitchedUrl;
            await updateCar(admin, car.id, {
                video_url: "cf_ingesting",
                ai_pipeline_state: state,
            });
            console.log(`${logPrefix} stitched -> cf_ingesting`);
            return NextResponse.json({
                advanced: car.id,
                stitched: true,
                phase: "cf_ingesting",
            });
        }

        if (car.video_url === "cf_ingesting") {
            const state = car.ai_pipeline_state;
            if (!state || !state.stitched_url) {
                throw new Error("Cannot ingest — pipeline state missing stitched URL.");
            }
            console.log(`${logPrefix} ingesting ${state.stitched_url} to Cloudflare Stream`);
            const cfData = await createStreamFromUrl(state.stitched_url, { car_id: car.id });
            await enableDownloads(cfData.uid);

            // Persist scene state past completion so the user can later
            // partial-redo individual scenes (handled by phase
            // "ai_redoing_scenes" + requestSceneRegenerationAction). We keep
            // state.script / state.images / state.scenes[].muxed_url /
            // state.stitched_url, and clear the transient redo metadata.
            const persistedState = { ...state };
            delete persistedState.redo_scenes;
            delete persistedState.audio_redo_scenes;
            const previousCfUid = persistedState.previous_cf_uid;
            delete persistedState.previous_cf_uid;

            await updateCar(admin, car.id, {
                video_url: `cf:${cfData.uid}`,
                ai_pipeline_state: persistedState,
            });
            revalidatePath("/admin/inventory");
            revalidatePath("/inventory");
            console.log(`${logPrefix} complete -> cf:${cfData.uid}`);

            // The finished walkaround needs a human to approve it before its
            // reel + walkthrough posts are created. The claim inside is atomic,
            // so a repeat tick cannot send a second email.
            try {
                await sendVideoApprovalEmail(car.id);
            } catch (mailErr) {
                console.warn(`${logPrefix} approval email failed: ${mailErr.message}`);
            }

            // If this was a redo over an existing live video, delete the old
            // CF Stream entry so we don't orphan storage. Best-effort: a
            // cleanup failure must NOT mark this render as failed — the new
            // video is already live and the user should see success.
            if (previousCfUid && previousCfUid !== cfData.uid) {
                try {
                    const ok = await deleteStream(previousCfUid);
                    console.log(`${logPrefix} previous CF stream ${previousCfUid} deleted=${ok}`);
                } catch (cleanupErr) {
                    console.warn(`${logPrefix} previous CF stream ${previousCfUid} cleanup failed: ${cleanupErr.message}`);
                }
            }

            return NextResponse.json({
                advanced: car.id,
                completed: true,
                cf_uid: cfData.uid,
                replaced_cf_uid: previousCfUid || null,
            });
        }

        // Unrecognised in-progress state — shouldn't reach here given the
        // IN_PROGRESS_STATES filter, but bail safely.
        console.warn(`${logPrefix} unrecognised in-progress state`);
        return NextResponse.json({
            advanced: car.id,
            phase: car.video_url,
            skipped: "unrecognised state",
        });
    } catch (err) {
        const rawMsg = (err && err.message) || String(err);
        const errorMsg = rawMsg.length > 240 ? rawMsg.slice(0, 237) + "..." : rawMsg;
        console.error(`${logPrefix} FAILED: ${errorMsg}`);
        try {
            // Keep ai_pipeline_state — see comment on the stuck-timeout branch
            // above. A single scene erroring shouldn't destroy sibling scenes'
            // already-completed clips or the failing task_id.
            await updateCar(admin, car.id, {
                video_url: `error: ${errorMsg}`,
            });
            revalidatePath("/admin/inventory");
        } catch (writeErr) {
            console.error(`${logPrefix} could not record error to DB: ${writeErr.message}`);
        }
        return NextResponse.json({
            advanced: car.id,
            errored: true,
            error: errorMsg,
        }, { status: 200 });
    }
}
