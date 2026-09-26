"use server";

import * as React from "react";
import { createClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

const STAFF_EMAIL = process.env.STAFF_NOTIFICATION_EMAIL || "info@everestmotoring.co.za";

export async function submitContactForm(formData) {
    try {
        const supabase = await createClient();

        const clientName = formData.get("full_name");
        const clientEmail = formData.get("email");
        const clientPhone = formData.get("phone");
        const message = formData.get("message") || null;

        const data = {
            client_name: clientName,
            client_email: clientEmail,
            client_phone: clientPhone,
            lead_source: "contact_page",
            status: "new",
            message,
        };

        const preferred_date_1 = formData.get("preferred_date_1");
        const preferred_time_1 = formData.get("preferred_time_1");
        const preferred_date_2 = formData.get("preferred_date_2");
        const preferred_time_2 = formData.get("preferred_time_2");
        const preferred_date_3 = formData.get("preferred_date_3");
        const preferred_time_3 = formData.get("preferred_time_3");

        // We can append these directly to the leads payload if the columns exist,
        // or format them into a notes/JSON field. For now, since the user requested tracking them,
        // we'll attempt to pass them cleanly. 
        if (preferred_date_1) {
            data.preferred_date_1 = preferred_date_1;
            data.preferred_time_1 = preferred_time_1;
        }
        if (preferred_date_2) {
            data.preferred_date_2 = preferred_date_2;
            data.preferred_time_2 = preferred_time_2;
        }
        if (preferred_date_3) {
            data.preferred_date_3 = preferred_date_3;
            data.preferred_time_3 = preferred_time_3;
        }

        const car_id = formData.get("car_id");
        if (car_id && car_id !== "none") {
            data.car_id = car_id;
        }

        // Insert lead 
        const { error } = await supabase.from("leads").insert([data]);

        if (error) {
            console.error("Supabase Error saving lead:", error);
            return { error: "Database error" };
        }

        // Staff email notification — fire-and-forget
        const details = [
            { label: "Client Name", value: clientName },
            { label: "Phone", value: clientPhone },
            { label: "Email", value: clientEmail || "Not provided" },
        ];

        if (preferred_date_1) {
            details.push({ label: "Preferred Date 1", value: `${preferred_date_1} @ ${preferred_time_1 || "Flexible"}` });
        }
        if (preferred_date_2) {
            details.push({ label: "Preferred Date 2", value: `${preferred_date_2} @ ${preferred_time_2 || "Flexible"}` });
        }
        if (message) {
            details.push({ label: "Message", value: message.slice(0, 200) });
        }
        details.push({ label: "Source", value: "Test Drive / Contact Page" });

        sendEmail({
            to: STAFF_EMAIL,
            subject: `🚗 New Test Drive Request — ${clientName}`,
            react: React.createElement(SystemNotificationEmail, {
                subject: `New Test Drive Request — ${clientName}`,
                details,
                actionLink: "https://everestmotoring.co.za/admin/leads",
                actionLabel: "View in Lead Dashboard",
            }),
        }).catch((err) => console.warn("Staff notification email failed:", err));

        return { success: true };

    } catch (error) {
        console.error("Server Action Error:", error);
        return { error: "Server action failed" };
    }
}

