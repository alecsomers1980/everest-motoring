import { GoogleGenerativeAI } from "@google/generative-ai";

const LOCATION = "White River, Mpumalanga, South Africa";
const DEALER = "Everest Motoring";

function extractJson(text) {
    const cleaned = String(text || "").replace(/```json/gi, "").replace(/```/g, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found in SEO response");
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

async function fetchImageAsInlineData(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const buf = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") || "image/jpeg";
        return {
            inlineData: {
                data: Buffer.from(buf).toString("base64"),
                mimeType,
            },
        };
    } catch (err) {
        console.warn("[SEO] image fetch failed:", url, err.message);
        return null;
    }
}

export function computeFallbackMetaTitle(car) {
    const parts = [
        `${car.year} ${car.make} ${car.model}`,
        car.price ? `R${new Intl.NumberFormat("en-ZA").format(car.price)}` : null,
    ].filter(Boolean);
    const base = `${parts.join(" - ")} | ${DEALER} White River`;
    // Hard limit ~60 chars for Google
    return base.length > 65 ? `${car.year} ${car.make} ${car.model} | ${DEALER}` : base;
}

export function computeFallbackMetaDescription(car) {
    const bits = [
        `${car.year} ${car.make} ${car.model}`,
        car.mileage ? `${new Intl.NumberFormat("en-ZA").format(car.mileage)} km` : null,
        car.transmission,
        car.fuel_type,
    ].filter(Boolean);
    const price = car.price ? `R${new Intl.NumberFormat("en-ZA").format(car.price)}. ` : "";
    return `${bits.join(", ")}. ${price}AA roadworthy pre-owned vehicle for sale in ${LOCATION}. Finance options available at ${DEALER}.`.slice(0, 160);
}

export function computeFallbackAlt(car, url, index, total) {
    const base = `${car.year} ${car.make} ${car.model}`;
    if (index === 0) return `${base} for sale at ${DEALER} - main exterior view`;
    if (total > 1 && index === total - 1) return `${base} - additional detail view`;
    return `${base} - view ${index + 1}`;
}

function buildPrompt(car, imageUrls) {
    const features = Array.isArray(car.features) && car.features.length > 0
        ? car.features.join(", ")
        : "standard features for its class";
    const imageCount = imageUrls.length;

    return `
You are an SEO copywriter for ${DEALER}, a pre-owned car dealership in ${LOCATION}.
Generate SEO metadata and image alt text for this vehicle's detail page.

Vehicle:
- ${car.year} ${car.make} ${car.model}
- Price: ${car.price ? `R${new Intl.NumberFormat("en-ZA").format(car.price)}` : "unspecified"}
- Mileage: ${car.mileage ? `${new Intl.NumberFormat("en-ZA").format(car.mileage)} km` : "unspecified"}
- Transmission: ${car.transmission || "unspecified"}
- Fuel: ${car.fuel_type || "unspecified"}
- Features: ${features}

Images: ${imageCount} image(s) will be provided in order (image 1 is the main hero/exterior).

Rules:
1. Title: 50-60 characters, ends with "| ${DEALER}" or similar. Include year + make + model + price if it fits. Pre-owned (never "new").
2. Description: 140-155 characters. Include mileage, transmission, fuel, price, ${LOCATION}, a trust cue (AA roadworthy / 100-point check). No hype.
3. Image alts: one per image, 80-125 characters each. Describe what you see: colour, angle (front/side/rear/three-quarter/interior/dashboard/cabin/engine bay/boot/wheel), include "${car.year} ${car.make} ${car.model}" in each. If image unclear, fall back to a sensible exterior/interior label based on position (image 1 is usually front exterior).
4. No emojis. No hype words ("amazing", "best ever", "unbeatable"). Tone: specific, factual, South African English.

Return ONLY valid JSON:
{
  "meta_title": "...",
  "meta_description": "...",
  "image_alts": ["alt for image 1", "alt for image 2", "..."]
}
`.trim();
}

export async function generateSeoForCar(car, { useVision = true } = {}) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        throw new Error("Missing GOOGLE_GEMINI_API_KEY");
    }

    const imageUrls = [];
    if (car.main_image_url) imageUrls.push(car.main_image_url);
    if (Array.isArray(car.gallery_urls)) imageUrls.push(...car.gallery_urls.filter(Boolean));

    // Cap vision inputs to keep latency/cost predictable
    const visionCap = 6;
    const visionUrls = useVision ? imageUrls.slice(0, visionCap) : [];

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const parts = [buildPrompt(car, imageUrls)];
    if (useVision) {
        const inlineImages = await Promise.all(visionUrls.map(fetchImageAsInlineData));
        inlineImages.forEach((img) => { if (img) parts.push(img); });
    }

    let parsed;
    try {
        const result = await model.generateContent(parts);
        const text = result.response.text();
        parsed = extractJson(text);
    } catch (err) {
        console.error("[SEO] Gemini call failed — using fallbacks:", err.message);
        parsed = { meta_title: null, meta_description: null, image_alts: [] };
    }

    const metaTitle = (parsed.meta_title || "").trim() || computeFallbackMetaTitle(car);
    const metaDescription = (parsed.meta_description || "").trim() || computeFallbackMetaDescription(car);

    // Map alts back to URLs. Pad with fallbacks if AI returned fewer than image count.
    const aiAlts = Array.isArray(parsed.image_alts) ? parsed.image_alts : [];
    const imageAlts = imageUrls.map((url, i) => {
        const alt = (aiAlts[i] || "").trim() || computeFallbackAlt(car, url, i, imageUrls.length);
        return { url, alt: alt.slice(0, 160) };
    });

    return {
        seo_meta_title: metaTitle.slice(0, 70),
        seo_meta_description: metaDescription.slice(0, 160),
        image_alts: imageAlts,
    };
}

export function altForImage(car, url, index, total) {
    if (Array.isArray(car.image_alts)) {
        const match = car.image_alts.find((entry) => entry && entry.url === url);
        if (match?.alt) return match.alt;
    }
    return computeFallbackAlt(car, url, index, total);
}
