"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cleanFinanceHouse } from "@/utils/paperwork/financeHouseFields";

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || profile.role !== "admin") throw new Error("Admins only");
}

// Postgres "undefined table" / PostgREST "not in schema cache": the migration
// hasn't been run yet, so the page offers Cash only.
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

export async function listFinanceHouses() {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data, error } = await admin.from("finance_houses").select("*").order("name");
    if (error) {
        if (MISSING_TABLE.has(error.code)) return { houses: [], missingTable: true };
        throw new Error(error.message);
    }
    return { houses: data ?? [], missingTable: false };
}

export async function saveFinanceHouse(input) {
    await requireAdmin();
    const row = cleanFinanceHouse(input);
    if (!row.name) return { error: "Name is required." };

    const admin = await createAdminClient();
    const table = admin.from("finance_houses");
    const query = input?.id
        ? table.update({ ...row, updated_at: new Date().toISOString() }).eq("id", input.id)
        : table.insert(row);
    const { data, error } = await query.select().single();
    if (error) return { error: error.message };
    revalidatePath("/admin/paperwork");
    return { house: data };
}

export async function deleteFinanceHouse(id) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { error } = await admin.from("finance_houses").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/paperwork");
}
