import * as React from "react";
import { NextResponse } from "next/server";
import { generateNewsPost } from "@/app/admin/news/actions";
import { sendEmail } from "@/lib/resend";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

export const runtime = "nodejs";
export const maxDuration = 300;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
const EDITORIAL_EMAIL = ["anton@everestmotoring.co.za", "info@everestmotoring.co.za"];

// Publish slots: two articles a month, on the 7th and the 21st.
const PUBLISH_DAYS = [7, 21];

function isAuthorized(request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        // No secret configured — only allow in dev.
        return process.env.NODE_ENV !== "production";
    }
    const authHeader = request.headers.get("authorization") || "";
    return authHeader === `Bearer ${cronSecret}`;
}

function slotDate(day) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day))
        .toISOString()
        .slice(0, 10);
}

function formatDay(iso) {
    return new Date(iso).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        timeZone: "UTC",
    });
}

export async function GET(request) {
    if (!isAuthorized(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Generated sequentially, not in parallel: each run reads the recent
        // posts to pick its category and topic, so the second article only
        // varies from the first if the first is already saved.
        const posts = [];
        for (const day of PUBLISH_DAYS) {
            const scheduledFor = slotDate(day);
            const post = await generateNewsPost({ scheduledFor });
            posts.push({ ...post, scheduled_for: scheduledFor });
        }

        const monthLabel = new Date().toLocaleDateString("en-ZA", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        });

        const details = posts.map((p) => ({
            label: `Publishes ${formatDay(p.scheduled_for)}`,
            value: p.title,
        }));
        details.push({
            label: "Action needed",
            value: "Approve each article in the Editorial Desk. An article that is not approved does not publish.",
        });

        const email = await sendEmail({
            to: EDITORIAL_EMAIL,
            subject: `${posts.length} draft articles need approval — ${monthLabel}`,
            react: React.createElement(SystemNotificationEmail, {
                subject: `Draft articles for ${monthLabel}`,
                details,
                actionLink: `${SITE_URL}/admin/news`,
                actionLabel: "Review in Editorial Desk",
            }),
        });

        if (!email.success) {
            console.error("[cron/news-monthly] approval email failed:", email.error);
        }

        return NextResponse.json({
            success: true,
            emailed: email.success,
            posts: posts.map((p) => ({
                id: p.id,
                slug: p.slug,
                title: p.title,
                category: p.category,
                status: p.status,
                scheduled_for: p.scheduled_for,
            })),
        });
    } catch (err) {
        console.error("[cron/news-monthly] failed:", err);
        if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
            try {
                const Sentry = await import("@sentry/nextjs");
                Sentry.captureException(err, { tags: { cron: "news-monthly" } });
            } catch { /* sentry not installed */ }
        }
        return NextResponse.json(
            { success: false, error: err.message || "Generation failed" },
            { status: 500 }
        );
    }
}
