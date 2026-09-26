const CF_API = "https://api.cloudflare.com/client/v4";

function requireEnv() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    if (!accountId || !apiToken) {
        throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_STREAM_API_TOKEN env vars.");
    }
    return { accountId, apiToken };
}

function authHeaders(apiToken) {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
    };
}

/**
 * Pulls a video from a public URL into Cloudflare Stream.
 * Returns { uid, status } — video is async-processed; poll `getStreamStatus(uid)` for readiness.
 */
export async function createStreamFromUrl(videoUrl, metadata = {}) {
    const { accountId, apiToken } = requireEnv();
    const res = await fetch(`${CF_API}/accounts/${accountId}/stream/copy`, {
        method: "POST",
        headers: authHeaders(apiToken),
        body: JSON.stringify({
            url: videoUrl,
            meta: metadata,
            downloadable: true,
        }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
        // Cloudflare's v4 API hides specifics in `errors[].code` and the
        // separate `messages[]` array. Surface both plus HTTP status so
        // failures are diagnosable from the UI without trawling Vercel logs.
        console.error(`[CF Stream] /stream/copy failed (HTTP ${res.status}). Source URL: ${videoUrl}. Full response:`, JSON.stringify(data));
        const errStr = (data.errors || []).map(e => `[${e.code ?? '?'}] ${e.message ?? ''}`).join(' | ');
        const msgStr = (data.messages || []).map(m => typeof m === 'string' ? m : (m.message ?? JSON.stringify(m))).join(' | ');
        const composed = [errStr, msgStr].filter(Boolean).join(' :: ') || 'Cloudflare Stream copy failed';
        throw new Error(`CF /stream/copy: ${composed} (HTTP ${res.status})`);
    }

    // NOTE: Do NOT trigger /downloads here — stream/copy returns before the
    // video has been ingested, and CF rejects POST /downloads with
    // "Video is not ready" (code 10005) until readyToStream=true. Callers must
    // invoke enableDownloads(uid) explicitly once they need the MP4 URL; that
    // function polls for readiness before triggering MP4 generation.
    const uid = data.result.uid;
    return { uid, status: data.result.status?.state };
}

export async function getStreamStatus(uid) {
    const { accountId, apiToken } = requireEnv();
    const res = await fetch(`${CF_API}/accounts/${accountId}/stream/${uid}`, {
        headers: authHeaders(apiToken),
    });
    const data = await res.json();
    if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "Failed to fetch Cloudflare stream status");
    }
    return {
        uid: data.result.uid,
        state: data.result.status?.state,
        readyToStream: data.result.readyToStream,
        duration: data.result.duration,
    };
}

/**
 * Enable the MP4 download for a Cloudflare Stream video (required for
 * Facebook/Instagram publishing — those platforms only accept static MP4s).
 *
 * Returns only once the `default.mp4` URL is actually fetchable. Throws with
 * a clear message on timeout or error state. A single maxWaitMs budget covers
 * all three phases (ingest readiness, POST, MP4 render) so callers can reason
 * about an upper bound on wall-clock time.
 */
export async function enableDownloads(uid, opts = {}) {
    const { maxWaitMs = 180000, pollIntervalMs = 4000 } = opts;
    const { accountId, apiToken } = requireEnv();
    const startTime = Date.now();
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Phase 1: wait for the video to finish ingesting.
    while (true) {
        const res = await fetch(`${CF_API}/accounts/${accountId}/stream/${uid}`, {
            headers: authHeaders(apiToken),
        });
        const data = await res.json();
        if (!data.success) {
            throw new Error(data.errors?.[0]?.message || "Failed to fetch Cloudflare stream status");
        }
        if (data.result?.status?.state === "error") {
            throw new Error(data.result.status?.errorReasonText || `Cloudflare video ${uid} is in error state`);
        }
        if (data.result?.readyToStream === true) break;
        if (Date.now() - startTime >= maxWaitMs) {
            throw new Error(`Cloudflare video ${uid} not ready after ${maxWaitMs}ms`);
        }
        await sleep(pollIntervalMs);
    }

    // Phase 2: trigger MP4 generation. Check res.ok AND body.success — CF
    // returns 4xx with success:false for rejections that fetch() doesn't throw.
    const postRes = await fetch(`${CF_API}/accounts/${accountId}/stream/${uid}/downloads`, {
        method: "POST",
        headers: authHeaders(apiToken),
    });
    const postData = await postRes.json();
    if (!postRes.ok || !postData.success) {
        console.error(`[CF Stream] POST /downloads failed for ${uid} (HTTP ${postRes.status}). Full response:`, JSON.stringify(postData));
        const errStr = (postData.errors || []).map(e => `[${e.code ?? '?'}] ${e.message ?? ''}`).join(' | ');
        const msgStr = (postData.messages || []).map(m => typeof m === 'string' ? m : (m.message ?? JSON.stringify(m))).join(' | ');
        const composed = [errStr, msgStr].filter(Boolean).join(' :: ') || 'Failed to enable Cloudflare downloads';
        throw new Error(`CF /downloads: ${composed} (HTTP ${postRes.status})`);
    }

    // Phase 3: wait for the MP4 render — until default.status === "ready" the
    // URL still 404s. Same maxWaitMs budget as phases 1+2.
    while (true) {
        const res = await fetch(`${CF_API}/accounts/${accountId}/stream/${uid}/downloads`, {
            headers: authHeaders(apiToken),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            const msg = data.errors?.[0]?.message || "Failed to poll Cloudflare download status";
            throw new Error(`${msg} (HTTP ${res.status})`);
        }
        const def = data.result?.default;
        if (def?.status === "ready") return data.result;
        if (def?.status === "error") {
            throw new Error(`Cloudflare MP4 generation failed for video ${uid}`);
        }
        if (Date.now() - startTime >= maxWaitMs) {
            throw new Error(`Cloudflare MP4 for ${uid} not ready after ${maxWaitMs}ms (state=${def?.status ?? "missing"})`);
        }
        await sleep(pollIntervalMs);
    }
}

export function getHlsUrl(uid) {
    const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    if (!subdomain) throw new Error("Missing CLOUDFLARE_STREAM_SUBDOMAIN env var");
    return `https://${subdomain}/${uid}/manifest/video.m3u8`;
}

export function getMp4Url(uid) {
    const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    if (!subdomain) throw new Error("Missing CLOUDFLARE_STREAM_SUBDOMAIN env var");
    return `https://${subdomain}/${uid}/downloads/default.mp4`;
}

export function getIframeUrl(uid) {
    const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    if (!subdomain) throw new Error("Missing CLOUDFLARE_STREAM_SUBDOMAIN env var");
    return `https://${subdomain}/${uid}/iframe`;
}

/**
 * Deletes a Cloudflare Stream entry. Returns true if removed (or already gone),
 * false on transient failure. Never throws — callers should treat CF cleanup as
 * best-effort: a failure here must not block deleting the parent car record.
 */
export async function deleteStream(uid) {
    if (!uid) return true;
    try {
        const { accountId, apiToken } = requireEnv();
        const res = await fetch(`${CF_API}/accounts/${accountId}/stream/${uid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiToken}` },
        });
        // 200/204 = deleted, 404 = already gone; both are success
        if (res.status === 200 || res.status === 204 || res.status === 404) return true;
        const text = await res.text().catch(() => "");
        console.warn(`[CF Stream] delete ${uid} returned ${res.status}: ${text.slice(0, 200)}`);
        return false;
    } catch (err) {
        console.warn(`[CF Stream] delete ${uid} threw: ${err.message}`);
        return false;
    }
}

/**
 * Helper: if `videoUrl` is in `cf:<uid>` form, delete that CF Stream entry.
 * Anything else (null, error states, mux:, etc.) is a no-op.
 */
export async function deleteStreamFromVideoUrl(videoUrl) {
    if (typeof videoUrl !== "string" || !videoUrl.startsWith("cf:")) return true;
    const uid = videoUrl.split(":")[1];
    return deleteStream(uid);
}
