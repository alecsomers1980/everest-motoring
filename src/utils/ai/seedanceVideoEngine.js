/**
 * Seedance 2 Fast image-to-video wrapper for the 4-scene car walkaround.
 * Generates SILENT 720p 16:9 clips — audio is added downstream via
 * ElevenLabs TTS + Fal FFmpeg mux. 8s clips chosen as the known-good
 * Seedance Fast duration (~$5.60/car), with ~2.5–3s of natural trailing
 * silence per scene after the ~4–5s voiceover.
 *
 * The older Veo-based engine in videoEngineProvider.js is kept as a backup
 * (toggle via VIDEO_ENGINE env var in ai_actions.js).
 */

import { startSeedanceClip, pollSeedanceClip } from './seedanceService';
import { preflightAndGetSceneImages as preflightVeo } from './videoEngineProvider';

const SEEDANCE_MODEL = 'bytedance/seedance-2-fast';
const SEEDANCE_RESOLUTION = '720p';
// NOTE: Seedance Fast only accepts specific clip durations (5s and 10s are
// universally supported; 8s has worked in practice). 7s was rejected and
// silently stalled the pipeline, so we stay on the known-good 8s. If you
// want a shorter clip, test 5s explicitly rather than an arbitrary value.
const SEEDANCE_DURATION_SECONDS = 8;

// Motion directive appended to EVERY scene prompt. Earlier prompts told
// Seedance "this is a flat 2D photo, no camera movement at all" — but
// starving a video model of motion makes it invent some, which showed up as
// morphing and angle drift. Instead we give it one specific, bounded camera
// move (a slow forward push-in) plus hard fidelity guards. Appended here
// server-side so the exact wording is used verbatim on every clip rather
// than relying on the script model to paraphrase it consistently.
//
// Scene-aware: the rear cabin (scene 3) is a confined space with receding
// seat/belt geometry. A forward push-in there makes the model extrapolate
// depth it can't see and hallucinate (seats warp, angle drifts) — which is
// exactly what kept happening on scene 3 while the exterior (1) and dashboard
// (2) push-ins looked good. So scene 3 gets a near-locked camera instead.
const PUSH_IN_DIRECTIVE = 'MOVEMENT: Slow cinematic camera dolly forward, subtle push-in. Smooth and steady movement, completely static environment, absolute image fidelity, no morphing. Motion Value: Low (3/10).';
const LOCKED_DIRECTIVE = 'MOVEMENT: Locked, near-static camera — only a barely-perceptible drift. Absolutely NO push-in, NO dolly into the cabin, NO perspective change, NO angle swing. Completely static environment, absolute image fidelity, no morphing, no re-rendering of seats or belts. Motion Value: Very Low (1/10).';

function motionDirectiveForScene(sceneNum) {
    return sceneNum === 3 ? LOCKED_DIRECTIVE : PUSH_IN_DIRECTIVE;
}

// Reuse the Veo engine's preflight — the image-URL validation logic is
// identical regardless of which video engine consumes them.
export const preflightAndGetSceneImages = preflightVeo;

// Strip the "AUDIO: ..." section from a Veo-style visual_prompt so we
// don't waste Seedance prompt budget on instructions that don't apply
// to a silent clip. The voiceover is generated separately via ElevenLabs.
function stripAudioBlock(visualPrompt) {
    if (!visualPrompt || typeof visualPrompt !== 'string') return visualPrompt;
    const audioIdx = visualPrompt.indexOf('AUDIO:');
    if (audioIdx === -1) return visualPrompt.trim();
    return visualPrompt.slice(0, audioIdx).trim();
}

/**
 * Submit one scene to Seedance and return its taskId.
 *
 * Mirrors the shape of videoEngineProvider.startSingleClip so the queue
 * manager (VideoRenderManager.jsx) can be agnostic about which engine
 * is in use.
 */
export async function startSingleClip(scene, baseImageUrl) {
    const sceneNum = scene.scene;
    const silentPrompt = `${stripAudioBlock(scene.visual_prompt)} ${motionDirectiveForScene(sceneNum)}`;

    console.log(`[Seedance Engine] Submitting Scene ${sceneNum} (silent, ${SEEDANCE_MODEL}). Image: ${baseImageUrl}`);

    const { taskId } = await startSeedanceClip({
        imageUrl: baseImageUrl,
        prompt: silentPrompt,
        durationSeconds: SEEDANCE_DURATION_SECONDS,
        aspectRatio: '16:9',
        resolution: SEEDANCE_RESOLUTION,
        generateAudio: false,
        model: SEEDANCE_MODEL,
    });

    return { scene: sceneNum, taskId };
}

/**
 * Poll a Seedance task by id. Returns the same shape as the Veo poll
 * so callers don't need to branch: { isComplete, videoUrl } on success,
 * { isComplete: false } while pending, { isComplete: false, error } on
 * terminal failure.
 */
export async function pollCinematicTask(taskId) {
    return pollSeedanceClip(taskId);
}
