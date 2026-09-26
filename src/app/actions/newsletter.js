"use server";

import { createAdminClient } from "@/utils/supabase/server";

export async function subscribeToNewsletter(email) {
    try {
        const supabase = await createAdminClient();

        const { error } = await supabase
            .from("newsletter_subscribers")
            .insert([{ email }]);

        if (error) {
            console.error("Newsletter subscription error:", error);

            // If the user is already subscribed (unique constraint violation)
            if (error.code === "23505") {
                return { success: true };
            }

            // If table doesn't exist
            if (error.code === "42P01") {
                console.error("The 'newsletter_subscribers' table does not exist in the database. Please create it with an 'email' column.");
            }

            return { success: false, error: "Could not subscribe at this time." };
        }

        return { success: true };
    } catch (err) {
        console.error("Server error during newsletter subscription:", err);
        return { success: false, error: "Server error occurred." };
    }
}
