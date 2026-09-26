"use server";

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from 'next/cache';

export async function inviteClientAction(formData) {
    const leadId = formData.get("leadId");
    const clientName = formData.get("clientName");
    const clientEmail = formData.get("clientEmail");

    if (!clientEmail) {
        return { error: "Client must have an email address to be invited." };
    }

    try {
        const supabase = await createClient();

        // Ensure the current user is an admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || profile.role !== 'admin') return { error: "Only admins can invite clients." };

        // We need the Service Role Key to bypass RLS and create accounts on behalf of users without logging the admin out
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceRoleKey) {
            console.error("SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.");
            return { error: "Server Configuration Error: Missing Admin API Key." };
        }

        const adminAuthClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            serviceRoleKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Invite the user via Supabase Auth Admin API
        const { data: inviteData, error: inviteError } = await adminAuthClient.auth.admin.inviteUserByEmail(clientEmail);

        if (inviteError) {
            console.error("Invite Error:", inviteError.message);
            // If user already exists, we could just link the lead, but for this demo let's fail gracefully
            return { error: "Failed to send invitation. The client might already exist." };
        }

        const newUserId = inviteData.user.id;

        // 2. Set the new user's profile to 'client'
        const { error: profileError } = await adminAuthClient
            .from('profiles')
            .update({
                role: 'client',
                first_name: clientName.split(' ')[0],
                last_name: clientName.split(' ').slice(1).join(' ') || null
            })
            .eq('id', newUserId);

        if (profileError) {
            console.error("Profile Error:", profileError);
            return { error: "User invited, but failed to setup client profile." };
        }

        // 3. Link this Lead to the new Client ID, and update status to 'finance_pending'
        const { error: leadUpdateError } = await adminAuthClient
            .from('leads')
            .update({
                client_id: newUserId,
                status: 'finance_pending'
            })
            .eq('id', leadId);

        if (leadUpdateError) {
            console.error("Lead Update Error:", leadUpdateError);
            return { error: "Failed to link lead to the new client account." };
        }

        revalidatePath("/admin/leads");
        return { success: true };

    } catch (e) {
        console.error("Server Action Exception:", e);
        return { error: "An unexpected error occurred." };
    }
}

export async function updateLeadStatusAction(leadId, newStatus) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: "Unauthorized" };

        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (!profile || profile.role !== 'admin') return { error: "Only admins can update status." };

        const adminAuthClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await adminAuthClient
            .from('leads')
            .update({ status: newStatus })
            .eq('id', leadId);

        if (error) {
            console.error("Lead Status Update Error:", error);
            return { error: "Failed to update lead status." };
        }

        revalidatePath("/admin/leads");
        return { success: true };
    } catch (e) {
        console.error("Server Action Exception:", e);
        return { error: "An unexpected error occurred." };
    }
}
