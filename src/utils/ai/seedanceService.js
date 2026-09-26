/**
 * Seedance 2 Fast (via kie.ai) image-to-video wrapper.
 * Used for post-sale handover clips: delivery photo -> 8-second cinematic video.
 */

const DEV_MOCK_MODE = false; // Set to true during local development to bypass real API calls and return mock data

const KIE_API_BASE = 'https://api.kie.ai/api/v1';
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 3000;

function getApiKey() {
    const key = process.env.KIE_API_KEY;
    if (!key && !DEV_MOCK_MODE) {
        throw new Error('KIE_API_KEY environment variable is required but not set');
    }
    return key;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startSeedanceClip({
    imageUrl,
    imageUrls = null,
    prompt,
    durationSeconds = 8,
    aspectRatio = '9:16',
    resolution = '720p',
    generateAudio = false,
    model = 'bytedance/seedance-2-fast'
}) {
    if (DEV_MOCK_MODE) {
        console.log(`[seedanceService] DEV_MOCK_MODE active — returning mock taskId`);
        return { taskId: `mock-seedance-${Date.now()}` };
    }

    const apiKey = getApiKey();

    const referenceImageUrls = Array.isArray(imageUrls) && imageUrls.length > 0 ? imageUrls : [imageUrl];

    const requestBody = {
        model,
        input: {
            prompt,
            reference_image_urls: referenceImageUrls,
            duration: durationSeconds,
            aspect_ratio: aspectRatio,
            resolution,
            generate_audio: generateAudio
        }
    };

    console.log(`[seedanceService] Starting Seedance clip with prompt: "${prompt.slice(0, 80)}..."`);

    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`[seedanceService] Attempt ${attempt}/${MAX_RETRIES} — POST createTask`);

            const response = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            console.log(`[seedanceService] createTask response status=${response.status} code=${data.code} msg=${data.msg}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${JSON.stringify(data)}`);
            }

            if (data.code !== 200) {
                const isHeavyLoad = (data.msg || '').toLowerCase().includes('under heavy load');
                if (isHeavyLoad) {
                    throw new Error(`Kie API under heavy load: ${data.msg}`);
                }
                throw new Error(`Kie API error code=${data.code} msg=${data.msg}`);
            }

            const taskId = data.data?.taskId;
            if (!taskId) {
                throw new Error(`No taskId returned in response: ${JSON.stringify(data)}`);
            }

            console.log(`[seedanceService] Successfully created task: ${taskId}`);
            return { taskId };
        } catch (err) {
            lastError = err;
            console.warn(`[seedanceService] Attempt ${attempt} failed: ${err.message}`);

            const isRetriable =
                err.message.includes('under heavy load') ||
                err.message.startsWith('HTTP 5') ||
                err.message.includes('Kie API error code=');

            if (attempt < MAX_RETRIES && isRetriable) {
                const delay = RETRY_BACKOFF_MS * attempt;
                console.log(`[seedanceService] Retrying in ${delay}ms...`);
                await sleep(delay);
            } else if (!isRetriable) {
                console.error(`[seedanceService] Non-retriable error, giving up immediately`);
                throw lastError;
            }
        }
    }

    console.error(`[seedanceService] All ${MAX_RETRIES} attempts exhausted`);
    throw lastError;
}

export async function pollSeedanceClip(taskId) {
    if (DEV_MOCK_MODE && taskId.startsWith('mock-seedance')) {
        console.log(`[seedanceService] DEV_MOCK_MODE active — returning mock completed result for ${taskId}`);
        return {
            isComplete: true,
            videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
        };
    }

    try {
        const apiKey = getApiKey();

        const response = await fetch(
            `${KIE_API_BASE}/jobs/recordInfo?taskId=${taskId}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${apiKey}`
                }
            }
        );

        const data = await response.json();
        console.log(`[seedanceService] recordInfo for ${taskId} — state=${data.data?.state}`);

        if (!response.ok) {
            console.warn(`[seedanceService] Non-OK response while polling ${taskId}: HTTP ${response.status}`);
            return { isComplete: false };
        }

        const taskData = data.data;
        const state = taskData?.state;

        if (state === 'success') {
            let videoUrl = null;
            try {
                const resultJson = JSON.parse(taskData.resultJson);
                videoUrl = resultJson.resultUrls?.[0] || null;
            } catch (parseErr) {
                console.warn(`[seedanceService] Failed to parse resultJson for ${taskId}: ${parseErr.message}`);
            }

            if (!videoUrl) {
                console.warn(`[seedanceService] No video URL found in result for ${taskId}`);
                return { isComplete: false };
            }

            console.log(`[seedanceService] Task ${taskId} complete — videoUrl=${videoUrl}`);
            return { isComplete: true, videoUrl };
        }

        if (state === 'fail') {
            // Surface every plausible failure field — Kie.ai is inconsistent
            // about where it puts the reason, and the generic "Bad Request"
            // message often hides specific details in failCode / resultJson /
            // info / response. Dump the whole task payload to logs so we can
            // diagnose without round-tripping through this code.
            console.error(`[seedanceService] Task ${taskId} failed. Full task payload:`, JSON.stringify(taskData));

            let failureReason = taskData.failMsg || taskData.failReason || taskData.errorMessage || taskData.errorMsg || taskData.error || taskData.msg;
            let failureCode = taskData.failCode || taskData.errorCode || taskData.code;

            if (!failureReason && taskData.resultJson) {
                try {
                    const parsed = typeof taskData.resultJson === 'string' ? JSON.parse(taskData.resultJson) : taskData.resultJson;
                    failureReason = parsed.error || parsed.errorMessage || parsed.failMsg || parsed.failReason || parsed.msg;
                    failureCode = failureCode || parsed.errorCode || parsed.failCode;
                } catch (e) { /* ignore parse errors */ }
            }

            for (const nestKey of ['info', 'response', 'data']) {
                if (!failureReason && taskData[nestKey] && typeof taskData[nestKey] === 'object') {
                    const nested = taskData[nestKey];
                    failureReason = nested.error || nested.errorMessage || nested.failMsg || nested.failReason || nested.msg;
                    failureCode = failureCode || nested.errorCode || nested.failCode;
                }
            }

            if (!failureReason) {
                failureReason = 'Generation failed (no reason surfaced — see [seedanceService] payload log above)';
            }

            const errorMsg = `Seedance failure [${failureCode || 'unknown'}]: ${failureReason}`;
            console.warn(`[seedanceService] Task ${taskId} failed: ${errorMsg}`);
            return { isComplete: false, error: errorMsg };
        }

        return { isComplete: false };
    } catch (err) {
        console.warn(`[seedanceService] Network/polling error for ${taskId}: ${err.message}`);
        return { isComplete: false };
    }
}

export const SEEDANCE_STYLE_PROMPTS = {
    dream_drive: `Cinematic 8-second horizontal sequence, 16:9 landscape framing. Seconds 0-3: Camera holds on the client and the car inside the showroom. Seconds 3-5: The background seamlessly morphs — showroom walls dematerialize and reform into an epic coastal highway at golden-hour sunset, warm light flooding in, wind whipping hair and clothes. Seconds 5-8: The car's wheels begin to spin with convincing motion blur, headlights flare brightly against the deepening sky, and the camera pulls back slightly as the dream environment fully comes alive. Photorealistic, 4k, cinematic lens flare, anamorphic aesthetic.`,
    reveal: `Cinematic 8-second horizontal sequence, 16:9 landscape framing, leading up to the handover moment. Seconds 0-3: A silk cover drapes the car; an unseen hand gracefully pulls it away in slow-motion, the fabric billowing and cascading toward the floor. Seconds 3-6: A fast-forward time-lapse of the sun setting behind the client and vehicle, city lights flickering on around them in rapid succession, people and traffic streaking past. Seconds 6-8: The time-lapse halts and holds exactly on the final handover pose — the client and car perfectly lit under dusk sky and warm ambient city glow. Hyper-realistic, 4k, shallow depth of field.`,
    hero_orbit: `Dynamic 8-second horizontal sequence, 16:9 landscape framing, simulated drone sweep. The camera performs a smooth 180-degree 3D orbit around the client and the car, rising slightly on approach and descending on departure, keeping both in frame. Apply a stylized high-octane cinematic filter throughout: heightened contrast, saturated rim-lighting, subtle neon reflections on the paint, gentle chromatic aberration at frame edges, volumetric light rays. The client holds a confident, heroic pose. Wide-angle lens, graphic-novel color grade, cyberpunk-adjacent aesthetic.`,
    pixel_build: `Cinematic 8-second horizontal sequence, 16:9 landscape framing. IMPORTANT: preserve the exact background, environment, lighting, and all people from the input image unchanged — do not relocate or restyle the setting. Second 0-1: The person or people from the original photo stand in their same positions, visibly smiling and excited about their new car. If there are multiple people in the photo, keep every one of them in frame, all equally animated and excited — faces lit up, genuine smiles. Seconds 1-7: Thousands of glowing transparent digital voxels and bright cyan data streams rapidly materialize from the ground and the air around them, assembling the car piece-by-piece in an accelerated tech-forward construction sequence — wheels first, then chassis, then body panels, then glass, then headlights pulsing on with a satisfying snap. The people react with growing excitement as the car takes shape. Seconds 7-8: The car is fully solid, complete, and brand-new looking, parked beside the people; everyone smiles and shows real excitement directly at camera. The original background stays the same throughout. Hyper-realistic, futuristic, satisfying tech aesthetic, 4k. Audio: subtle ambient environment sound matching the original scene, rising synth swell during the build, soft mechanical clicks and energy whooshes as panels assemble, satisfying final 'snap' as the car completes.`,
    pixel_build_car_only: `Cinematic 8-second horizontal sequence, 16:9 landscape framing. IMPORTANT: preserve the exact background, environment, and lighting from the input image unchanged — do not relocate or restyle the setting. There are NO people in this video at any point — no humans, no figures, no hands, no reflections of people; the scene contains only the vehicle and its surroundings. Seconds 0-2: the vehicle sits in the scene. Seconds 2-6: thousands of glowing transparent digital voxels and bright cyan data streams sweep over the car and rapidly re-assemble it piece-by-piece in an accelerated tech-forward construction sequence — wheels, then chassis, then body panels, then glass, then headlights pulsing on with a satisfying snap. Seconds 6-8: the car settles fully solid, complete, brand-new and gleaming, parked in the scene. The original background stays the same throughout and no people ever appear. Hyper-realistic, futuristic, satisfying tech aesthetic, 4k.`,
    pixel_build_reveal: `Cinematic 8-second horizontal sequence, 16:9 landscape framing. TWO reference images are provided: reference image 1 is the SCENE — a vehicle covered by a cloth car-cover in its setting, together with any people present; reference image 2 shows the ACTUAL uncovered vehicle. IMPORTANT: preserve the exact background, environment, lighting and every person from reference image 1 unchanged — do not relocate or restyle the setting. Seconds 0-2: the vehicle sits fully covered by the cloth exactly as in reference image 1; any people stand in their same positions, smiling. Seconds 2-6: the cloth is dramatically pulled away as thousands of glowing transparent cyan voxels and bright data streams sweep in and rapidly re-assemble the car piece-by-piece in an accelerated tech-forward reveal. CRITICAL: the revealed vehicle must EXACTLY match the car in reference image 2 — same make, model, body shape, colour, wheels, grille and details; never invent a different car. Seconds 6-8: the car stands fully revealed, solid, brand-new and gleaming beside the people in the original scene; everyone smiles at camera. Hyper-realistic, futuristic, satisfying tech aesthetic, 4k.`,
};

export function buildSeedancePrompt(styleKey, { buyerName } = {}) {
    const template = SEEDANCE_STYLE_PROMPTS[styleKey];
    if (!template) return null;
    const firstName = (buyerName || '').trim().split(/\s+/)[0] || 'friend';
    return template.replace(/\{firstName\}/g, firstName);
}

export const SEEDANCE_STYLES = [
    {
        key: 'dream_drive',
        label: 'Dream Drive Transition',
        tagline: 'Escapist flair',
        description: 'Showroom morphs into a coastal highway sunset — wheels spin, headlights flare.',
    },
    {
        key: 'reveal',
        label: 'Time-Lapse Reveal',
        tagline: 'Dramatic handover',
        description: 'Silk cover pulls away, sun sets, city lights bloom — ends on the handover pose.',
    },
    {
        key: 'hero_orbit',
        label: 'Stylized Hero Walkaround',
        tagline: 'Social punch',
        description: '3D drone orbit with cinematic/graphic-novel grade and neon rim-light.',
    },
    {
        key: 'pixel_build',
        label: 'Pixel Build',
        tagline: 'Tech-forward',
        description: 'Car assembles around the client from glowing voxels — ends with a personalized congratulations overlay.',
    },
];
