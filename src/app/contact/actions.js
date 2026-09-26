"use server";

import * as React from "react";
import { sendEmail } from "@/lib/resend";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

const CONTACT_EMAIL = ["info@everestmotoring.co.za", "anton@everestmotoring.co.za"];

export async function submitContactForm(formData) {
    try {
        const name = formData.get("name");
        const email = formData.get("email");
        const phone = formData.get("phone") || "Not provided";
        const message = formData.get("message");

        if (!name || !email || !message) {
            return { error: "Please fill in your name, email and message." };
        }

        const result = await sendEmail({
            to: CONTACT_EMAIL,
            replyTo: email,
            subject: `💬 New Contact Message — ${name}`,
            react: React.createElement(SystemNotificationEmail, {
                subject: "New Website Contact Message",
                details: [
                    { label: "Name", value: name },
                    { label: "Email", value: email },
                    { label: "Phone", value: phone },
                    { label: "Message", value: message },
                ],
                actionLink: "https://everestmotoring.co.za/admin",
                actionLabel: "Open Admin Hub",
            }),
        });

        if (!result.success) {
            console.warn("Contact form email failed:", result.error);
            return { error: "Sorry, we couldn't send your message right now. Please call us on 013 854 0600." };
        }

        return { success: true };
    } catch (err) {
        console.error("submitContactForm error:", err);
        return { error: "Something went wrong. Please try again or call us directly." };
    }
}
