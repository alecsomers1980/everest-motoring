import { runWithFallback } from "./aiProviderChain";
import { estimateSpokenMs, findOverBudgetScenes, VOICEOVER_BUDGET_MS } from "./voiceoverDuration";

function pickFeaturedPair(features, pool) {
    if (!features || features.length === 0) return [];
    const matches = features.filter(f => pool.some(p => f.toLowerCase().includes(p.toLowerCase())));
    return matches.slice(0, 2);
}

// Deterministic variant picker — same car always gets the same line,
// different cars naturally diverge across the pool. Used so the
// fallback voiceover doesn't read identically across listings.
function hashSeed(s) {
    const str = String(s || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
    return Math.abs(h);
}
function pickVariant(seed, pool, salt = 0) {
    if (!pool || pool.length === 0) return '';
    return pool[(hashSeed(seed) + salt) % pool.length];
}

// Some models (especially Claude Haiku, which we fall back to when Gemini
// is 503) echo the prompt's example output BEFORE giving their real answer.
// A greedy regex pulls both arrays into one giant 8-entry payload and the
// pipeline tries to render all 8 scenes. This walks the text with a proper
// bracket counter, finds every balanced top-level JSON array, then prefers
// the LAST one with exactly 4 scene objects — the model's real answer
// typically follows the echoed example. Falls back to the first parseable
// array if nothing matches the 4-scene shape.
function extractSceneArray(text) {
    if (typeof text !== 'string') throw new Error('Script response was not a string.');
    const candidates = [];
    let depth = 0;
    let start = -1;
    let inString = false;
    let escape = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        // String-aware so brackets inside string literals (e.g. "[year make model]"
        // placeholders the AI might quote in its prose) don't throw off depth.
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (ch === '[') {
            if (depth === 0) start = i;
            depth++;
        } else if (ch === ']') {
            depth--;
            if (depth === 0 && start !== -1) {
                candidates.push(text.slice(start, i + 1));
                start = -1;
            } else if (depth < 0) {
                depth = 0;
                start = -1;
            }
        }
    }

    const isSceneArray = (arr) =>
        Array.isArray(arr) &&
        arr.length === 4 &&
        arr.every(s => s && typeof s === 'object' && Number.isFinite(s.scene));

    // Prefer the LAST balanced array that looks like a 4-scene answer.
    for (let i = candidates.length - 1; i >= 0; i--) {
        try {
            const arr = JSON.parse(candidates[i]);
            if (isSceneArray(arr)) return arr;
        } catch (e) { /* try previous */ }
    }
    // Fallback: first parseable array (even if shape is off, we'll catch
    // length issues downstream).
    for (const c of candidates) {
        try { return JSON.parse(c); } catch (e) { /* try next */ }
    }
    throw new Error('Could not extract a valid scene array from the script response.');
}

// Pulls the spoken line out of the AUDIO block in a visual_prompt. The block
// looks like: AUDIO: "...Background sound is very low: 'Hello world.'"
// or AUDIO: "...Background sound is very low: Hello world."
// We grab whatever follows the last colon, trim, and strip wrapping quotes.
function extractVoiceoverFromVisualPrompt(visualPrompt) {
    if (!visualPrompt || typeof visualPrompt !== 'string') return '';
    const audioIdx = visualPrompt.lastIndexOf('AUDIO:');
    if (audioIdx === -1) return '';
    const audioBlock = visualPrompt.slice(audioIdx);
    // Last colon inside the AUDIO block marks the start of the spoken line.
    const lastColon = audioBlock.lastIndexOf(':');
    if (lastColon === -1) return '';
    let line = audioBlock.slice(lastColon + 1).trim();
    // Strip a trailing closing quote of the outer AUDIO bracket if present.
    if (line.endsWith('"')) line = line.slice(0, -1).trim();
    // Strip surrounding single/double quotes around the spoken line itself.
    line = line.replace(/^['"]+|['"]+$/g, '').trim();
    return line;
}

export async function generateVehicleScript(car) {
    try {
        // Determine car type category for adaptive scripting
        let carType = "Standard";
        const bodyTypeClean = (car.model + " " + (car.description || "")).toLowerCase();
        if (bodyTypeClean.includes("suv") || bodyTypeClean.includes("fortuner") || bodyTypeClean.includes("rover") || bodyTypeClean.includes("cruiser")) {
            carType = "SUV (Focus on adventure, safety, ground clearance, and family utility)";
        } else if (bodyTypeClean.includes("hatch") || bodyTypeClean.includes("polo") || bodyTypeClean.includes("swift")) {
            carType = "Economy/Hatchback (Focus on fuel efficiency, value, city driving, and practicality)";
        } else if (car.price > 800000 || bodyTypeClean.includes("sedan") || bodyTypeClean.includes("bmw") || bodyTypeClean.includes("mercedes")) {
            carType = "Luxury Sedan/Premium (Focus on status, smooth ride, premium materials, and executive comfort)";
        }

        const prompt = `
You are an expert automotive copywriter and Creative Director for Everest Motoring, a premium pre-owned car dealership in White River, Mpumalanga. You write polished, professional voiceover scripts that SELL — confident, aspirational, and tasteful, always written with a sale or an enquiry in mind.
Write an intelligent, 4-scene visual prompt script for an AI Image-to-Video generator (like Sora 2) based on the following vehicle.

Vehicle Details:
Make: ${car.make}
Model: ${car.model}
Year: ${car.year}
Price: R ${new Intl.NumberFormat('en-ZA').format(car.price)}
Mileage: ${car.mileage} km
Transmission: ${car.transmission || 'Unknown'}
Fuel Type: ${car.fuel_type || 'Unknown'}
Features: ${car.features && car.features.length > 0 ? car.features.join(', ') : 'Standard features'}

Adaptive Scripting Context:
This vehicle falls under the category: ${carType}.
Please subtly weave these category-specific themes into the scene details and camera dynamics.

Strict Instructions for the script:
1. You must write exactly FOUR scene descriptions. Each scene represents a video clip prompt.
2. These are pre-owned vehicles. NEVER use the word "new" in the voiceover scripts. Use words like "striking", "exceptional", or just the make and model.
2b. NEVER use the phrase "test drive" anywhere in any voiceover, in any scene. The CTA should invite the viewer to "view", "see", or "experience" the vehicle, or to "contact" / "visit" / "enquire with" Everest Motoring — never to book a test drive.
2c. VOICEOVER VARIETY — STRICT: each voiceover must feel uniquely written for THIS specific ${car.year} ${car.make} ${car.model}, not a fill-in-the-blank template. Vary your sentence openers, structures, and word choices. Do NOT default to predictable patterns like every Scene 1 starting with "Introducing the…", every Scene 4 starting with "Contact Everest Motoring today…", or "Featuring X and Y" / "With X and Y" stock phrasing. Treat each voiceover line as bespoke copy for this vehicle: reference its specific character — sporty, family-focused, executive, rugged, economical — and write language that fits THAT vehicle's personality rather than a generic luxury template. Two different cars must never receive the same voiceover line.
2d. VOICEOVER LENGTH — STRICT: scenes 1–3 are MAX 12 WORDS each (aim 9–11); the scene-4 CTA is MAX 9 WORDS (aim 7–8) so it stays punchy and never rushes or gets cut off. Each clip is only 8 seconds, so the line must comfortably fit at a calm, unhurried, premium pace. If you cannot fit your point, say less — drop a feature, drop an adjective, drop the lead-in. A short, well-spoken line is far better than a long one that gets cut off mid-sentence.
2d-i. NEVER SPELL OUT SPEC CODES — STRICT: the voiceover is read aloud by a text-to-speech voice that pronounces trim and engine designations letter by letter, which eats the 8-second clip. "2.0TDi" is spoken as "two point zero T D I" and "DSG" as "D S G" — six syllables and three syllables for what looks like two short words. So in \`voiceover_text\` you must NEVER include engine/trim/gearbox codes such as "2.0TDi", "1.5T", "GD-6", "DSG", "GLX", "CRDi", "TSI", "SD V6", "A/T", or similar. Use the PLAIN model name only — say "Volkswagen Transporter", NOT "Volkswagen T6 2.0TDi Transporter DSG Trendline"; say "Hilux Raider", NOT "Hilux 2.4 GD-6 Raised Body Raider Auto". Describe the mechanicals in ordinary words instead ("turbo diesel", "smooth automatic", "turbo-petrol"). Mentioning the year plus make and short model name once in scene 1 is plenty — the full designation belongs in the written listing, never in the spoken line.
2e. SALES INTENT & SPECS — STRICT: write like a premium, professional salesperson with a sale or enquiry in mind — confident, warm, aspirational, never cheesy, pushy, or used-car-salesy. Weave the vehicle's ACTUAL specifications (year, make, model, transmission, fuel type, mileage, and 1–2 real features from the list above) into the lines as desirable selling points — make the car feel sought-after, NOT a dry spec read-out. Build genuine interest across scenes 1–3 and convert it with the scene-4 call to action. Use confident, premium vocabulary (e.g. "refined", "commanding", "impeccably kept", "effortless", "exceptional value") suited to THIS vehicle's character.
3. Keep visual descriptions concise — 2–3 short sentences before AUDIO. Describe WHAT is in the frame (the vehicle and its surroundings) and the fidelity rules. Do NOT describe the camera motion yourself — a single fixed motion directive is appended downstream to every clip, so your job is only to describe the static subject faithfully.
4. MOTION — every scene uses ONE gentle camera move: a slow cinematic dolly forward, a subtle push-in (Motion Value: Low, ~3/10). The environment and the subject are completely static and faithful to the source photograph — nothing morphs, warps, stretches, or changes; the camera simply eases forward smoothly and steadily. There is no panning, no rotation, no orbit, no angle swing, no perspective re-projection. Absolute image fidelity to the source: no hallucinated detail, no restyling.
5. BACKGROUND PRESERVATION — STRICT (applies to EVERY scene, especially scene 1): the background of the source photograph must be preserved EXACTLY as supplied. Do NOT change, restyle, replace, or "enhance" the background. Do NOT swap the location, sky, weather, ground, walls, parking surface, surroundings, lighting, or any environmental element. Do NOT add new objects, people, signage, logos, atmospheric effects (haze, mist, rain, lens flares), or motion of any kind in the background. Do NOT relocate the car or change what is visible behind, beside, above, or below it. The background of every frame must stay visually IDENTICAL to the background in the source photograph as the camera gently pushes in — only the framing tightens, the background content never changes.
6. GEOMETRY & SUBJECT PRESERVATION — STRICT (applies to EVERY scene, especially the interior scenes 2 and 3): the shapes, proportions, and physical structure visible in the source photograph must be preserved EXACTLY as supplied. As the camera gently pushes in, the model must NEVER re-imagine or re-render the subject — no morphing of seat shapes, belt geometry, dashboard layout, trim panels, steering wheel position, mirror placement, or any object's outline. Do NOT distort, warp, stretch, bend, or "rationalize" any part of the image. Do NOT swing the camera angle or orbit the subject. Do NOT add or remove objects from the cabin. The subject must look like the exact same real photograph throughout the slow push-in — only the framing tightens as the camera eases forward; the content itself never changes.

Scene Breakdown:

(STYLE — applies to all four scenes: each clip is a SINGLE FLUID 8-second shot with one gentle camera move — a slow cinematic dolly forward / subtle push-in (Motion Value Low, ~3/10). The subject and environment stay completely static and faithful to the source photograph; only the camera eases forward, tightening the framing. No cuts, no angle swings, no panning, no orbit, no morphing, no restyling. The car, background, lighting, and every object keep their exact shape and position from the source image throughout — nothing is altered, swapped, added, or removed.)

Scene 1: Exterior Hero
- The ${car.make} ${car.model} exactly as in the source photograph, with the camera slowly pushing in over the clip. The image content is identical to the source throughout — same car position, same number plate, same background, same ground, same surroundings, same lighting. The background must be preserved EXACTLY as supplied — do NOT change the location, sky, walls, ground, parking surface, or any environmental detail behind or around the car. Nothing morphs or restyles; only the camera eases forward.
- AUDIO: "A South African woman speaks the voiceover in her natural South African English accent (the typical accent heard in Johannesburg, Cape Town, or Pretoria — clear, warm, neutral South African, NOT British, NOT American, NOT Australian). Her voice is the only voice in the clip, calm and unhurried, fully audible and front-and-centre in the mix. Background sound is very low: [Write a polished, professional opening hook that introduces this specific year, make, and model and makes it feel desirable and sought-after — confident and aspirational, written to draw a buyer in. Reference its character or a standout attribute. MAX 12 words, aim 9–11. Must fit a calm, premium pace in an 8-second clip.]"

Scene 2: Dashboard / Cockpit
- The ${car.make} ${car.model} dashboard exactly as in the source photograph, with the camera slowly pushing in over the clip. The dashboard, displays, instrument cluster, steering wheel, vents, infotainment screen, and trim are IDENTICAL to the source throughout — same shapes, same proportions, same positions. The steering wheel is on the RIGHT side (right-hand-drive vehicle) and must stay on the right. Do NOT morph, distort, or warp any element of the dashboard, do NOT re-imagine the cockpit, do NOT add or remove buttons, displays, or trim pieces. Nothing changes shape; only the camera eases forward.
- AUDIO: "A South African woman speaks the voiceover in her natural South African English accent (the typical accent heard in Johannesburg, Cape Town, or Pretoria — clear, warm, neutral South African, NOT British, NOT American, NOT Australian). Her voice is the only voice in the clip, calm and unhurried, fully audible and front-and-centre in the mix. Background sound is very low: [Write a premium, professional line that presents 1 or 2 of THIS car's real technology features as desirable selling points — show how the tech elevates the drive, in confident sales language, never a dry spec list. MAX 12 words, aim 9–11. Must fit a calm, premium pace in an 8-second clip — say less rather than rush.]"

Scene 3: Rear Cabin
- The ${car.make} ${car.model} rear cabin exactly as in the source photograph, with the camera slowly pushing in over the clip. The rear seats, headrests, seat belts, belt buckles, armrest, trim, door cards, floor, and view through the windows are IDENTICAL to the source throughout — same shapes, same proportions, same positions. Do NOT re-imagine the cabin, do NOT orbit or swing the camera, do NOT warp, stretch, bend, or "rationalize" any seat or belt geometry, do NOT add or remove cabin elements, do NOT invent textures or details that aren't in the source. The cabin must look like the exact same real photograph throughout the push-in; nothing morphs.
- AUDIO: "A South African woman speaks the voiceover in her natural South African English accent (the typical accent heard in Johannesburg, Cape Town, or Pretoria — clear, warm, neutral South African, NOT British, NOT American, NOT Australian). Her voice is the only voice in the clip, calm and unhurried, fully audible and front-and-centre in the mix. Background sound is very low: [Write a premium, professional line that presents a powertrain detail (engine, transmission, or fuel type) and/or a comfort feature as desirable selling points, evoking the driving experience — refined, capable, effortless. Confident sales language, never a dry spec list. MAX 12 words, aim 9–11. Must fit a calm, premium pace in an 8-second clip — say less rather than rush.]"

Scene 4: Closer (Same hero image as Scene 1, CTA voiceover)
- The ${car.make} ${car.model} — the IDENTICAL hero exterior photograph used in Scene 1, with the camera slowly pushing in over the clip. The image content is identical to the Scene 1 source throughout: same car position, same number plate, same background, same lighting, same framing. Do NOT add any person, presenter, logos, text, or graphical overlay. Do NOT change the background or morph the car. Nothing changes shape; only the camera eases forward.
- AUDIO: "A South African woman speaks the voiceover in her natural South African English accent (the typical accent heard in Johannesburg, Cape Town, or Pretoria — clear, warm, neutral South African, NOT British, NOT American, NOT Australian). Her voice is the only voice in the clip, calm and unhurried, fully audible and front-and-centre in the mix. Background sound is very low: [Write a confident, professional Call to Action that converts — invite the viewer to contact, visit, or enquire with Everest Motoring about this specific vehicle. Premium and warm, never pushy. MUST include the words 'Everest Motoring'. Keep it SHORT and punchy — MAX 9 WORDS, aim 7–8 — so it never rushes or gets cut off. Avoid the word 'new'. Avoid the phrase 'test drive'.]"

Format Requirement: Return ONLY a valid JSON array of objects with keys: \`scene\`, \`location\`, \`visual_prompt\`, \`voiceover_text\`.
Do not include markdown formatting outside the JSON array.

CRITICAL OUTPUT RULES:
- Your response must START with the character \`[\` and END with the character \`]\`. Nothing before, nothing after — no prose preamble, no "Here is the script:", no closing remarks, no markdown code fences.
- The response must contain EXACTLY ONE JSON array. Do NOT include the example output below in your response. Do NOT repeat or quote the example. The example is for your reference only and must NOT appear anywhere in what you return.
- The array must contain EXACTLY 4 objects (one per scene), numbered scene: 1, 2, 3, 4.

- \`visual_prompt\` is a single short paragraph (2–3 sentences) describing the vehicle/scene exactly as in the source photo and the fidelity rules (no morphing, background preserved), plus the AUDIO line as instructed above. Do NOT describe camera motion yourself — a fixed push-in directive is appended downstream.
- \`voiceover_text\` is the CLEAN spoken line ONLY — just the words the South African woman says, NO surrounding "AUDIO:" wrapper, NO voice description, NO quotation marks, NO brackets. Plain prose, the exact words to be spoken. MAX 11 words. This is the same line that appears inside the AUDIO block of \`visual_prompt\`, but extracted as a standalone string so it can be sent to a separate TTS service.

Example Output:
[
  { "scene": 1, "location": "exterior", "visual_prompt": "The [year make model] exactly as in the source photograph. The car, background, and lighting are identical to the source throughout — nothing morphs, the background is preserved exactly. AUDIO: ...", "voiceover_text": "The commanding 2022 BMW X5 — refined, automatic, impeccably kept." },
  { "scene": 2, "location": "interior", "visual_prompt": "The [year make model] dashboard exactly as in the source photograph. Steering wheel on the RIGHT. Dashboard, displays, and trim keep their exact shapes and positions — nothing morphs or warps. AUDIO: ...", "voiceover_text": "Apple CarPlay and premium audio elevate every journey." },
  { "scene": 3, "location": "interior", "visual_prompt": "The [year make model] rear cabin exactly as in the source photograph. Seats, belts, and trim keep their exact shapes and positions — no warping, no re-imagining. AUDIO: ...", "voiceover_text": "Effortless turbo-petrol power meets supple leather comfort." },
  { "scene": 4, "location": "exterior", "visual_prompt": "The [year make model] — the IDENTICAL hero exterior photograph used in scene 1. Same car, same background, same framing. No people, no overlays, nothing added, nothing morphed. AUDIO: ...", "voiceover_text": "Make it yours — enquire with Everest Motoring." }
]
`;

        const runScript = async (scriptPrompt) => {
            const { text, providerUsed } = await runWithFallback({
                prompt: scriptPrompt,
                label: "script",
                maxOutputTokens: 3000,
            });
            console.log(`[Script] Generated via ${providerUsed}`);

            const parsed = extractSceneArray(text);

            // Guard against the AI returning the wrong number of scenes — every
            // downstream stage assumes exactly 4 (the four scene images, the
            // queue manager's per-scene poll, the stitch ordering). Anything
            // else means the response was malformed and we should fall back.
            if (!Array.isArray(parsed) || parsed.length !== 4) {
                throw new Error(`Script response had ${Array.isArray(parsed) ? parsed.length : 'non-array'} scenes; expected exactly 4.`);
            }

            // Backfill voiceover_text from the AUDIO block in visual_prompt when the
            // model forgets to emit the dedicated field. The Seedance pipeline needs
            // a clean spoken line for ElevenLabs; the Veo pipeline ignores this field.
            return parsed.map(s => ({
                ...s,
                voiceover_text: s.voiceover_text || extractVoiceoverFromVisualPrompt(s.visual_prompt) || '',
            }));
        };

        let scenes = await runScript(prompt);

        // A line that takes longer than the clip to speak is truncated
        // mid-sentence at mux time, and an audio-only redo CANNOT fix it (same
        // text in, same over-length audio out). Catching it here — one extra
        // cheap text call — is the only place it's fixable automatically.
        const overBudget = findOverBudgetScenes(scenes);
        if (overBudget.length > 0) {
            console.warn(`[Script] Over-length voiceover(s): ${overBudget.map(o => `scene ${o.scene} ~${o.estimatedMs}ms`).join(', ')} (budget ${VOICEOVER_BUDGET_MS}ms) — retrying once.`);
            const retryPrompt = `${prompt}

RETRY — LENGTH FAILURE. Your previous attempt returned voiceover lines that take too long to speak inside an 8-second clip:
${overBudget.map(o => `- Scene ${o.scene} (~${(o.estimatedMs / 1000).toFixed(1)}s spoken): "${o.text}"`).join("\n")}
Rewrite the ENTIRE script. Every \`voiceover_text\` must be speakable in under ${(VOICEOVER_BUDGET_MS / 1000).toFixed(1)} seconds at a calm, unhurried pace. Remember rule 2d-i: spec codes like "2.0TDi" and "DSG" are spelled out letter by letter by the voice engine — remove them completely and use the plain model name. Shorten the lines listed above the most.`;
            try {
                const retried = await runScript(retryPrompt);
                if (findOverBudgetScenes(retried).length < overBudget.length) {
                    scenes = retried;
                }
            } catch (retryErr) {
                console.warn(`[Script] Length retry failed (${retryErr.message}) — keeping the first attempt.`);
            }
            const remaining = findOverBudgetScenes(scenes);
            if (remaining.length > 0) {
                console.warn(`[Script] Still over budget after retry: ${remaining.map(o => `scene ${o.scene} ~${o.estimatedMs}ms`).join(', ')}. Edit the line in admin and redo that scene's audio.`);
            }
        }

        return scenes;

    } catch (error) {
        console.error("Error generating script via both providers — using feature-aware fallback:", error.message);

        // Feature-aware fallback: weave the actual car features into the voiceovers so
        // the video still sounds specific even when Gemini is unavailable.

        const techPool = ["Apple CarPlay", "Android Auto", "Touchscreen", "Navigation", "Premium Audio", "Bluetooth", "Rear Camera", "Parking Sensors", "Lane Assist", "Blind Spot Monitor", "Cruise Control"];
        const comfortPool = ["Leather Seats", "Climate Control", "Air Conditioning", "Sunroof", "Keyless Entry", "Power Windows", "4WD/AWD", "Alloy Wheels"];

        const tech = pickFeaturedPair(car.features, techPool);
        const comfort = pickFeaturedPair(car.features, comfortPool);

        // Per-car deterministic seed — id when available, otherwise make+model+year.
        const seed = car.id || `${car.make}-${car.model}-${car.year}`;
        const transmissionFuel = [car.transmission, car.fuel_type].filter(Boolean).join(' ');
        const yMM = `${car.year} ${car.make} ${car.model}`;
        const techList = tech.join(' and ');
        const comfortList = comfort.join(' and ');

        // ===== Scene 1 hook variants — kept short (well under the 12-word
        // cap) so the voiceover sits comfortably inside an 8-second clip. =====
        const hookPoolWithDrive = [
            `The striking ${yMM} — ${transmissionFuel}, refined, ready.`,
            `Meet the ${yMM}, ${transmissionFuel}, built for the road.`,
            `The ${yMM}: ${transmissionFuel} confidence, quiet presence.`,
            `Discover the ${yMM} — ${transmissionFuel} and quietly assured.`,
            `${yMM}, a ${transmissionFuel} drive worth noticing.`,
            `The ${yMM} — ${transmissionFuel}, refined, capable.`,
        ];
        const hookPoolNoDrive = [
            `Introducing the striking ${yMM}.`,
            `Meet the ${yMM}, refined and ready.`,
            `The ${yMM}, where presence meets purpose.`,
            `Discover the ${yMM} — quietly exceptional.`,
            `The ${yMM}: confidence, made simple.`,
            `The ${yMM}, a vehicle worth noticing.`,
        ];
        const hookLine = pickVariant(seed, transmissionFuel ? hookPoolWithDrive : hookPoolNoDrive);

        // ===== Scene 2 tech variants =====
        const techPoolWith = [
            `${techList} — technology that keeps you in control.`,
            `${techList} keep you connected and in command.`,
            `Inside, ${techList} simplify every drive.`,
            `${techList}: smart, useful, beautifully integrated.`,
            `${techList} bring the cockpit to life.`,
            `Equipped with ${techList} — driver-focused throughout.`,
        ];
        const techPoolWithout = [
            `Technology that keeps you fully in control.`,
            `Smart cabin tech that simplifies every drive.`,
            `A driver-focused cockpit, intuitive throughout.`,
            `Useful tech, exactly where you need it.`,
            `Smart engineering, genuinely driver-friendly.`,
            `A cabin built around clarity and control.`,
        ];
        const techLine = pickVariant(seed, tech.length > 0 ? techPoolWith : techPoolWithout, 7);

        // ===== Scene 3 comfort variants =====
        const comfortPoolWith = [
            `${comfortList} — comfort built into every kilometre.`,
            `With ${comfortList}, every journey feels considered.`,
            `${comfortList} turn the commute into something easy.`,
            `Inside, ${comfortList} make the long haul effortless.`,
            `${comfortList} — quietly elevating the rear cabin.`,
            `${comfortList}: comfort that earns its keep.`,
        ];
        const comfortPoolWithout = [
            `Designed for exceptional comfort on every journey.`,
            `A rear cabin built for unhurried comfort.`,
            `Space and refinement, in every seat.`,
            `Where space meets refinement — built for the road.`,
            `Long drives, made genuinely restful.`,
            `Comfort and space, thoughtfully designed.`,
        ];
        const comfortLine = pickVariant(seed, comfort.length > 0 ? comfortPoolWith : comfortPoolWithout, 13);

        // ===== Scene 4 CTA variants — MAX 9 words, premium, no 'test drive'.
        // Kept short so the line never rushes or gets cut off in 8 seconds. =====
        const ctaPool = [
            `Make it yours — enquire with Everest Motoring.`,
            `Discover it today at Everest Motoring.`,
            `Visit Everest Motoring in White River.`,
            `Enquire now with Everest Motoring.`,
            `Experience it for yourself at Everest Motoring.`,
            `Speak to Everest Motoring today.`,
        ];
        const ctaLine = pickVariant(seed, ctaPool, 23);

        const fidelityRule = "The vehicle, background, lighting, and every object stay exactly as in the source photograph throughout — nothing morphs, warps, restyles, or changes shape, and nothing is added or removed. Absolute image fidelity to the source. (A slow cinematic push-in camera move is applied downstream — the scene content itself stays static and faithful.)";
        const cleanAudio = "A South African woman speaks the voiceover in her natural South African English accent (the typical accent heard in Johannesburg, Cape Town, or Pretoria — clear, warm, neutral South African, NOT British, NOT American, NOT Australian). Her voice is the only voice in the clip, calm and unhurried, fully audible and front-and-centre in the mix. Background sound is very low";

        return [
            { scene: 1, location: "exterior", voiceover_text: hookLine, visual_prompt: `The ${car.year} ${car.make} ${car.model} parked outside, exactly as in the source photograph. ${fidelityRule} AUDIO: ${cleanAudio}: '${hookLine}'` },
            { scene: 2, location: "interior", voiceover_text: techLine, visual_prompt: `The ${car.make} ${car.model} dashboard exactly as in the source photograph. The steering wheel is on the RIGHT side (right-hand-drive). ${fidelityRule} AUDIO: ${cleanAudio}: '${techLine}'` },
            { scene: 3, location: "interior", voiceover_text: comfortLine, visual_prompt: `The ${car.make} ${car.model} rear cabin exactly as in the source photograph. ${fidelityRule} AUDIO: ${cleanAudio}: '${comfortLine}'` },
            { scene: 4, location: "exterior", voiceover_text: ctaLine, visual_prompt: `The ${car.year} ${car.make} ${car.model} — the IDENTICAL hero exterior photograph used in scene 1, with the same car position, background, and lighting. No people, no overlays, no logos or text added. ${fidelityRule} AUDIO: ${cleanAudio}: '${ctaLine}'` }
        ];
    }
}

export function buildFallbackDescription(car, manualDescription) {
    const priceFormatted = car.price ? new Intl.NumberFormat('en-ZA').format(car.price) : null;
    const allFeatures = car.features || [];
    const mileageFormatted = car.mileage ? new Intl.NumberFormat('en-ZA').format(car.mileage) : null;

    // Bucket features into themes so the prose feels interpreted, not listed.
    const safetyTerms = ["abs", "airbag", "esp", "stability", "traction", "lane", "blind spot", "parking sensor", "rear camera", "isofix"];
    const techTerms = ["carplay", "android auto", "touchscreen", "navigation", "bluetooth", "premium audio", "cruise control", "keyless"];
    const comfortTerms = ["leather", "climate", "air conditioning", "sunroof", "heated seat", "power", "electric"];
    const exteriorTerms = ["alloy", "led", "xenon", "tow bar", "roof rail", "fog", "running light", "4wd", "awd"];

    const bucket = (pool) => allFeatures.filter(f => pool.some(p => f.toLowerCase().includes(p)));
    const safety = bucket(safetyTerms);
    const tech = bucket(techTerms);
    const comfort = bucket(comfortTerms);
    const exterior = bucket(exteriorTerms);

    // === Paragraph 1: The Hook ===
    const transmissionFuel = [car.transmission, car.fuel_type].filter(Boolean).join(' ');
    const driveLine = transmissionFuel ? ` This ${transmissionFuel.toLowerCase()} ${car.model}` : ` This ${car.model}`;
    const para1 = `Discover this exceptional ${car.year} ${car.make} ${car.model} — now available at Everest Motoring in White River, Mpumalanga. A standout in the pre-owned ${car.make} ${car.model} for sale market, this vehicle blends presence, refinement, and everyday capability in a way that's increasingly hard to find at this price point.${driveLine} has been carefully prepared to dealer-ready standard and is ready to be driven home today.`;

    // === Paragraph 2: Performance & Driving Experience ===
    const mileagePhrase = mileageFormatted ? `With ${mileageFormatted} km on the clock, this ${car.make} ${car.model} ${car.year} has been looked after and shows the maturity of a vehicle that has been driven well, not driven hard.` : `This ${car.make} ${car.model} ${car.year} has been carefully maintained and is ready for its next chapter.`;
    const transmissionPhrase = car.transmission ? `The ${car.transmission.toLowerCase()} transmission delivers smooth, confident shifts whether you're navigating Nelspruit traffic or stretching its legs out to Hazyview, Sabie, or White River's quieter back roads.` : `The drivetrain delivers smooth, confident performance across Mpumalanga's varied terrain.`;
    const fuelPhrase = car.fuel_type ? `Running on ${car.fuel_type.toLowerCase()}, it's well-suited to the long-distance realities of life in the Lowveld and the wider Mpumalanga region.` : `It's well-suited to the long-distance realities of life in the Lowveld and the wider Mpumalanga region.`;
    const para2 = `${mileagePhrase} ${transmissionPhrase} ${fuelPhrase}`;

    // === Paragraph 3: Features & Comfort ===
    const featureSentences = [];
    if (safety.length > 0) featureSentences.push(`On the safety side, you'll find ${safety.slice(0, 4).join(', ')} — the kind of equipment that earns its keep on long family trips.`);
    if (tech.length > 0) featureSentences.push(`Technology is well covered with ${tech.slice(0, 4).join(', ')}, keeping you connected and in control without distraction.`);
    if (comfort.length > 0) featureSentences.push(`Inside, ${comfort.slice(0, 4).join(', ')} make every journey feel a little more considered.`);
    if (exterior.length > 0) featureSentences.push(`Exterior touches include ${exterior.slice(0, 4).join(', ')}, lifting the kerb appeal beyond what you'd expect at this price.`);
    if (featureSentences.length === 0 && allFeatures.length > 0) {
        featureSentences.push(`Notable equipment includes ${allFeatures.slice(0, 6).join(', ')} — features that make the daily drive measurably better.`);
    }
    if (manualDescription) featureSentences.push(manualDescription.trim());
    const para3 = featureSentences.length > 0
        ? featureSentences.join(' ')
        : `This ${car.make} is well equipped with the kind of comfort, safety, and convenience features that make the daily drive measurably better.`;

    // === Paragraph 4: Value + Dual CTA ===
    const pricePhrase = priceFormatted
        ? `Priced at ${priceFormatted} South African Rand, this ${car.year} ${car.make} ${car.model} represents genuine value in the second-hand ${car.make} near Nelspruit market — and vehicles of this calibre move quickly through our showroom.`
        : `This ${car.year} ${car.make} ${car.model} represents genuine value in the second-hand ${car.make} near Nelspruit market — and vehicles of this calibre move quickly through our showroom.`;
    const para4 = `${pricePhrase} Everest Motoring has built its reputation in White River, Mpumalanga as a trusted ${car.make} dealer in White River and across the Lowveld, with transparent pricing, honest condition reports, and a friendly, no-pressure approach. Ready to take the next step? Arrange a viewing at Everest Motoring in White River to experience this ${car.model} in person, or enquire about pre-approved vehicle asset finance through our accredited banking partners — we'll structure a tailored finance package that fits your budget. Contact Everest Motoring today on our website or by phone, and let's get you behind the wheel.`;

    return [para1, para2, para3, para4].join('\n\n').replace(/\s+\n/g, '\n').trim();
}

export async function optimizeVehicleDescription(car, manualDescription) {
    try {
        console.log(`[SEO Content] Starting description optimization for ${car.year} ${car.make} ${car.model}...`);

        const promptText = `
You are an expert South African automotive copywriter specializing in high-converting SEO and local-search (GEO) optimized sales copy for Everest Motoring — a premium pre-owned vehicle dealership based in White River, Mpumalanga, serving customers across the Lowveld, Nelspruit, Hazyview, Sabie, Witbank, and the wider Mpumalanga region.

Your goal is to write a description that ranks on Google for South African buyers AND converts visitors into showroom viewings or finance enquiries.

Vehicle Details:
Make: ${car.make}
Model: ${car.model}
Year: ${car.year}
Price: ${car.price}
Mileage: ${car.mileage} km
Transmission: ${car.transmission || 'Unknown'}
Fuel Type: ${car.fuel_type || 'Unknown'}
Features: ${car.features && car.features.length > 0 ? car.features.join(', ') : 'Standard features'}
User's Extra/Unique Features: ${manualDescription || 'None provided'}

Strict Instructions:

LENGTH & STRUCTURE — NON-NEGOTIABLE:
1. Write EXACTLY FOUR paragraphs separated by a blank line. Each paragraph must be 5–8 full sentences. The total word count MUST be between 380 and 500 words. Anything under 350 words will be rejected. This is a premium listing — depth, specificity, and texture matter.
2. Paragraph 1 — The Hook (~90–110 words): open with a vivid scene-setter that names the year, make, model, and (if visible in the image) the colour and stance. Establish desirability and specificity immediately. Mention Everest Motoring and White River, Mpumalanga in this paragraph.
3. Paragraph 2 — Performance & Driving Experience (~90–120 words): describe the powertrain (engine where inferable, transmission, fuel type), driving feel, refinement, ride quality, and how it handles the realities of Mpumalanga / Lowveld driving (long-distance N4 trips, town traffic, gravel roads, family duties — pick what fits). Reference the actual mileage figure and explain why the kilometre count is reassuring rather than concerning.
4. Paragraph 3 — Features & Comfort (~100–130 words): GROUP the supplied features into THEMES — safety, driver-assistance technology, infotainment, comfort, exterior. For each theme, name 2–4 specific features from the list and explain WHY each matters to a Lowveld buyer. Do not just list — interpret. If the user supplied "Extra/Unique Features", weave that text in naturally somewhere in this paragraph.
5. Paragraph 4 — Value, Trust & Dual Call to Action (~90–120 words): justify the price as fair value relative to the local pre-owned market; reinforce Everest Motoring's reputation in White River; close with TWO concrete actions the buyer can take RIGHT NOW (arrange a viewing of this specific vehicle AND enquire about pre-approved asset finance). Add gentle urgency but no clichés.

SEO & GEO REQUIREMENTS — MUST APPEAR:
6. Naturally weave in 5–7 of these South African search phrases (verbatim or near-verbatim, but never as a comma-list): "used ${car.make} ${car.model} for sale", "pre-owned ${car.make} ${car.model} in South Africa", "${car.year} ${car.make} ${car.model}", "buy ${car.make} ${car.model} in Mpumalanga", "${car.make} dealer in White River", "pre-owned cars in the Lowveld", "second-hand ${car.make} near Nelspruit", "${car.make} ${car.model} for sale Mpumalanga". Spread them across paragraphs 1, 3, and 4.
7. Mention "Everest Motoring" by name AT LEAST THREE times across the description.
8. Mention "White River" at least twice and "Mpumalanga" at least twice. Mention at least one of: Nelspruit, Hazyview, Sabie, the Lowveld.
9. Reference at least one buyer scenario tied to the region (school runs in White River, weekend trips into the Kruger, commuting on the N4 to Witbank or Pretoria, etc.) — this signals genuine local relevance to Google.

PRICE & CURRENCY:
10. CRITICAL: When stating the price, write it exactly as "${car.price} South African Rand" (spelled out, NOT "R", NOT "ZAR", NOT "rand"). This improves voice-search and accessibility.

IMAGE CONTEXT:
11. If a vehicle image is provided, identify the exact colour and any visible condition cues (clean panels, alloy wheels, interior trim, badging) and weave them into paragraph 1 or 2 naturally.

CALL TO ACTION:
12. The final paragraph MUST end with two clear, persuasive actions written as full sentences:
    a) Arrange a viewing of this ${car.model} at Everest Motoring in White River — frame it as the way to experience this specific vehicle in person. NEVER use the phrase "test drive".
    b) Enquire about pre-approved vehicle asset finance through Everest Motoring's accredited banking partners — frame it as a path to a tailored, affordable monthly package.
12b. CRITICAL: The phrase "test drive" must NOT appear anywhere in the description. Use "view", "see", "arrange a viewing", "experience in person", or "visit our showroom" instead.
13. Add gentle urgency without being pushy: phrases like "vehicles of this calibre move quickly" or "stock at this spec is limited" are fine; avoid clichés like "act now", "don't miss out", "while stocks last".

FORMATTING:
14. Plain prose only. Paragraphs separated by a single blank line. NO markdown headers (#, *), NO bullet lists, NO bold/italic markers. Return clean text ready to drop into a website paragraph block.
15. Write in a confident, premium, trustworthy tone — never gimmicky or aggressive. Think "luxury dealer with friendly staff" not "used-car salesman".
16. Do NOT preface the output with anything like "Here is your description:" — return ONLY the four paragraphs.
`;

        const { text, providerUsed } = await runWithFallback({
            prompt: promptText,
            imageUrl: car.main_image_url || null,
            label: "description",
            maxOutputTokens: 2048,
        });
        console.log(`[SEO Content] Description generated via ${providerUsed}.`);

        // Length guard — if the AI returned a thin response, fall back to the
        // substantial template instead of shipping a 50-word listing.
        const wordCount = String(text || '').trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 250) {
            console.warn(`[SEO Content] AI returned only ${wordCount} words — using full fallback for quality.`);
            return buildFallbackDescription(car, manualDescription);
        }

        return text;
    } catch (error) {
        console.error("[SEO Content] Both providers failed — using features-based fallback:", error.message);
        return buildFallbackDescription(car, manualDescription);
    }
}

