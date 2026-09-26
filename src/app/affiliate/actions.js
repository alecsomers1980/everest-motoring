"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { encryptBankField } from "@/utils/affiliate/bankEncryption";

export async function saveBankDetails(formData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const bank_name = formData.get("bank_name");
    const account_number = formData.get("account_number");
    const branch_code = formData.get("branch_code");

    if (!bank_name || !account_number || !branch_code) {
        return { error: "All fields are required" };
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            bank_name,
            account_number: encryptBankField(account_number),
            branch_code
        })
        .eq("id", user.id);

    if (error) {
        console.error("Failed to save bank details:", error);
        return { error: "Database error. Please try again." };
    }

    revalidatePath("/affiliate");
    return { success: true };
}
