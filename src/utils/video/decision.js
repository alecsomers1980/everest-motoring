import { createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { postApprovedVideoPosts } from "@/app/admin/inventory/socialAction";

/**
 * Flips a pending walkaround to approved or rejected and, on approval, creates
 * the reel + full walkthrough posts.
 *
 * Shared by the emailed confirmation page and the admin buttons so the two
 * routes cannot drift apart. Callers are responsible for authorising the
 * request first — a signed link in one case, an admin session in the other.
 */
export async function applyVideoDecision(carId, action) {
    const admin = await createAdminClient();

    // Only a pending vehicle can be decided, so a replayed link or a double
    // click cannot flip a decision that has already been made.
    const { data: decided } = await admin
        .from("cars")
        .update({ video_approval_status: action === "approve" ? "approved" : "rejected" })
        .eq("id", carId)
        .eq("video_approval_status", "pending")
        .select("id");

    if (!decided || decided.length === 0) {
        return { success: false, error: "This video has already been reviewed." };
    }

    revalidatePath("/admin/inventory");

    if (action === "reject") {
        return { success: true, action, message: "Video rejected — no posts will be created." };
    }

    const posted = await postApprovedVideoPosts(carId);
    if (!posted.success) {
        return { success: false, error: posted.error };
    }

    return {
        success: true,
        action,
        message: `Approved — reel and full walkthrough are scheduled for ${posted.scheduledFor}.`,
    };
}
