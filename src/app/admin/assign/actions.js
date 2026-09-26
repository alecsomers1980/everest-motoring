"use server"

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function assignCarAction(formData) {
    const supabase = await createClient();

    const client_id = formData.get('client_id');
    const client_name = formData.get('client_name');
    const client_email = formData.get('client_email');
    const client_phone = formData.get('client_phone');
    const car_id = formData.get('car_id');

    if (!client_id || !car_id) {
        return { error: 'Client and Car are required fields.' };
    }

    const newLead = {
        client_id, // Link to the user profile
        client_name,
        client_email,
        client_phone,
        car_id,
        status: 'finance_pending'
    };

    const { error } = await supabase.from('leads').insert(newLead);

    if (error) {
        console.error("Assign Error:", error);
        return { error: 'Failed to assign vehicle. ' + error.message };
    }

    revalidatePath('/admin/leads');
    revalidatePath('/portal');

    return { success: true };
}
