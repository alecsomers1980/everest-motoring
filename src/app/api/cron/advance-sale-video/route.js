// This route handles Vercel cron calls (every minute) to finalize sale videos that are stuck in "generating",
// ensuring that closing the admin dialog doesn't block video completion. It polls Seedance, adds a congrats voiceover,
// and marks the sale video as ready.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/server";
import { pollSeedanceClip } from "@/utils/ai/seedanceService";
import { addCongratsVoiceover } from "@/utils/ai/congratsVoiceover";
import { postSoldVideoToEmber } from "@/app/admin/inventory/socialAction";
import { rescheduleReviewEmailWithVideo } from "@/utils/reviewEmail";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return (request.headers.get("authorization") || "") === "Bearer " + secret;
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await createAdminClient();

    // Find the oldest sale still generating a video
    const { data: sale } = await admin
      .from("sales")
      .select("id, car_id, buyer_name, sale_video_task_id, sale_video_status, buyer_email, delivery_photo_url, vehicle_year, vehicle_make, vehicle_model, vehicle_image_url, skip_social, review_email_id, review_email_sent_at, review_email_scheduled_for")
      .eq("sale_video_status", "generating")
      .not("sale_video_task_id", "is", null)
      .order("sale_video_started_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!sale) {
      return NextResponse.json({ idle: true });
    }

    // Poll the remote clip generation service
    const poll = await pollSeedanceClip(sale.sale_video_task_id);

    if (poll.isComplete && poll.videoUrl) {
      // Mark as finalizing to prevent duplicate processing
      await admin
        .from("sales")
        .update({ sale_video_status: "finalizing" })
        .eq("id", sale.id);

      let finalUrl = poll.videoUrl;

      // Resolve vehicle label + image from the inventory car or, for off-inventory
      // sales (car_id null), the fields stored on the sale itself.
      let vehicleLabel;
      let carImageUrl;
      if (sale.car_id) {
        const { data: car } = await admin
          .from("cars")
          .select("make, model, year, main_image_url")
          .eq("id", sale.car_id)
          .single();
        vehicleLabel = car
          ? `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim()
          : "";
        carImageUrl = car?.main_image_url || null;
      } else {
        vehicleLabel = [sale.vehicle_year, sale.vehicle_make, sale.vehicle_model]
          .filter(Boolean)
          .join(" ");
        carImageUrl = sale.vehicle_image_url || null;
      }

      const carLabel = vehicleLabel || "vehicle";

      try {
        finalUrl = await addCongratsVoiceover(poll.videoUrl, {
          fullName: sale.buyer_name,
          carLabel,
          carId: sale.car_id,
        });
      } catch (e) {
        console.warn(
          "[advance-sale-video] voiceover mux failed, using silent clip:",
          e.message
        );
      }

      // Finalize: store the video URL and move to ready
      await admin
        .from("sales")
        .update({
          sale_video_status: "ready",
          sale_video_url: finalUrl,
          sale_video_completed_at: new Date().toISOString(),
        })
        .eq("id", sale.id);

      // Re-embed the finished video into the still-scheduled review email (the
      // client-poll path does this too; here it covers videos finalized while the
      // admin dialog is closed — the common case now that videos auto-start).
      if (
        sale.review_email_id &&
        !sale.review_email_sent_at &&
        sale.review_email_scheduled_for &&
        sale.buyer_email
      ) {
        const scheduledDate = new Date(sale.review_email_scheduled_for);
        if (scheduledDate > new Date(Date.now() + 60_000)) {
          try {
            await rescheduleReviewEmailWithVideo({
              saleId: sale.id,
              oldEmailId: sale.review_email_id,
              buyerEmail: sale.buyer_email,
              buyerName: sale.buyer_name,
              vehicleModel: vehicleLabel || "your new vehicle",
              carImageUrl,
              deliveryPhotoUrl: sale.delivery_photo_url,
              videoUrl: finalUrl,
              postedToSocial: !sale.skip_social,
              scheduledFor: scheduledDate,
            });
          } catch (e) {
            console.warn(
              "[advance-sale-video] failed to re-embed video into review email:",
              e.message
            );
          }
        }
      }

      // Queue the celebration video to Everest's social pages (pending approval
      // in ember-social), scheduled for the morning of the review-email day.
      await postSoldVideoToEmber(sale.id);

      return NextResponse.json({ finalized: sale.id });
    }

    if (poll.error) {
      // Record the failure reason
      await admin
        .from("sales")
        .update({
          sale_video_status: "failed",
          sale_video_error: poll.error,
        })
        .eq("id", sale.id);

      return NextResponse.json({ failed: sale.id, error: poll.error });
    }

    // Still generating
    return NextResponse.json({ pending: sale.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
