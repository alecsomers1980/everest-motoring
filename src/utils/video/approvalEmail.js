import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { VideoApprovalEmail } from "@/emails/VideoApproval";
import { signApproval } from "@/utils/video/approvalToken";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
const APPROVER_EMAIL = process.env.VIDEO_APPROVER_EMAIL || "alec@emb3r.co.za";

function approvalUrl(carId, action) {
    return `${SITE_URL}/video-approval?car=${carId}&action=${action}&sig=${signApproval(carId, action)}`;
}

function cloudflareUrls(videoUrl) {
    const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
    if (!videoUrl || !videoUrl.startsWith("cf:") || !subdomain) return {};
    const uid = videoUrl.slice(3);
    return {
        watch: `https://${subdomain}/${uid}/watch`,
        thumbnail: `https://${subdomain}/${uid}/thumbnails/thumbnail.jpg`,
    };
}

/**
 * Asks the approver to review a finished walkaround before its social posts go
 * out. The claim on video_approval_emailed_at is atomic, so the per-minute
 * pipeline cron can call this on any tick without ever sending twice.
 */
export async function sendVideoApprovalEmail(carId) {
    const admin = await createAdminClient();

    const { data: claimed } = await admin
        .from("cars")
        .update({
            video_approval_emailed_at: new Date().toISOString(),
            video_approval_status: "pending",
        })
        .eq("id", carId)
        .is("video_approval_emailed_at", null)
        .select("id, year, make, model, price, video_url, main_image_url");

    if (!claimed || claimed.length === 0) {
        return { success: false, skipped: "already requested" };
    }
    const car = claimed[0];

    const carLabel = [car.year, car.make, car.model].filter(Boolean).join(" ") || "New vehicle";
    const media = cloudflareUrls(car.video_url);

    const email = await sendEmail({
        to: APPROVER_EMAIL,
        subject: `Walkaround video ready for approval — ${carLabel}`,
        react: React.createElement(VideoApprovalEmail, {
            carLabel,
            priceLabel: car.price ? `R ${new Intl.NumberFormat("en-ZA").format(car.price)}` : "",
            thumbnailUrl: media.thumbnail || car.main_image_url,
            videoWatchUrl: media.watch || `${SITE_URL}/admin/inventory`,
            approveUrl: approvalUrl(car.id, "approve"),
            rejectUrl: approvalUrl(car.id, "reject"),
            scheduleNote:
                "Approve today and both posts go out tomorrow: the reel at 11:00 and the full walkthrough at 16:00.",
        }),
    });

    if (!email.success) {
        // Release the claim so the next tick retries rather than going silent.
        await admin.from("cars").update({ video_approval_emailed_at: null }).eq("id", carId);
        console.error("[sendVideoApprovalEmail] send failed:", email.error);
        return { success: false, error: email.error?.message || "Email send failed" };
    }

    return { success: true, to: APPROVER_EMAIL };
}
