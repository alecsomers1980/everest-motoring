"use server";

import * as React from "react";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/resend";
import { TradeInOfferEmail } from "@/emails/TradeInOfferEmail";

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
}

// Strip any thousands separators / currency symbols a human might type
// ("R 80 000", "80,000", "80.000") down to a whole-rand number. This is the fix
// for offers being saved as e.g. 80 instead of 80000.
function sanitizeAmount(v) {
    const digits = String(v ?? "").replace(/[^\d]/g, "");
    if (!digits) return null;
    return Number(digits);
}

export async function updateTradeInStatus(formData) {
    try {
        const supabase = await createClient();
        const requestId = formData.get("requestId");
        const newStatus = formData.get("status");
        const offerValue = formData.get("offerValue");

        if (!requestId || !newStatus) return;

        const updatePayload = { status: newStatus };
        const amount = sanitizeAmount(offerValue);
        if (amount !== null) {
            updatePayload.offer_value = amount;
        }

        const { error } = await supabase
            .from("value_my_car_requests")
            .update(updatePayload)
            .eq("id", requestId);

        if (error) {
            console.error("Error updating trade-in status:", error);
            return;
        }

        revalidatePath("/admin/trade-ins");
    } catch (error) {
        console.error("Server Action Exception:", error);
    }
}

/**
 * Save the offer (status -> offer_made + offer_value) and, when a body is
 * provided, email the (admin-edited) offer to the client.
 */
export async function sendTradeInOfferAction({ requestId, offerValue, subject, body, sendEmail: doSend }) {
    try {
        await requireAdmin();
        const admin = await createAdminClient();

        const amount = sanitizeAmount(offerValue);
        if (!requestId || amount === null) return { error: "Please enter a valid offer amount." };

        const { data: req, error: fetchErr } = await admin
            .from("value_my_car_requests")
            .select("client_name, client_email, year, make, model")
            .eq("id", requestId)
            .single();
        if (fetchErr || !req) return { error: "Request not found." };

        const { error: updErr } = await admin
            .from("value_my_car_requests")
            .update({ status: "offer_made", offer_value: amount })
            .eq("id", requestId);
        if (updErr) return { error: updErr.message };

        revalidatePath("/admin/trade-ins");

        if (!doSend) {
            return { success: true, sent: false };
        }
        if (!req.client_email) {
            return { success: true, sent: false, emailError: "No client email on file — offer saved but not emailed." };
        }

        const result = await sendEmail({
            to: req.client_email,
            subject: subject?.trim() || "Your Everest Motoring Trade-In Offer",
            react: React.createElement(TradeInOfferEmail, { body }),
        });
        if (!result.success) {
            return { success: true, sent: false, emailError: result.error?.message || "Email failed to send." };
        }

        return { success: true, sent: true, to: req.client_email };
    } catch (e) {
        return { error: e.message || "Failed to process offer." };
    }
}
