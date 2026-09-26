"use server";

import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { SystemNotificationEmail } from "@/emails/SystemNotification";

const STAFF_EMAIL = ["info@everestmotoring.co.za", "anton@everestmotoring.co.za"];

export async function submitValueMyCar(formData) {
    try {
        // Public form has no logged-in user, so uploads/inserts run with the
        // service role (server-side only) to bypass RLS on the storage bucket.
        const admin = await createAdminClient();

        // 1. Vehicle Details
        const category = formData.get("category");
        const make = formData.get("make");
        const model = formData.get("model");
        const year = formData.get("year");
        const fuel_type = formData.get("fuel_type");
        const transmission = formData.get("transmission");
        const condition = formData.get("condition");
        const additional_notes = formData.get("additional_notes");
        const mileage = formData.get("mileage");

        // 2. Client Details
        const client_name = formData.get("client_name");
        const client_email = formData.get("client_email");
        const client_phone = formData.get("client_phone");
        const client_province = formData.get("client_province");
        const client_suburb = formData.get("client_suburb");

        if (!make || !model || !year || !fuel_type || !transmission || !condition || !client_name || !client_email || !client_phone || !mileage) {
            return { error: "Missing required fields" };
        }

        // 3. Handle File Uploads
        const fileKeys = ["image_front", "image_left", "image_right", "image_back", "image_roof", "image_interior_front", "image_interior_back"];
        const imageUrls = {
            image_front: null,
            image_left: null,
            image_right: null,
            image_back: null,
            image_roof: null,
            image_interior_front: null,
            image_interior_back: null
        };

        for (const key of fileKeys) {
            const file = formData.get(key);
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `requests/${fileName}`;

                const { error: uploadError } = await admin.storage
                    .from('valuations')
                    .upload(filePath, file);

                if (uploadError) {
                    console.error("Storage upload error for", key, uploadError);
                    return { error: `Failed to upload ${key}` };
                }

                const { data: publicUrlData } = admin.storage
                    .from('valuations')
                    .getPublicUrl(filePath);

                imageUrls[key] = publicUrlData.publicUrl;
            }
        }

        const newRequest = {
            category,
            make,
            model,
            year,
            fuel_type,
            transmission,
            condition,
            additional_notes,
            mileage,
            client_name,
            client_email,
            client_phone,
            client_province,
            client_suburb,
            image_front: imageUrls.image_front,
            image_left: imageUrls.image_left,
            image_right: imageUrls.image_right,
            image_back: imageUrls.image_back,
            image_roof: imageUrls.image_roof,
            image_interior_front: imageUrls.image_interior_front,
            image_interior_back: imageUrls.image_interior_back,
            status: "pending_valuation"
        };

        const { error } = await admin.from("value_my_car_requests").insert([newRequest]);

        if (error) {
            console.error("Supabase Error saving valuation request:", error);
            return { error: "Database error" };
        }

        // Staff email notification — fire-and-forget
        const vehicleDesc = `${year} ${make} ${model}`;
        const mileageFormatted = new Intl.NumberFormat("en-ZA").format(mileage);

        sendEmail({
            to: STAFF_EMAIL,
            subject: `📋 Trade-In Valuation Request — ${vehicleDesc}`,
            react: React.createElement(SystemNotificationEmail, {
                subject: `Trade-In Valuation Request`,
                details: [
                    { label: "Vehicle", value: vehicleDesc },
                    { label: "Mileage", value: `${mileageFormatted} km` },
                    { label: "Condition", value: condition },
                    { label: "Fuel / Trans", value: `${fuel_type} / ${transmission}` },
                    { label: "Client", value: client_name },
                    { label: "Phone", value: client_phone },
                    { label: "Email", value: client_email },
                    { label: "Location", value: [client_suburb, client_province].filter(Boolean).join(", ") || "Not provided" },
                ],
                actionLink: "https://everestmotoring.co.za/admin/trade-ins",
                actionLabel: "Review in Trade-In Dashboard",
            }),
        }).catch((err) => console.warn("Staff trade-in notification failed:", err));

        return { success: true };

    } catch (error) {
        console.error("Server Action Error:", error);
        return { error: "Server action failed" };
    }
}

