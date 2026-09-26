/**
 * Unified AI provider chain.
 * Tries Gemini 2.5 Flash first (free tier, primary).
 * Falls back to Claude Haiku 4.5 when Gemini exhausts retries on transient errors.
 *
 * Both providers support vision via the optional imageUrl parameter.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const TRANSIENT_STATUSES = new Set([429, 500, 502, 503, 504, 529]);

async function callWithRetry(fn, label, maxAttempts) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err?.status || err?.response?.status;
            const isTransient = TRANSIENT_STATUSES.has(status);
            console.warn(`[${label}] attempt ${attempt}/${maxAttempts} failed (status=${status}): ${err.message}`);
            if (!isTransient || attempt === maxAttempts) throw err;
            const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
            await new Promise((r) => setTimeout(r, delay));
        }
    }
    throw lastErr;
}

async function fetchImage(imageUrl) {
    if (!imageUrl) return null;
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";
        return { base64, mimeType };
    } catch (e) {
        console.warn(`[aiProviderChain] image fetch failed: ${e.message}`);
        return null;
    }
}

async function callGemini({ prompt, image, maxOutputTokens }) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        throw new Error("GOOGLE_GEMINI_API_KEY not set");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { maxOutputTokens },
    });
    const parts = [prompt];
    if (image) {
        parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
    }
    const result = await callWithRetry(() => model.generateContent(parts), "gemini", 4);
    return result.response.text();
}

async function callClaude({ prompt, image, maxOutputTokens }) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY not set");
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const content = [];
    if (image) {
        content.push({
            type: "image",
            source: { type: "base64", media_type: image.mimeType, data: image.base64 },
        });
    }
    content.push({ type: "text", text: prompt });
    const result = await callWithRetry(
        () =>
            client.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: maxOutputTokens,
                messages: [{ role: "user", content }],
            }),
        "claude",
        3
    );
    return result.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim();
}

/**
 * Run a prompt through Gemini → Claude Haiku 4.5 with retries.
 * @param {Object} opts
 * @param {string} opts.prompt - The user prompt
 * @param {string} [opts.imageUrl] - Optional image URL for vision
 * @param {string} [opts.label] - Log label
 * @param {number} [opts.maxOutputTokens] - Max output tokens (default 2048)
 * @returns {Promise<{ text: string, providerUsed: 'gemini' | 'claude-haiku-4-5' }>}
 */
export async function runWithFallback({
    prompt,
    imageUrl = null,
    label = "ai",
    maxOutputTokens = 2048,
}) {
    const image = await fetchImage(imageUrl);

    try {
        const text = await callGemini({ prompt, image, maxOutputTokens });
        return { text, providerUsed: "gemini" };
    } catch (geminiErr) {
        console.warn(
            `[${label}] Gemini exhausted — falling back to Claude Haiku 4.5: ${geminiErr.message}`
        );
    }

    try {
        const text = await callClaude({ prompt, image, maxOutputTokens });
        return { text, providerUsed: "claude-haiku-4-5" };
    } catch (claudeErr) {
        console.error(`[${label}] Both providers failed. Claude error: ${claudeErr.message}`);
        const e = new Error(`Both AI providers failed for ${label}: ${claudeErr.message}`);
        e.bothProvidersFailed = true;
        throw e;
    }
}
