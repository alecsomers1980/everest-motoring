"use server";

import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/resend";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

const LEAD_NOTIFICATION_EMAIL = ["info@everestmotoring.co.za", "anton@everestmotoring.co.za"];

export async function submitLead(formData) {
    try {
        // Public form has no logged-in user; run DB writes with the service role
        // (server-side only) so the leads RLS policy doesn't reject the insert.
        const supabase = await createAdminClient();

        const car_id = formData.get("car_id");
        const client_name = formData.get("client_name");
        const client_phone = formData.get("client_phone");
        const client_email = formData.get("client_email");

        if (!car_id || !client_name || !client_phone) {
            return { error: "Missing required fields" };
        }

        // --- AFFILIATE TRACKING LOGIC ---
        let affiliate_id = null;
        let lead_source = "website_direct";

        const cookieStore = await cookies();
        const refCode = cookieStore.get("everest_affiliate_id")?.value;

        if (refCode) {
            // Find the affiliate's UUID using their tracking string
            const { data: affiliateProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('affiliate_code', refCode)
                .single();

            if (affiliateProfile) {
                affiliate_id = affiliateProfile.id;
                lead_source = "affiliate_link";
            }
        }
        // --------------------------------

        const newLead = {
            car_id,
            client_name,
            client_phone,
            client_email: client_email || null,
            lead_source: lead_source,
            affiliate_id: affiliate_id,
            status: "new"
        };

        const { error } = await supabase.from("leads").insert([newLead]);

        if (error) {
            console.error("Supabase Error saving lead:", error);
            return { error: "Database error" };
        }

        // Staff notification email — fire-and-forget (never block the lead save).
        let vehicleDesc = "a vehicle";
        try {
            const { data: car } = await supabase
                .from("cars")
                .select("make, model, year")
                .eq("id", car_id)
                .single();
            if (car) vehicleDesc = `${car.year} ${car.make} ${car.model}`;
        } catch { /* ignore — still send the notification */ }

        sendEmail({
            to: LEAD_NOTIFICATION_EMAIL,
            replyTo: client_email || undefined,
            subject: `🚗 New Vehicle Inquiry — ${vehicleDesc}`,
            react: React.createElement(SystemNotificationEmail, {
                subject: "New Vehicle Inquiry",
                details: [
                    { label: "Vehicle", value: vehicleDesc },
                    { label: "Name", value: client_name },
                    { label: "Phone", value: client_phone },
                    { label: "Email", value: client_email || "Not provided" },
                    { label: "Source", value: lead_source === "affiliate_link" ? "Affiliate link" : "Website" },
                ],
                actionLink: "https://everestmotoring.co.za/admin/leads",
                actionLabel: "View in Leads Dashboard",
            }),
        }).catch((err) => console.warn("Lead notification email failed:", err));

        return { success: true };

    } catch (error) {
        console.error("Server Action Error:", error);
        return { error: "Server action failed" };
    }
}
