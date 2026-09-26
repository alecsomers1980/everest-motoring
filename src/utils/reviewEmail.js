import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { Resend } from "resend";
import { sendEmail } from "@/lib/resend";
import { PostSaleReviewEmail } from "@/emails/PostSaleReview";

// Cancel the currently-scheduled post-sale review email and re-schedule it with
// the finished handover video embedded. Plain server helper (NOT a server
// action) so it can be shared by the sale actions and the advance-sale-video
// cron without exposing an unauthenticated email-sending endpoint.
export async function rescheduleReviewEmailWithVideo({ saleId, oldEmailId, buyerEmail, buyerName, vehicleModel, carImageUrl, deliveryPhotoUrl, videoUrl, postedToSocial = true, scheduledFor }) {
    const admin = await createAdminClient();

    // Cancel the old scheduled email — Resend doesn't allow content updates on scheduled mail.
    try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.cancel(oldEmailId);
    } catch (err) {
        console.warn("Failed to cancel previous review email (continuing to schedule new):", err);
    }

    const reviewUrl =
        process.env.GOOGLE_REVIEW_URL ||
        "https://www.google.com/search?q=Everest+Motoring+White+River";

    const result = await sendEmail({
        to: buyerEmail,
        subject: `Congratulations on your ${vehicleModel}`,
        react: React.createElement(PostSaleReviewEmail, {
            customerName: buyerName,
            vehicleModel,
            carImageUrl,
            deliveryPhotoUrl,
            videoUrl,
            reviewUrl,
            postedToSocial,
        }),
        scheduledAt: scheduledFor.toISOString(),
    });

    if (result.success && result.data?.id) {
        await admin
            .from("sales")
            .update({ review_email_id: result.data.id })
            .eq("id", saleId);
    } else if (!result.success) {
        console.warn("Re-schedule with video failed:", result.error);
    }
}
