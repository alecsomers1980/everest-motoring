import { createAdminClient } from "@/utils/supabase/server";
import { submitToIndexNow } from "@/utils/seo/indexNow";
import { postNewsToGbp } from "@/utils/google/gbpService";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

// Flip a post live and fire the post-publish pings. Plain server helpers (NOT
// server actions) so the scheduled-publish cron can share them with the admin
// action without exposing an unauthenticated publish endpoint.
export async function publishPostRecord(admin, post) {
    const publishedAt = post.published_at || new Date().toISOString();

    const { error } = await admin
        .from("news_posts")
        .update({ status: "published", published_at: publishedAt })
        .eq("id", post.id);
    if (error) throw new Error(error.message);

    try {
        await submitToIndexNow([
            `${SITE_URL}/news`,
            `${SITE_URL}/news/${post.slug}`,
            `${SITE_URL}/sitemap.xml`,
        ]);
    } catch (err) {
        console.warn("IndexNow ping failed (post still published):", err);
    }

    postNewsToGbp(post).catch((err) => console.warn("GBP news post failed:", err));
}

// Publish every approved article whose scheduled date has arrived. Uses <= so a
// late approval is picked up by the next run instead of being silently dropped.
export async function publishDueNewsPosts() {
    const admin = await createAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: due, error } = await admin
        .from("news_posts")
        .select("id, slug, title, excerpt, hero_image_url, published_at")
        .eq("status", "approved")
        .lte("scheduled_for", today)
        .order("scheduled_for", { ascending: true });
    if (error) throw new Error(error.message);

    const published = [];
    for (const post of due || []) {
        await publishPostRecord(admin, post);
        published.push({ id: post.id, slug: post.slug, title: post.title });
    }
    return published;
}
