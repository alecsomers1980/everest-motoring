import Anthropic from "@anthropic-ai/sdk";

const DEALERSHIP = {
    name: "Everest Motoring",
    location: "White River, Mpumalanga, South Africa",
    positioning: "premium pre-owned vehicles, 100-point checked, AA roadworthy, finance-friendly",
    audience: "South African buyers looking for a reliable pre-owned car, primarily in Mpumalanga, Limpopo, and KwaZulu-Natal",
};

const BUYING_GUIDE_TOPICS = [
    "How to budget for your first pre-owned car in South Africa",
    "Understanding AA roadworthy certificates and why they matter",
    "Petrol vs diesel: choosing the right fuel type for South African driving",
    "A first-time buyer's guide to vehicle finance in South Africa",
    "How to spot a quality pre-owned vehicle: a 10-step checklist",
    "Understanding vehicle service history and why it affects resale value",
    "Automatic vs manual: which is the better pre-owned buy?",
    "The real cost of owning a car in South Africa beyond the sticker price",
    "How to trade in your current vehicle for the best value",
    "Balloon payments and residual value: the honest breakdown",
    "What a 100-point vehicle check actually covers",
    "Why mileage alone doesn't tell the full story of a used car",
];

const LOCAL_TOPICS = [
    "The best weekend drives from White River for a weekend escape",
    "Why White River is the ideal base for exploring Mpumalanga by car",
    "Scenic routes: driving the Panorama Route from White River",
    "Top 5 drives to Kruger National Park gates from White River",
    "Living in White River: why the Lowveld is SA's hidden gem for drivers",
    "A local's guide to the best road trips from Mbombela and White River",
    "Navigating Mpumalanga's mountain passes: driving tips for the Lowveld",
    "White River to the coast: the best road trip routes from the Lowveld",
    "Why a 4x4 or SUV makes sense for Lowveld drivers",
    "Preparing your vehicle for a Mpumalanga summer and rainy season",
];

const HERO_POOL = {
    "buying-guide": [
        "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80",
        "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=1600&q=80",
        "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1600&q=80",
        "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=1600&q=80",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80",
        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1600&q=80",
        "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=1600&q=80",
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1600&q=80",
    ],
    "local": [
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1600&q=80",
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80",
        "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&q=80",
        "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=1600&q=80",
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1600&q=80",
        "https://images.unsplash.com/photo-1494783367193-149034c05e8f?w=1600&q=80",
        "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80",
        "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1600&q=80",
    ],
    "model-review": [
        "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=80",
        "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1600&q=80",
        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=80",
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1600&q=80",
        "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=1600&q=80",
        "https://images.unsplash.com/photo-1555626906-fcf10d6851b4?w=1600&q=80",
        "https://images.unsplash.com/photo-1494905998402-395d579af36f?w=1600&q=80",
        "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?w=1600&q=80",
    ],
};

export function pickHeroImage(category, featuredCar, recentHeroUrls = []) {
    if (category === "model-review" && featuredCar?.main_image_url) {
        return featuredCar.main_image_url;
    }
    const pool = HERO_POOL[category] || HERO_POOL["buying-guide"];
    const used = new Set((recentHeroUrls || []).filter(Boolean));
    const fresh = pool.filter((url) => !used.has(url));
    const source = fresh.length > 0 ? fresh : pool;
    return source[Math.floor(Math.random() * source.length)];
}

export function slugify(text) {
    return String(text || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
}

export function countWords(text) {
    return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

export function estimateReadingMinutes(text) {
    const words = countWords(text);
    return Math.max(1, Math.round(words / 220));
}

const _ctrlRe = (() => { const r = []; r.push(String.fromCharCode(0)+"-"+String.fromCharCode(8)); r.push(String.fromCharCode(0xB)); r.push(String.fromCharCode(0xC)); r.push(String.fromCharCode(0xE)+"-"+String.fromCharCode(0x1F)); r.push(String.fromCharCode(0x7F)); return new RegExp("["+r.join("")+"]","g"); })();
function sanitizeForJson(text) {
    return text.replace(_ctrlRe, "").trim();
}

/**
 * Try multiple repair strategies on a JSON string, returning the first
 * parseable result. Throws if all strategies fail.
 */
function repairJson(jsonStr) {
    const attempts = [
        // Pass 0: original
        jsonStr,
        // Pass 1: fix literal newlines/tabs inside quoted string values
        jsonStr.replace(/("(?:[^"\\]|\\.)*")/g, (m) =>
            m.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
        ),
        // Pass 2: remove trailing commas before } or ]
        jsonStr.replace(/,\s*([}\]])/g, "$1"),
        // Pass 3: escape lone backslashes not part of a valid JSON escape
        jsonStr.replace(/\\(?!["\\/bfnrtu])/g, "\\\\"),
        // Pass 4: pass 2 + pass 3 combined
        jsonStr
            .replace(/,\s*([}\]])/g, "$1")
            .replace(/\\(?!["\\/bfnrtu])/g, "\\\\"),
    ];

    for (const attempt of attempts) {
        try {
            return JSON.parse(attempt);
        } catch {
            // try next
        }
    }
    throw new Error("All JSON repair attempts failed");
}

function extractJson(text) {
    const cleaned = sanitizeForJson(
        text.replace(/```json/gi, "").replace(/```/g, "")
    );
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) throw new Error("No JSON object found in AI response");
    const jsonStr = cleaned.slice(firstBrace, lastBrace + 1);

    return repairJson(jsonStr);
}

async function runClaude(prompt) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Missing ANTHROPIC_API_KEY");
    }
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [
            {
                role: "user",
                content: `${prompt}\n\nReturn ONLY the raw JSON object — no markdown code fences, no commentary before or after.`,
            },
        ],
    });

    const text = (msg.content || [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("");

    // Claude usually returns clean JSON; fall back to extractJson with multiple
    // repair strategies for edge cases (fences, stray prose).
    try {
        return JSON.parse(text);
    } catch {
        try {
            return extractJson(text);
        } catch (repairErr) {
            console.error("[newsGenerator] JSON parse failed. Raw snippet (first 400 chars):", text.slice(0, 400));
            console.error("[newsGenerator] Raw snippet (last 200 chars):", text.slice(-200));
            throw new Error(`Failed to parse AI response as JSON: ${repairErr.message}`);
        }
    }
}

function buildBuyingGuidePrompt(topic) {
    return `
You are an expert automotive copywriter writing for ${DEALERSHIP.name} (${DEALERSHIP.location}).
Target audience: ${DEALERSHIP.audience}.

Write a helpful, trustworthy 1200-1500 word buying guide article on this topic:
"${topic}"

Requirements:
- Tone: practical, friendly, South African English. No hype. No "new" — we sell pre-owned.
- Must be SEO-optimized for South African car-buying searches.
- Include a clear H2 heading structure (use markdown: ## for H2, ### for H3).
- Break content into 5-7 subsections with H2 headings.
- Include a short intro paragraph (no heading) before the first H2.
- Use bullet lists and numbered lists where natural.
- End with a soft CTA paragraph mentioning ${DEALERSHIP.name} in ${DEALERSHIP.location} and linking to inventory using markdown: [our inventory](/inventory).
- Do NOT fabricate prices, brands, or specific models you are unsure of.
- Write in plain markdown only — no front-matter, no code fences.

Return ONLY valid JSON with this exact shape:
{
  "title": "Punchy article title, 60 chars max ideally",
  "slug": "url-slug-no-special-chars",
  "excerpt": "1-2 sentence summary, 160 chars max",
  "meta_title": "SEO title for <title> tag, 55-60 chars",
  "meta_description": "SEO meta description, 140-155 chars",
  "body_md": "The full 1200-1500 word markdown article body"
}
`.trim();
}

function buildLocalPrompt(topic) {
    return `
You are a local South African travel and motoring writer for ${DEALERSHIP.name} (${DEALERSHIP.location}).
Target audience: ${DEALERSHIP.audience}, especially locals in Mpumalanga and the Lowveld.

Write an engaging 1200-1500 word local-interest article on this topic:
"${topic}"

Requirements:
- Tone: warm, local, knowledgeable, South African English.
- Include specific place names in Mpumalanga / the Lowveld / Panorama Route where relevant.
- Include practical driving tips and route suggestions.
- Markdown structure: intro paragraph, then 5-7 H2 subsections, bullets/lists where useful.
- End with a soft CTA mentioning ${DEALERSHIP.name} in White River, linking to [our inventory](/inventory).
- Do NOT fabricate facts. If unsure, speak generally about the region.
- Plain markdown only.

Return ONLY valid JSON with this exact shape:
{
  "title": "Punchy article title, 60 chars max ideally",
  "slug": "url-slug-no-special-chars",
  "excerpt": "1-2 sentence summary, 160 chars max",
  "meta_title": "SEO title for <title> tag, 55-60 chars",
  "meta_description": "SEO meta description, 140-155 chars",
  "body_md": "The full 1200-1500 word markdown article body"
}
`.trim();
}

function buildModelReviewPrompt(car) {
    const features = Array.isArray(car.features) && car.features.length > 0
        ? car.features.join(", ")
        : "standard features for its class";
    const price = car.price ? `R ${new Intl.NumberFormat("en-ZA").format(car.price)}` : "competitive pricing";
    return `
You are an expert automotive reviewer writing for ${DEALERSHIP.name} (${DEALERSHIP.location}).
Target audience: ${DEALERSHIP.audience}.

Write a 1200-1500 word honest buyer's review of this specific pre-owned vehicle currently on our floor.

Vehicle:
- ${car.year} ${car.make} ${car.model}
- Price: ${price}
- Mileage: ${car.mileage ? new Intl.NumberFormat("en-ZA").format(car.mileage) + " km" : "unspecified"}
- Transmission: ${car.transmission || "unspecified"}
- Fuel: ${car.fuel_type || "unspecified"}
- Features: ${features}

Requirements:
- Tone: honest, expert, friendly, South African English. Useful to someone deciding.
- Structure (markdown): intro paragraph → ## At a glance → ## On the road → ## Interior and features → ## Running costs and economy → ## Who this is for → ## The verdict.
- Include specific references to SA driving conditions (Lowveld, highway, gravel where relevant).
- Be balanced: mention trade-offs as well as strengths.
- Do NOT invent specs you aren't sure about. If unsure, say "typical for this class" or "as tested on our floor".
- End verdict with a soft CTA pointing to the live listing using markdown: [view this vehicle](/inventory/${car.id}).
- Plain markdown only.

Return ONLY valid JSON with this exact shape:
{
  "title": "e.g., '${car.year} ${car.make} ${car.model} Review: Is It Worth It?' (60 chars max ideally)",
  "slug": "url-slug-no-special-chars",
  "excerpt": "1-2 sentence summary, 160 chars max",
  "meta_title": "SEO title for <title> tag, 55-60 chars",
  "meta_description": "SEO meta description, 140-155 chars",
  "body_md": "The full 1200-1500 word markdown review"
}
`.trim();
}

export async function pickNextCategory(recentCategories) {
    const counts = { "buying-guide": 0, "local": 0, "model-review": 0 };
    (recentCategories || []).forEach((c) => { if (counts[c] !== undefined) counts[c]++; });
    const minCount = Math.min(...Object.values(counts));
    const candidates = Object.keys(counts).filter((c) => counts[c] === minCount);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

export function pickBuyingGuideTopic(usedTitles) {
    const used = new Set((usedTitles || []).map((t) => String(t).toLowerCase()));
    const pool = BUYING_GUIDE_TOPICS.filter((t) => !used.has(t.toLowerCase()));
    const source = pool.length > 0 ? pool : BUYING_GUIDE_TOPICS;
    return source[Math.floor(Math.random() * source.length)];
}

export function pickLocalTopic(usedTitles) {
    const used = new Set((usedTitles || []).map((t) => String(t).toLowerCase()));
    const pool = LOCAL_TOPICS.filter((t) => !used.has(t.toLowerCase()));
    const source = pool.length > 0 ? pool : LOCAL_TOPICS;
    return source[Math.floor(Math.random() * source.length)];
}



export async function generateNewsArticle({ category, recentTitles, car }) {
    let prompt;
    if (category === "buying-guide") {
        const topic = pickBuyingGuideTopic(recentTitles);
        prompt = buildBuyingGuidePrompt(topic);
    } else if (category === "local") {
        const topic = pickLocalTopic(recentTitles);
        prompt = buildLocalPrompt(topic);
    } else if (category === "model-review") {
        if (!car) throw new Error("model-review requires a car payload");
        prompt = buildModelReviewPrompt(car);
    } else {
        throw new Error(`Unknown category: ${category}`);
    }

    const article = await runClaude(prompt);

    if (!article.title || !article.body_md) {
        throw new Error("AI returned incomplete article (missing title or body_md)");
    }

    const slug = slugify(article.slug || article.title);
    return {
        category,
        title: String(article.title).trim(),
        slug,
        excerpt: article.excerpt ? String(article.excerpt).trim() : null,
        meta_title: article.meta_title ? String(article.meta_title).trim() : null,
        meta_description: article.meta_description ? String(article.meta_description).trim() : null,
        body_md: String(article.body_md).trim(),
        reading_minutes: estimateReadingMinutes(article.body_md),
    };
}
