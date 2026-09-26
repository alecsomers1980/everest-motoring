/**
 * Nano Banana (Gemini 2.5 Flash Image) compositor.
 * Takes an uploaded car photo and places the exact vehicle onto the
 * branded scene-1 background at /public/branding/scene1-background.png.
 *
 * Returns the generated image as base64 + mime type — caller uploads to storage.
 */

import fs from "fs/promises";
import path from "path";

const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const BG_RELATIVE_PATH = path.join("public", "branding", "scene1-background.png");

const COMPOSITION_PROMPT = `Take the exact vehicle visible in the first image and place it cleanly onto the background of the second image. Match the lighting, perspective, shadow direction, ground contact, and color temperature of the background environment so the car sits naturally in the scene.

Critical rules:
- Preserve the vehicle's exact body shape, paint colour, panel lines, badges, wheels, tyres, and any visible details. Do not redesign, restyle, or modify the vehicle in any way.
- The vehicle's front license plate must clearly display the word "EVEREST" in clean lettering.
- Keep the same vehicle orientation as in the source car photo.
- Photorealistic, cinematic, 16:9 composition. No text overlays, watermarks, or logos other than the EVEREST plate.`;

async function loadBrandedBackground() {
    const bgPath = path.join(process.cwd(), BG_RELATIVE_PATH);
    const buffer = await fs.readFile(bgPath);
    return buffer.toString("base64");
}

async function fetchCarImage(carImageUrl) {
    const response = await fetch(carImageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch car image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
        base64: Buffer.from(arrayBuffer).toString("base64"),
        mimeType: response.headers.get("content-type") || "image/jpeg",
    };
}

export async function composeSceneOneImage(carImageUrl) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        throw new Error("GOOGLE_GEMINI_API_KEY not set");
    }

    const [bgBase64, car] = await Promise.all([
        loadBrandedBackground(),
        fetchCarImage(carImageUrl),
    ]);

    const body = {
        contents: [
            {
                parts: [
                    { inline_data: { mime_type: car.mimeType, data: car.base64 } },
                    { inline_data: { mime_type: "image/png", data: bgBase64 } },
                    { text: COMPOSITION_PROMPT },
                ],
            },
        ],
    };

    const url = `${GEMINI_API_BASE}/${GEMINI_IMAGE_MODEL}:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Nano Banana API error ${response.status}: ${errText.substring(0, 300)}`);
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
        const inline = part.inline_data || part.inlineData;
        if (inline?.data) {
            return {
                base64: inline.data,
                mimeType: inline.mime_type || inline.mimeType || "image/png",
            };
        }
    }

    throw new Error("Nano Banana returned no image in response");
}
