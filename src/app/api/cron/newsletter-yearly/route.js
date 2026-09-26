import { NextResponse } from "next/server";
import { sendNewsletterToSubscribers } from "@/lib/newsletter";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return (request.headers.get("authorization") || "") === "Bearer " + secret;
}

export async function GET(request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await sendNewsletterToSubscribers();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error("[cron/newsletter-yearly] failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
