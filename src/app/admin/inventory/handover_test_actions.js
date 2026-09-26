"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import {
    startSeedanceClip,
    pollSeedanceClip,
    SEEDANCE_STYLE_PROMPTS,
    buildSeedancePrompt,
} from "@/utils/ai/seedanceService";
import { addCongratsVoiceover } from "@/utils/ai/congratsVoiceover";

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
    return { user };
}

/**
 * Generate a handover video from an uploaded photo WITHOUT creating a sale
 * record — for previewing the styles + the congratulations voiceover. Same
 * parameters as the real post-sale video (silent clip; voiceover added on
 * completion in the poll). Each run costs Kie credits.
 */
export async function startTestHandoverVideo(formData) {
    await requireAdmin();
    const admin = await createAdminClient();

    const styleKey = formData.get("style");
    const file = formData.get("image");

    if (!SEEDANCE_STYLE_PROMPTS[styleKey]) return { error: "Invalid video style." };
    if (!file || typeof file !== "object" || file.size === 0) {
        return { error: "Please choose a photo to test with." };
    }

    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const fileName = `test/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
        .from("delivery-photos")
        .upload(fileName, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (upErr) return { error: `Image upload failed: ${upErr.message}` };
    const { data: urlData } = admin.storage.from("delivery-photos").getPublicUrl(fileName);

    try {
        const prompt = buildSeedancePrompt(styleKey, { buyerName: formData.get("buyer_name") || "friend" });
        const { taskId } = await startSeedanceClip({
            imageUrl: urlData.publicUrl,
            prompt,
            durationSeconds: 8,
            aspectRatio: "16:9",
            resolution: "720p",
            generateAudio: false,
        });
        return { success: true, taskId };
    } catch (err) {
        return { error: err.message || "Failed to start generation." };
    }
}

export async function pollTestHandoverVideo(taskId, fullName, carLabel) {
    await requireAdmin();
    if (!taskId) return { status: "none" };
    const result = await pollSeedanceClip(taskId);
    if (result.error) return { status: "failed", error: result.error };
    if (result.isComplete && result.videoUrl) {
        let finalUrl = result.videoUrl;
        try {
            finalUrl = await addCongratsVoiceover(result.videoUrl, {
                fullName: fullName || "friend",
                carLabel: carLabel || "vehicle",
                carId: "test",
            });
        } catch (voErr) {
            console.warn("test voiceover mux failed, using silent clip:", voErr.message);
        }
        return { status: "ready", videoUrl: finalUrl };
    }
    return { status: "pending" };
}
