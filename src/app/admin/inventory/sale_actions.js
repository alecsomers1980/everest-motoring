"use server";

import * as React from "react";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/resend";
import { PostSaleReviewEmail } from "@/emails/PostSaleReview";
import { rescheduleReviewEmailWithVideo } from "@/utils/reviewEmail";
import {
    startSeedanceClip,
    pollSeedanceClip,
    SEEDANCE_STYLE_PROMPTS,
    buildSeedancePrompt,
} from "@/utils/ai/seedanceService";
import { addCongratsVoiceover } from "@/utils/ai/congratsVoiceover";
import { postSoldVideoToEmber } from "./socialAction";

const REVIEW_DELAY_DAYS = 4;

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || profile.role !== "admin") throw new Error("Admins only");
    return { user };
}

export async function getLeadsForCar(carId) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data, error } = await admin
        .from("leads")
        .select("id, client_name, client_email, client_phone, status, created_at")
        .eq("car_id", carId)
        .order("created_at", { ascending: false });
    if (error) {
        console.error("getLeadsForCar error:", error);
        return [];
    }
    return data || [];
}

export async function getSaleForCar(carId) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data } = await admin
        .from("sales")
        .select("*")
        .eq("car_id", carId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    return data;
}

// Sales for vehicles that were never in the inventory (car_id is null). Used by
// the off-inventory sales page so they can still be managed (handover video etc.).
export async function getOfflineSales() {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data, error } = await admin
        .from("sales")
        .select("*")
        .is("car_id", null)
        .order("created_at", { ascending: false });
    if (error) {
        console.error("getOfflineSales error:", error);
        return [];
    }
    return data || [];
}

// Attach (or replace) the delivery photo on an existing sale — used when a sale
// was recorded without a photo and we now want to create a handover video that
// includes the buyer.
export async function addDeliveryPhotoToSale(formData) {
    await requireAdmin();
    const admin = await createAdminClient();

    const saleId = formData.get("sale_id");
    if (!saleId) return { error: "Missing sale." };

    // Two paths: a client-uploaded URL (large photos, bypasses the request-body
    // limit) or a raw file posted through the action (legacy MarkSoldButton path).
    let url = formData.get("delivery_photo_url") || null;

    if (!url) {
        const file = formData.get("delivery_photo");
        if (!file || typeof file !== "object" || file.size === 0) {
            return { error: "Please choose a photo to upload." };
        }
        const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
        const fileName = `${saleId}-${Date.now()}.${ext}`;
        const { error: upErr } = await admin.storage
            .from("delivery-photos")
            .upload(fileName, file, { contentType: file.type || "image/jpeg", upsert: true });
        if (upErr) return { error: `Upload failed: ${upErr.message}` };
        url = admin.storage.from("delivery-photos").getPublicUrl(fileName).data.publicUrl;
    }

    const { error: updErr } = await admin
        .from("sales")
        .update({ delivery_photo_url: url })
        .eq("id", saleId);
    if (updErr) return { error: updErr.message };

    revalidatePath("/admin/inventory");
    return { success: true, url };
}

// Toggle whether this sale posts to social media (the Facebook/Instagram "Just
// Sold" celebration). Exposed at the video step so posting can be opted out of
// after the sale is recorded. postSoldVideoToEmber only claims sales where
// skip_social is false, so this must be set before the video finalizes (~2 min)
// to reliably block the post.
export async function setSaleSkipSocial(saleId, skip) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { error } = await admin
        .from("sales")
        .update({ skip_social: !!skip })
        .eq("id", saleId);
    if (error) return { error: error.message };
    revalidatePath("/admin/inventory");
    revalidatePath("/admin/sales");
    return { success: true, skip_social: !!skip };
}

export async function markCarAsSold(formData) {
    try {
        return await markCarAsSoldInner(formData);
    } catch (err) {
        console.error("markCarAsSold unexpected error:", err);
        return { error: `Server error: ${err?.message || String(err)}` };
    }
}

async function markCarAsSoldInner(formData) {
    const { user } = await requireAdmin();
    const admin = await createAdminClient();

    const carId = formData.get("car_id");
    const leadId = formData.get("lead_id") || null;
    const buyerName = formData.get("buyer_name");
    const buyerEmail = formData.get("buyer_email") || null;
    const buyerPhone = formData.get("buyer_phone") || null;
    const buyerBirthday = formData.get("buyer_birthday") || null;
    const notes = formData.get("notes") || null;
    const skipSocial = !!formData.get("skip_social");
    const photoFile = formData.get("delivery_photo");

    if (!carId || !buyerName) {
        return { error: "Vehicle and buyer name are required." };
    }

    // Reject duplicate sale records for the same car
    const { data: existing } = await admin
        .from("sales")
        .select("id")
        .eq("car_id", carId)
        .maybeSingle();
    if (existing) {
        return { error: "This vehicle already has a sale record." };
    }

    const { data: car, error: carErr } = await admin
        .from("cars")
        .select("id, make, model, year, main_image_url")
        .eq("id", carId)
        .single();
    if (carErr || !car) {
        return { error: "Vehicle not found." };
    }

    let deliveryPhotoUrl = null;
    if (photoFile && typeof photoFile === "object" && photoFile.size > 0) {
        const ext = (photoFile.name?.split(".").pop() || "jpg").toLowerCase();
        const fileName = `${carId}-${Date.now()}.${ext}`;
        const { error: upErr } = await admin.storage
            .from("delivery-photos")
            .upload(fileName, photoFile, { upsert: false, contentType: photoFile.type });
        if (upErr) {
            console.error("Delivery photo upload error:", upErr);
            return { error: "Failed to upload delivery photo." };
        }
        const { data: urlData } = admin.storage.from("delivery-photos").getPublicUrl(fileName);
        deliveryPhotoUrl = urlData.publicUrl;
    }

    const sold_at = new Date();
    const scheduledFor = new Date(sold_at.getTime() + REVIEW_DELAY_DAYS * 24 * 60 * 60 * 1000);
    const willEmail = !!buyerEmail;

    const { data: sale, error: saleErr } = await admin
        .from("sales")
        .insert({
            car_id: carId,
            lead_id: leadId,
            buyer_name: buyerName,
            buyer_email: buyerEmail,
            buyer_phone: buyerPhone,
            buyer_birthday: buyerBirthday,
            delivery_photo_url: deliveryPhotoUrl,
            notes,
            skip_social: skipSocial,
            sold_at: sold_at.toISOString(),
            review_email_scheduled_for: willEmail ? scheduledFor.toISOString() : null,
            created_by: user.id,
        })
        .select()
        .single();
    if (saleErr) {
        console.error("Sale insert error:", saleErr);
        return { error: "Failed to record sale." };
    }

    const { error: carUpdErr } = await admin
        .from("cars")
        .update({ status: "sold" })
        .eq("id", carId);
    if (carUpdErr) console.error("Car status update error:", carUpdErr);

    if (leadId) {
        await admin.from("leads").update({ status: "closed_won" }).eq("id", leadId);

        // Immediately delete any client-uploaded financial documents for this lead
        const { data: leadDocs } = await admin
            .from("lead_documents")
            .select("id, file_path")
            .eq("lead_id", leadId);

        if (leadDocs && leadDocs.length > 0) {
            const filePaths = leadDocs.map(d => d.file_path);
            
            // 1. Remove physical files from secure vault
            const { error: storageErr } = await admin.storage.from("finance_documents").remove(filePaths);
            if (storageErr) {
                console.error("Privacy cleanup: Failed to delete client docs from storage:", storageErr);
            }

            // 2. Remove tracking records from DB
            const { error: dbDocsErr } = await admin.from("lead_documents").delete().eq("lead_id", leadId);
            if (dbDocsErr) {
                console.error("Privacy cleanup: Failed to delete client doc records from DB:", dbDocsErr);
            } else {
                console.log(`Privacy cleanup: Deleted ${filePaths.length} documents for lead ${leadId}`);
            }
        }
    }

    if (willEmail) {
        const reviewUrl =
            process.env.GOOGLE_REVIEW_URL ||
            "https://www.google.com/search?q=Everest+Motoring+White+River";
        const vehicleModel = `${car.year} ${car.make} ${car.model}`;
        try {
            const result = await sendEmail({
                to: buyerEmail,
                subject: `Congratulations on your ${vehicleModel}`,
                react: React.createElement(PostSaleReviewEmail, {
                    customerName: buyerName,
                    vehicleModel,
                    carImageUrl: car.main_image_url,
                    deliveryPhotoUrl,
                    reviewUrl,
                    postedToSocial: !skipSocial,
                }),
                scheduledAt: scheduledFor.toISOString(),
            });
            if (result.success && result.data?.id) {
                await admin
                    .from("sales")
                    .update({ review_email_id: result.data.id })
                    .eq("id", sale.id);
            } else if (!result.success) {
                console.warn("Review email scheduling failed (sale still recorded):", result.error);
            }
        } catch (err) {
            console.warn("Review email scheduling threw (sale still recorded):", err);
        }
    }

    // Kick off the celebration/handover video automatically. Uses the delivery
    // photo if one was attached, otherwise the vehicle image. The advance-sale-video
    // cron finalizes it in the background.
    try {
        await startSaleVideo(sale.id, "pixel_build");
    } catch (vidErr) {
        console.warn("Auto-start sale video failed (sale still recorded):", vidErr?.message || vidErr);
    }

    revalidatePath("/admin/inventory");
    revalidatePath("/inventory");

    return { success: true };
}

// Record a sale for a vehicle that was never listed in the inventory. Mirrors
// markCarAsSold (review email + record) but stores the vehicle details on the
// sale itself (car_id stays null). The handover video + social post are driven
// later from the off-inventory sales page, reusing the same pipeline.
export async function addOffInventorySale(formData) {
    try {
        const { user } = await requireAdmin();
        const admin = await createAdminClient();

        const buyerName = formData.get("buyer_name");
        const buyerEmail = formData.get("buyer_email") || null;
        const buyerPhone = formData.get("buyer_phone") || null;
        const buyerBirthday = formData.get("buyer_birthday") || null;
        const notes = formData.get("notes") || null;
        const skipSocial = !!formData.get("skip_social");

        const vehicleYearRaw = formData.get("vehicle_year");
        const vehicleYear = vehicleYearRaw ? parseInt(vehicleYearRaw, 10) : null;
        const vehicleMake = (formData.get("vehicle_make") || "").trim();
        const vehicleModel = (formData.get("vehicle_model") || "").trim();
        // Images are uploaded to Supabase storage on the client (like VehicleForm)
        // and only their URLs are sent here — server actions can't accept files
        // larger than the platform request-body cap.
        const vehicleImageUrl = formData.get("vehicle_image_url") || null;
        const deliveryPhotoUrl = formData.get("delivery_photo_url") || null;

        if (!buyerName || !vehicleMake || !vehicleModel) {
            return { error: "Buyer name, vehicle make and model are required." };
        }

        const sold_at = new Date();
        const scheduledFor = new Date(sold_at.getTime() + REVIEW_DELAY_DAYS * 24 * 60 * 60 * 1000);
        const willEmail = !!buyerEmail;

        const { data: sale, error: saleErr } = await admin
            .from("sales")
            .insert({
                car_id: null,
                buyer_name: buyerName,
                buyer_email: buyerEmail,
                buyer_phone: buyerPhone,
                buyer_birthday: buyerBirthday,
                vehicle_year: vehicleYear,
                vehicle_make: vehicleMake,
                vehicle_model: vehicleModel,
                vehicle_image_url: vehicleImageUrl,
                delivery_photo_url: deliveryPhotoUrl,
                notes,
                skip_social: skipSocial,
                sold_at: sold_at.toISOString(),
                review_email_scheduled_for: willEmail ? scheduledFor.toISOString() : null,
                created_by: user.id,
            })
            .select()
            .single();
        if (saleErr) {
            console.error("Off-inventory sale insert error:", saleErr);
            return { error: "Failed to record sale." };
        }

        if (willEmail) {
            const reviewUrl =
                process.env.GOOGLE_REVIEW_URL ||
                "https://www.google.com/search?q=Everest+Motoring+White+River";
            const vehicleModelLabel = [vehicleYear, vehicleMake, vehicleModel].filter(Boolean).join(" ");
            try {
                const result = await sendEmail({
                    to: buyerEmail,
                    subject: `Congratulations on your ${vehicleModelLabel}`,
                    react: React.createElement(PostSaleReviewEmail, {
                        customerName: buyerName,
                        vehicleModel: vehicleModelLabel,
                        carImageUrl: vehicleImageUrl,
                        deliveryPhotoUrl,
                        reviewUrl,
                        postedToSocial: !skipSocial,
                    }),
                    scheduledAt: scheduledFor.toISOString(),
                });
                if (result.success && result.data?.id) {
                    await admin.from("sales").update({ review_email_id: result.data.id }).eq("id", sale.id);
                } else if (!result.success) {
                    console.warn("Off-inventory review email scheduling failed (sale still recorded):", result.error);
                }
            } catch (err) {
                console.warn("Off-inventory review email scheduling threw (sale still recorded):", err);
            }
        }

        // Kick off the celebration/handover video automatically. Uses the delivery
        // photo if one was attached, otherwise the vehicle image. The advance-sale-video
        // cron finalizes it in the background.
        try {
            await startSaleVideo(sale.id, "pixel_build");
        } catch (vidErr) {
            console.warn("Auto-start sale video failed (sale still recorded):", vidErr?.message || vidErr);
        }

        revalidatePath("/admin/sales");
        return { success: true, saleId: sale.id };
    } catch (err) {
        console.error("addOffInventorySale unexpected error:", err);
        return { error: `Server error: ${err?.message || String(err)}` };
    }
}

export async function startSaleVideo(saleId, styleKey, options = {}) {
    await requireAdmin();
    const admin = await createAdminClient();

    const { data: sale, error: saleErr } = await admin
        .from("sales")
        .select("id, buyer_name, delivery_photo_url, car_id, vehicle_image_url, sale_video_status")
        .eq("id", saleId)
        .single();
    if (saleErr || !sale) return { error: "Sale not found." };
    if (sale.sale_video_status === "generating" || sale.sale_video_status === "finalizing") {
        return { error: "A video is already being generated for this sale." };
    }

    // With a delivery photo -> Pixel Build that animates the people in it.
    // Without one -> the vehicle's main image with the car-only Pixel Build (no
    // people added). For off-inventory sales (no car_id) the vehicle image stored
    // on the sale stands in for the car's main image. Either way the clip is
    // generated silently and a congratulations voiceover is added once it's ready.
    const revealFromCover = !!options.revealFromCover;
    let imageUrl = sale.delivery_photo_url;
    let imageUrls = null;
    let promptStyle;

    // Covered-car reveal: keep the cloth/handover photo as the scene but pass the
    // car's clean inventory image as a second reference so the revealed car is the
    // real one, not an AI invention. Only for inventory cars that have both.
    if (revealFromCover && sale.delivery_photo_url && sale.car_id) {
        const { data: car } = await admin
            .from("cars")
            .select("main_image_url")
            .eq("id", sale.car_id)
            .single();
        if (car?.main_image_url) {
            imageUrls = [sale.delivery_photo_url, car.main_image_url];
            promptStyle = "pixel_build_reveal";
        }
    }

    if (!promptStyle) {
        if (imageUrl) {
            promptStyle = SEEDANCE_STYLE_PROMPTS[styleKey] ? styleKey : "pixel_build";
        } else {
            if (sale.car_id) {
                const { data: car } = await admin
                    .from("cars")
                    .select("main_image_url")
                    .eq("id", sale.car_id)
                    .single();
                imageUrl = car?.main_image_url || null;
            } else {
                imageUrl = sale.vehicle_image_url || null;
            }
            promptStyle = "pixel_build_car_only";
        }
    }
    if (!imageUrl) {
        return { error: "No delivery photo, and this vehicle has no image to use." };
    }

    const prompt = buildSeedancePrompt(promptStyle, { buyerName: sale.buyer_name });
    // The sales.sale_video_style DB check constraint only allows the original
    // style keys, so store the base "pixel_build" for the car-only or reveal
    // variants — the prompt is what actually differs, not the stored label.
    const storedStyle = (promptStyle === "pixel_build_car_only" || promptStyle === "pixel_build_reveal") ? "pixel_build" : promptStyle;

    try {
        const { taskId } = await startSeedanceClip({
            imageUrl,
            imageUrls,
            prompt,
            durationSeconds: 8,
            aspectRatio: "16:9",
            resolution: "720p",
            generateAudio: false, // congratulations voiceover is muxed on after
        });

        const { error: updErr } = await admin
            .from("sales")
            .update({
                sale_video_style: storedStyle,
                sale_video_task_id: taskId,
                sale_video_status: "generating",
                sale_video_url: null,
                sale_video_error: null,
                sale_video_started_at: new Date().toISOString(),
                sale_video_completed_at: null,
            })
            .eq("id", saleId);

        if (updErr) {
            console.error("startSaleVideo DB update failed:", updErr);
            return { error: `DB update failed: ${updErr.message}` };
        }

        return { success: true, taskId };
    } catch (err) {
        console.error("startSaleVideo error:", err);
        await admin
            .from("sales")
            .update({
                sale_video_status: "failed",
                sale_video_error: err.message || "Failed to start generation",
            })
            .eq("id", saleId);
        return { error: err.message || "Failed to start video generation." };
    }
}

export async function pollSaleVideo(saleId) {
    await requireAdmin();
    const admin = await createAdminClient();

    const { data: sale } = await admin
        .from("sales")
        .select("id, car_id, buyer_name, buyer_email, delivery_photo_url, vehicle_year, vehicle_make, vehicle_model, vehicle_image_url, skip_social, sale_video_task_id, sale_video_status, sale_video_url, review_email_id, review_email_sent_at, review_email_scheduled_for")
        .eq("id", saleId)
        .single();
    if (!sale) return { error: "Sale not found." };
    if (sale.sale_video_status === "ready") {
        return { status: "ready", videoUrl: sale.sale_video_url };
    }
    // The clip is rendered and we're muxing the voiceover — keep the UI waiting.
    if (sale.sale_video_status === "finalizing") {
        return { status: "generating" };
    }
    if (sale.sale_video_status !== "generating" || !sale.sale_video_task_id) {
        return { status: sale.sale_video_status || "none" };
    }

    const result = await pollSeedanceClip(sale.sale_video_task_id);

    if (result.isComplete && result.videoUrl) {
        // Claim finalization first so a concurrent poll doesn't re-mux.
        await admin.from("sales").update({ sale_video_status: "finalizing" }).eq("id", saleId);

        // Resolve the vehicle label + image from either the inventory car or the
        // off-inventory fields stored on the sale itself.
        let vehicleLabel = "";
        let carImageUrl = null;
        if (sale.car_id) {
            const { data: car } = await admin
                .from("cars")
                .select("make, model, year, main_image_url")
                .eq("id", sale.car_id)
                .single();
            vehicleLabel = car ? `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim() : "";
            carImageUrl = car?.main_image_url || null;
        } else {
            vehicleLabel = [sale.vehicle_year, sale.vehicle_make, sale.vehicle_model].filter(Boolean).join(" ");
            carImageUrl = sale.vehicle_image_url || null;
        }

        // Add the congratulations voiceover onto the (silent) Pixel Build clip.
        // Best-effort: if it fails, fall back to the silent clip rather than
        // failing the whole sale video.
        let finalUrl = result.videoUrl;
        try {
            finalUrl = await addCongratsVoiceover(result.videoUrl, {
                fullName: sale.buyer_name,
                carLabel: vehicleLabel,
                carId: sale.car_id,
            });
        } catch (voErr) {
            console.warn("Congrats voiceover mux failed, using silent clip:", voErr.message);
        }

        await admin
            .from("sales")
            .update({
                sale_video_status: "ready",
                sale_video_url: finalUrl,
                sale_video_completed_at: new Date().toISOString(),
            })
            .eq("id", saleId);

        // If a review email is still scheduled (not yet sent), cancel + re-schedule with the video.
        if (sale.review_email_id && !sale.review_email_sent_at && sale.review_email_scheduled_for && sale.buyer_email) {
            const scheduledFor = new Date(sale.review_email_scheduled_for);
            if (scheduledFor.getTime() > Date.now() + 60_000) {
                await rescheduleReviewEmailWithVideo({
                    saleId,
                    oldEmailId: sale.review_email_id,
                    buyerEmail: sale.buyer_email,
                    buyerName: sale.buyer_name,
                    vehicleModel: vehicleLabel || "your new vehicle",
                    carImageUrl,
                    deliveryPhotoUrl: sale.delivery_photo_url,
                    videoUrl: finalUrl,
                    postedToSocial: !sale.skip_social,
                    scheduledFor,
                });
            }
        }

        // Queue the celebration video to Everest's social pages (pending approval
        // in ember-social), scheduled for the morning of the review-email day.
        await postSoldVideoToEmber(saleId);

        revalidatePath("/admin/inventory");
        return { status: "ready", videoUrl: finalUrl };
    }

    if (result.error) {
        await admin
            .from("sales")
            .update({
                sale_video_status: "failed",
                sale_video_error: result.error,
            })
            .eq("id", saleId);
        return { status: "failed", error: result.error };
    }

    return { status: "generating" };
}
