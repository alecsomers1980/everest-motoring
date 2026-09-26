"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") throw new Error("Admins only");
  return user;
}

export async function updateProfileDetails({ firstName, lastName, phone, email }) {
  try {
    const user = await requireAdmin();
    const admin = await createAdminClient();
    const updates = {
      first_name: (firstName || "").trim() || null,
      last_name: (lastName || "").trim() || null,
      phone: (phone || "").trim() || null,
    };
    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (profileUpdateError) return { error: profileUpdateError.message };
    const newEmail = (email || "").trim().toLowerCase();
    if (newEmail && newEmail !== user.email) {
      const { error: emailUpdateError } = await admin.auth.admin.updateUserById(
        user.id,
        { email: newEmail, email_confirm: true }
      );
      if (emailUpdateError) return { error: emailUpdateError.message };
    }
    revalidatePath("/admin/profile");
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function updatePassword({ password, confirm }) {
  try {
    const user = await requireAdmin();
    if (password !== confirm) return { error: "Passwords do not match." };
    if (!password || password.length < 8) return { error: "Password must be at least 8 characters." };
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password))
      return { error: "Password must include both an uppercase and a lowercase letter." };
    const admin = await createAdminClient();
    const { error: passwordUpdateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );
    if (passwordUpdateError) return { error: passwordUpdateError.message };
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
