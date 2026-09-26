"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { generateAffiliateCode } from "@/utils/affiliate/code";
import { decryptBankField } from "@/utils/affiliate/bankEncryption";

// ─── Approve affiliate + auto-assign tracking code ───────────────────────────
export async function approveAffiliateAction(affiliateId, firstName) {
    try {
        const supabase = await createAdminClient();
        if (!affiliateId) return { success: false, error: "Missing ID" };

        const trackingCode = generateAffiliateCode(firstName, affiliateId);

        const { error } = await supabase
            .from('profiles')
            .update({
                is_approved: true,
                affiliate_code: trackingCode,
            })
            .eq('id', affiliateId)
            .eq('role', 'affiliate');

        if (error) {
            console.error("Approve affiliate error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/affiliates');
        return { success: true, trackingCode };
    } catch (err) {
        console.error("approveAffiliateAction exception:", err);
        return { success: false, error: "Server Exception" };
    }
}

// ─── Decline affiliate (sets is_approved = false, clears code) ───────────────
export async function declineAffiliateAction(affiliateId) {
    try {
        const supabase = await createAdminClient();
        if (!affiliateId) return { success: false, error: "Missing ID" };

        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: false, affiliate_code: null })
            .eq('id', affiliateId)
            .eq('role', 'affiliate');

        if (error) {
            console.error("Decline affiliate error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/affiliates');
        return { success: true };
    } catch (err) {
        console.error("declineAffiliateAction exception:", err);
        return { success: false, error: "Server Exception" };
    }
}

// ─── Delete affiliate entirely (removes from Auth + cascades to profiles) ─────
export async function deleteAffiliateAction(affiliateId) {
    try {
        const supabase = await createAdminClient();
        if (!affiliateId) return { success: false, error: "Missing ID" };

        const { error } = await supabase.auth.admin.deleteUser(affiliateId);

        if (error) {
            console.error("Delete affiliate error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/affiliates');
        return { success: true };
    } catch (err) {
        console.error("deleteAffiliateAction exception:", err);
        return { success: false, error: "Server Exception" };
    }
}

// ─── Legacy toggle (kept for backward compatibility) ─────────────────────────
export async function toggleAffiliateApproval(formData) {
    try {
        const supabase = await createClient();
        const affiliateId = formData.get("affiliateId");
        const currentApprovalStatus = formData.get("currentStatus") === "true";
        if (!affiliateId) return { success: false, error: "Missing ID" };

        const { error } = await supabase
            .from('profiles')
            .update({ is_approved: !currentApprovalStatus })
            .eq('id', affiliateId)
            .eq('role', 'affiliate');

        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/affiliates');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Server Exception" };
    }
}

// ─── View an affiliate's decrypted bank details (admin-only, audit logged) ──
export async function getAffiliateBankDetails(affiliateId) {
    try {
        if (!affiliateId) return { success: false, error: "Missing ID" };

        const sessionClient = await createClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return { success: false, error: "Unauthorized" };

        const supabase = await createAdminClient();

        const { data: callerProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!callerProfile || callerProfile.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        const { data: affiliate, error } = await supabase
            .from('profiles')
            .select('bank_name, account_number, branch_code')
            .eq('id', affiliateId)
            .single();

        if (error || !affiliate) return { success: false, error: "Affiliate not found" };

        const { error: logError } = await supabase
            .from('affiliate_payout_views')
            .insert({ admin_id: user.id, affiliate_id: affiliateId });

        if (logError) console.error("Failed to record payout view:", logError);

        return {
            success: true,
            bankName: affiliate.bank_name,
            accountNumber: decryptBankField(affiliate.account_number),
            branchCode: affiliate.branch_code,
        };
    } catch (err) {
        console.error("getAffiliateBankDetails exception:", err);
        return { success: false, error: "Server Exception" };
    }
}

// ─── Add / invite a new affiliate ────────────────────────────────────────────
export async function addAffiliateAction(formData) {
    try {
        const supabase = await createAdminClient();
        const email = formData.get("email");
        const firstName = formData.get("firstName");
        const lastName = formData.get("lastName");
        const phone = formData.get("phone");

        if (!email || !firstName || !lastName || !phone) {
            return { success: false, error: "All fields are required" };
        }

        const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: { first_name: firstName, last_name: lastName, phone, role: 'affiliate' }
        });

        if (error) return { success: false, error: error.message };

        revalidatePath('/admin/affiliates');
        return { success: true };
    } catch (error) {
        return { success: false, error: "Server Exception" };
    }
}

// ─── Set an affiliate's commission rate (rands per closed deal) ──────────────
// A null amount clears the rate, which hides every commission figure from that
// affiliate's portal.
export async function setAffiliateCommissionAction(affiliateId, amount) {
    try {
        const supabase = await createAdminClient();
        if (!affiliateId) return { success: false, error: "Missing ID" };
        if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
            return { success: false, error: "Amount must be 0 or more" };
        }

        const { error } = await supabase
            .from('profiles')
            .update({ commission_per_deal: amount })
            .eq('id', affiliateId)
            .eq('role', 'affiliate');

        if (error) {
            console.error("Set affiliate commission error:", error);
            return { success: false, error: error.message };
        }

        revalidatePath('/admin/affiliates');
        return { success: true };
    } catch (err) {
        console.error("setAffiliateCommissionAction exception:", err);
        return { success: false, error: "Server Exception" };
    }
}
