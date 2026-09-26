"use server";
import { createClient } from "@/utils/supabase/server";
import { sendNewsletterToSubscribers } from "@/lib/newsletter";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "admin") throw new Error("Admins only");
}

export async function sendNewsletterAction() {
  try {
    await requireAdmin();
    const res = await sendNewsletterToSubscribers();
    return { success: true, sent: res.sent, total: res.total };
  } catch (e) {
    return { error: e.message };
  }
}
