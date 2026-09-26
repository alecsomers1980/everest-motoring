"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadClientDocument(formData) {
    const file = formData.get("file");
    const documentType = formData.get("documentType");
    const leadId = formData.get("leadId");

    if (!file || file.size === 0) {
        return { error: "No file was provided." };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { error: "Unauthorized" };

        // Ensure we strictly enforce the RLS policy: The file MUST go into a folder named after the user.id
        const fileExt = file.name.split('.').pop();
        const safeFileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const storagePath = `${user.id}/${safeFileName}`;

        // 1. Upload to Supabase Storage Bucket 'finance_documents'
        const { error: uploadError } = await supabase.storage
            .from('finance_documents')
            .upload(storagePath, file);

        if (uploadError) {
            console.error("Storage upload failed:", uploadError);
            return { error: "Failed to securely save the file to the vault." };
        }

        // Bypass RLS for inserts
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 2. Insert record into lead_documents to track status
        const { error: dbError } = await supabaseAdmin
            .from('lead_documents')
            .insert({
                lead_id: leadId,
                client_id: user.id,
                document_type: documentType,
                file_path: storagePath,
                status: 'uploaded'
            });

        if (dbError) {
            console.error("Database tracking failed:", dbError);
            return { error: "File uploaded, but failed to log status." };
        }

        revalidatePath("/portal");
        return { success: true };

    } catch (e) {
        console.error("Server Action Exception:", e);
        return { error: "An unexpected error occurred during upload." };
    }
}

export async function saveFinancingDetailsAction(formData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const lead_id = formData.get("lead_id");
    const employment_status = formData.get("employment_status");
    const monthly_income = formData.get("monthly_income");
    const financing_period = formData.get("financing_period");

    if (!lead_id || !employment_status || !monthly_income || !financing_period) {
        return { error: "All fields are required" };
    }

    // Bypass RLS for leads
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify the lead belongs to the user
    const { data: existingLead, error: leadErr } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("id", lead_id)
        .eq("client_id", user.id)
        .single();

    if (!existingLead) {
        console.error("Portal action lead mismatch:", leadErr);
        return { error: "Lead not found or unauthorized access" };
    }

    // Update the lead with financing details and advance them to Step 2 (Documents)
    const { error } = await supabaseAdmin
        .from("leads")
        .update({
            employment_status,
            monthly_income: parseFloat(monthly_income),
            financing_period: parseInt(financing_period, 10),
            onboarding_step: 2, // Manually flag them to Step 2
            status: 'finance_pending' // Use valid enum: new, contacted, finance_pending, closed_won, closed_lost
        })
        .eq("id", lead_id);

    if (error) {
        console.error("Failed to save financing details:", error);
        return { error: "Database error. Please try again." };
    }

    // Revalidate the portal to show Step 2
    revalidatePath("/portal");
    return { success: true };
}
