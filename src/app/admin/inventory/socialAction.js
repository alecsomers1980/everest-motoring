"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { getVehicleUrl as buildVehicleUrl } from "@/utils/url/vehicleUrl";
import { notifyApprovedAffiliates } from "@/utils/affiliate/notifyApprovedAffiliates";
import {
    REEL_SLOT_UTC,
    VIDEO_SLOT_UTC,
    slotIso,
    postingDay,
    chooseFeedSlot,
    feedLookbackFrom,
} from "@/utils/social/schedule";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
const CONTACT = {
    phone: "013 854 0600",
    email: "info@everestmotoring.co.za",
    location: "White River, Mpumalanga",
};

function formatPrice(price) {
    return new Intl.NumberFormat("en-ZA").format(price);
}

function getVehicleUrl(car) {
    return buildVehicleUrl(car, SITE_URL);
}

function getVideoUrl(car) {
    if (
        car.video_url &&
        !car.video_url.startsWith("ai_") &&
        !car.video_url.startsWith("mux_") &&
        !car.video_url.startsWith("cf_") &&
        !car.video_url.startsWith("error")
    ) {
        // Cloudflare Stream MP4 download URL
        if (car.video_url.startsWith("cf:")) {
            const uid = car.video_url.replace("cf:", "");
            const subdomain = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
            return `https://${subdomain}/${uid}/downloads/default.mp4`;
        }
        // Mux legacy static MP4 URL (FB/IG don't accept HLS/m3u8)
        if (car.video_url.startsWith("mux:")) {
            const playbackId = car.video_url.replace("mux:", "");
            return `https://stream.mux.com/${playbackId}/capped-1080p.mp4`;
        }
        return car.video_url;
    }
    return null;
}

function getAllMedia(car) {
    const media = [];
    if (car.main_image_url) media.push(car.main_image_url);
    if (car.gallery_urls && Array.isArray(car.gallery_urls)) {
        car.gallery_urls.forEach((url) => {
            if (url && !media.includes(url)) media.push(url);
        });
    }
    return media;
}

function buildFeedPost(car) {
    const price = formatPrice(car.price);
    const url = getVehicleUrl(car);
    const images = getAllMedia(car);

    const lines = [
        `🚗 ${car.year} ${car.make} ${car.model}`,
        `💰 Price: R ${price}`,
    ];
    if (car.mileage) lines.push(`📏 Mileage: ${car.mileage.toLocaleString("en-ZA")} km`);
    if (car.transmission) lines.push(`⚙️ ${car.transmission}`);
    if (car.fuel_type) lines.push(`⛽ ${car.fuel_type}`);

    lines.push("");
    if (car.description) {
        // Send the full description — ember-social's AI rewrite step shortens
        // and rephrases per platform. Truncating here hides text from the
        // rewriter and leaves a literal "..." in the published copy.
        lines.push(car.description);
        lines.push("");
    }

    if (car.features && car.features.length > 0) {
        lines.push("✅ " + car.features.slice(0, 6).join(" • "));
        lines.push("");
    }

    lines.push(`🔗 View & enquire: ${url}`);
    lines.push("");
    lines.push(`📞 ${CONTACT.phone}`);
    lines.push(`📧 ${CONTACT.email}`);
    lines.push(`📍 ${CONTACT.location}`);
    lines.push("");
    lines.push("#EverestMotoring #PreOwned #UsedCars #Mpumalanga #WhiteRiver");

    return {
        content: lines.join("\n"),
        media_urls: images,
        platforms: ["facebook", "instagram"],
    };
}

function buildReelPost(car) {
    const price = formatPrice(car.price);
    const url = getVehicleUrl(car);
    const video = getVideoUrl(car);
    const images = getAllMedia(car);

    const lines = [
        `🔥 ${car.year} ${car.make} ${car.model} — R ${price}`,
        "",
        car.description ||
            `Premium pre-owned ${car.make} ${car.model} available now at Everest Motoring.`,
        "",
        `👉 Link in bio or DM us!`,
        `📞 ${CONTACT.phone}`,
        `🔗 ${url}`,
        "",
        "#EverestMotoring #CarReels #UsedCars #CarDealer #Mpumalanga #CarsOfSouthAfrica",
    ];

    return {
        content: lines.join("\n"),
        media_urls: video ? [video, ...images.slice(0, 2)] : images.slice(0, 3),
        platforms: ["facebook", "instagram", "tiktok", "youtube"],
    };
}

function buildVideoPost(car) {
    const price = formatPrice(car.price);
    const url = getVehicleUrl(car);
    const video = getVideoUrl(car);
    const images = getAllMedia(car);

    const lines = [
        `${car.year} ${car.make} ${car.model} | Full Walkthrough`,
        "",
        `Price: R ${price}`,
    ];
    if (car.mileage) lines.push(`Mileage: ${car.mileage.toLocaleString("en-ZA")} km`);
    if (car.transmission) lines.push(`Transmission: ${car.transmission}`);
    if (car.fuel_type) lines.push(`Fuel: ${car.fuel_type}`);
    lines.push("");

    if (car.description) {
        lines.push(car.description);
        lines.push("");
    }

    if (car.features && car.features.length > 0) {
        lines.push("Features:");
        car.features.forEach((f) => lines.push(`• ${f}`));
        lines.push("");
    }

    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(`🏢 Everest Motoring — Premium Pre-Owned Vehicles`);
    lines.push(`📞 Call: ${CONTACT.phone}`);
    lines.push(`📧 Email: ${CONTACT.email}`);
    lines.push(`📍 ${CONTACT.location}`);
    lines.push(`🌐 ${url}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push(
        "#EverestMotoring #CarReview #PreOwned #UsedCars #CarDealer #Mpumalanga #WhiteRiver #CarsOfSouthAfrica"
    );

    return {
        content: lines.join("\n"),
        media_urls: video ? [video] : images,
        platforms: ["youtube", "facebook"],
    };
}

function getScheduleTimes() {
    // All posts go out same day at 9:30, 13:00, 16:00 SAST (UTC+2)
    // The trigger API allows multiple posts per vehicle on the same day (1 car/day max)
    return {
        feedTime: "07:30",   // 9:30 SAST
        reelTime: "11:00",   // 13:00 SAST
        videoTime: "14:00",  // 16:00 SAST
    };
}

// Earliest feed slot from tomorrow onward that no other vehicle holds. The
// slot maths lives in @/utils/social/schedule so it can be tested directly.
async function nextFeedSlot(admin) {
    const { data } = await admin
        .from("cars")
        .select("feed_post_scheduled_at")
        .not("feed_post_scheduled_at", "is", null)
        .gte("feed_post_scheduled_at", feedLookbackFrom());

    return chooseFeedSlot((data || []).map((row) => row.feed_post_scheduled_at));
}

async function sendToEmber(payload, apiKey, apiUrl) {
    const response = await fetch(`${apiUrl}/api/trigger`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || response.statusText);
    }

    return response.json();
}

export async function createSocialPost(car) {
    const apiKey = process.env.EMBER_SOCIAL_API_KEY;
    if (!apiKey) {
        return { success: false, error: "EMBER_SOCIAL_API_KEY is not configured." };
    }

    const apiUrl = process.env.EMBER_SOCIAL_URL || "http://localhost:3000";
    const times = getScheduleTimes();

    try {
        // Send all 3 post types with preferred times — the trigger API will
        // assign the actual date (today or next available day, max 2 cars/day)
        const posts = [
            { ...buildFeedPost(car), preferred_time: times.feedTime, vehicle_id: car.id, post_kind: "feed" },
            { ...buildReelPost(car), preferred_time: times.reelTime, vehicle_id: car.id, post_kind: "reel" },
            { ...buildVideoPost(car), preferred_time: times.videoTime, vehicle_id: car.id, post_kind: "walkthrough" },
        ];

        const results = [];
        for (const post of posts) {
            const data = await sendToEmber(post, apiKey, apiUrl);
            results.push(data.post_id);
        }

        // Record the share timestamp on the car so the admin UI can show it's been shared
        const supabase = await createClient();
        await supabase
            .from("cars")
            .update({ social_shared_at: new Date().toISOString() })
            .eq("id", car.id);
        revalidatePath("/admin/inventory");

        return { success: true, postIds: results, count: results.length };
    } catch (error) {
        console.error("Error posting to Ember Social:", error);
        return { success: false, error: error.message };
    }
}

export async function postSoldVideoToEmber(saleId) {
  const apiKey = process.env.EMBER_SOCIAL_API_KEY;
  const apiUrl = process.env.EMBER_SOCIAL_URL || "http://localhost:3000";
  if (!apiKey) return;

  try {
    const admin = await createAdminClient();

    // Atomic claim: update social_post_created_at only if null AND the sale is
    // allowed on social. When skip_social is true (client opted out) the filter
    // matches no rows, so nothing is claimed and no post is ever created.
    const { data: claimed } = await admin
      .from("sales")
      .update({ social_post_created_at: new Date().toISOString() })
      .eq("id", saleId)
      .eq("skip_social", false)
      .is("social_post_created_at", null)
      .select(
        "id, car_id, buyer_name, vehicle_year, vehicle_make, vehicle_model, sale_video_url, sale_video_status, sold_at, review_email_scheduled_for"
      );

    if (!claimed || claimed.length === 0) return; // opted out, already posted, or claimed elsewhere
    const sale = claimed[0];

    // Video must be ready before posting
    if (sale.sale_video_status !== "ready" || !sale.sale_video_url) {
      await admin
        .from("sales")
        .update({ social_post_created_at: null })
        .eq("id", saleId);
      return;
    }

    // Resolve the vehicle label from the inventory car or, for off-inventory
    // sales, the fields stored on the sale itself.
    let label;
    if (sale.car_id) {
      const { data: car } = await admin
        .from("cars")
        .select("make, model, year")
        .eq("id", sale.car_id)
        .single();
      label = car ? [car.year, car.make, car.model].filter(Boolean).join(" ") : "their new car";
    } else {
      label =
        [sale.vehicle_year, sale.vehicle_make, sale.vehicle_model].filter(Boolean).join(" ") ||
        "their new car";
    }

    // Compute target posting time: 08:00 SAST (UTC+2) on the review-email day
    const base = sale.review_email_scheduled_for
      ? new Date(sale.review_email_scheduled_for)
      : new Date(
          new Date(sale.sold_at || Date.now()).getTime() + 4 * 24 * 60 * 60 * 1000
        );
    const sastDate = new Date(base.getTime() + 2 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const scheduled_at = `${sastDate}T06:00:00Z`; // 08:00 SAST

    const content = `🎉 SOLD! Another happy Everest Motoring customer is hitting the road in their ${label}. 🚗

Congratulations and enjoy every kilometre — from all of us at Everest Motoring, White River.

Looking for your next car? Browse our showroom at everestmotoring.co.za

#EverestMotoring #JustSold #WhiteRiver`;

    const payload = {
      content,
      platforms: ["facebook", "instagram"],
      media_urls: [sale.sale_video_url],
      scheduled_at,
    };

    try {
      await sendToEmber(payload, apiKey, apiUrl);
    } catch (postErr) {
      // Post failed — roll back the claim so it can be retried
      await admin
        .from("sales")
        .update({ social_post_created_at: null })
        .eq("id", saleId);
      console.warn("[postSoldVideoToEmber] ember post failed:", postErr.message);
    }
  } catch (e) {
    console.warn("[postSoldVideoToEmber] failed:", e.message);
  }
}

// ── Automatic posting for a newly added vehicle ─────────────────────────────

/**
 * Schedules the photo + specs feed post for a vehicle that has just been added.
 * This is the only post that goes out without review; the reel and the full
 * walkthrough both wait behind the walkaround approval gate.
 */
export async function scheduleNewCarFeedPost(car) {
    const apiKey = process.env.EMBER_SOCIAL_API_KEY;
    if (!apiKey) {
        return { success: false, error: "EMBER_SOCIAL_API_KEY is not configured." };
    }
    const apiUrl = process.env.EMBER_SOCIAL_URL || "http://localhost:3000";

    const admin = await createAdminClient();
    const scheduledAt = await nextFeedSlot(admin);

    // Atomic claim on the slot: the filter matches no rows if this vehicle
    // already has a feed post, so a double save cannot post it twice.
    const { data: claimed } = await admin
        .from("cars")
        .update({ feed_post_scheduled_at: scheduledAt })
        .eq("id", car.id)
        .is("feed_post_scheduled_at", null)
        .select("id");

    if (!claimed || claimed.length === 0) {
        return { success: false, error: "A feed post is already scheduled for this vehicle." };
    }

    try {
        await sendToEmber(
            { ...buildFeedPost(car), scheduled_at: scheduledAt, vehicle_id: car.id, post_kind: "feed" },
            apiKey,
            apiUrl
        );
    } catch (error) {
        // Release the slot so a retry can claim it.
        await admin.from("cars").update({ feed_post_scheduled_at: null }).eq("id", car.id);
        console.error("[scheduleNewCarFeedPost] ember post failed:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/inventory");
    return { success: true, scheduledAt };
}

/**
 * Creates the reel + full walkthrough posts for a vehicle whose walkaround has
 * been approved. Gated on the approved state itself, so calling this directly
 * cannot bypass the approval.
 */
export async function postApprovedVideoPosts(carId) {
    const apiKey = process.env.EMBER_SOCIAL_API_KEY;
    if (!apiKey) {
        return { success: false, error: "EMBER_SOCIAL_API_KEY is not configured." };
    }
    const apiUrl = process.env.EMBER_SOCIAL_URL || "http://localhost:3000";

    const admin = await createAdminClient();

    const { data: claimed } = await admin
        .from("cars")
        .update({ video_social_posted_at: new Date().toISOString() })
        .eq("id", carId)
        .eq("video_approval_status", "approved")
        .is("video_social_posted_at", null)
        .select("*");

    if (!claimed || claimed.length === 0) {
        return {
            success: false,
            error: "This vehicle is not approved, or its video posts were already created.",
        };
    }
    const car = claimed[0];
    const day = postingDay(1);

    const posts = [
        { ...buildReelPost(car), scheduled_at: slotIso(day, REEL_SLOT_UTC), vehicle_id: car.id, post_kind: "reel" },
        { ...buildVideoPost(car), scheduled_at: slotIso(day, VIDEO_SLOT_UTC), vehicle_id: car.id, post_kind: "walkthrough" },
    ];

    try {
        for (const post of posts) {
            await sendToEmber(post, apiKey, apiUrl);
        }
    } catch (error) {
        await admin.from("cars").update({ video_social_posted_at: null }).eq("id", carId);
        console.error("[postApprovedVideoPosts] ember post failed:", error.message);
        return { success: false, error: error.message };
    }

    // The walkaround is approved and posted — safe to hand affiliates their
    // media kit now. Best-effort: a failure here must not undo the social
    // post, which already succeeded and is claimed via video_social_posted_at
    // above (so this can never double-fire for the same car).
    try {
        await notifyApprovedAffiliates(carId);
    } catch (err) {
        console.error("[postApprovedVideoPosts] affiliate notify failed:", err.message);
    }

    revalidatePath("/admin/inventory");
    return { success: true, count: posts.length, scheduledFor: day.toISOString().slice(0, 10) };
}
