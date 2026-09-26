import { NextResponse } from "next/server";
import { publishDueNewsPosts } from "@/utils/news/publishPost";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        // No secret configured — only allow in dev.
        return process.env.NODE_ENV !== "production";
    }
    const authHeader = request.headers.get("authorization") || "";
    return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const published = await publishDueNewsPosts();
        return NextResponse.json({ success: true, count: published.length, published });
    } catch (err) {
        console.error("[cron/news-publish] failed:", err);
        if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
            try {
                const Sentry = await import("@sentry/nextjs");
                Sentry.captureException(err, { tags: { cron: "news-publish" } });
            } catch { /* sentry not installed */ }
        }
        return NextResponse.json(
            { success: false, error: err.message || "Publish failed" },
            { status: 500 }
        );
    }
}
