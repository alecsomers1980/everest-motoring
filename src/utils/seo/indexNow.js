const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

export function getIndexNowKey() {
    return process.env.INDEXNOW_KEY || null;
}

export function getKeyLocation() {
    return `${SITE_URL}/api/seo/indexnow-key`;
}

export async function submitToIndexNow(urls) {
    const key = getIndexNowKey();
    if (!key) return { skipped: true, reason: "INDEXNOW_KEY not set" };

    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    if (list.length === 0) return { skipped: true, reason: "no urls" };

    const host = new URL(SITE_URL).host;
    // IndexNow requires a publicly reachable host — skip on localhost
    if (host === "localhost" || host.startsWith("127.") || host.startsWith("192.168.")) {
        return { skipped: true, reason: "non-public host", host, count: list.length };
    }
    const body = {
        host,
        key,
        keyLocation: getKeyLocation(),
        urlList: list,
    };

    try {
        const res = await fetch("https://api.indexnow.org/IndexNow", {
            method: "POST",
            headers: { "Content-Type": "application/json; charset=utf-8" },
            body: JSON.stringify(body),
        });
        return { ok: res.ok, status: res.status, count: list.length };
    } catch (err) {
        console.error("IndexNow submit failed:", err);
        return { ok: false, error: err.message };
    }
}
