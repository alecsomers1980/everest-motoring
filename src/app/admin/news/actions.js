"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { submitToIndexNow } from "@/utils/seo/indexNow";
import {
    generateNewsArticle,
    pickNextCategory,
    pickHeroImage,
    slugify,
    estimateReadingMinutes,
} from "@/utils/ai/newsGenerator";
import { postNewsToGbp } from "@/utils/google/gbpService";
import { publishPostRecord } from "@/utils/news/publishPost";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
        console.error("requireAdmin: authError", authError);
    }

    if (!user) {
        console.warn("requireAdmin: No user found in session.");
        throw new Error("Unauthorized");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
        console.error("requireAdmin: profileError", profileError);
    }

    if (!profile || profile.role !== "admin") {
        console.warn("requireAdmin: Access denied for user", user.email, "Role index:", profile?.role);
        throw new Error("Admins only");
    }

    console.log("requireAdmin: Success for", user.email);
    return { user };
}

async function uniqueSlug(admin, baseSlug) {
    let slug = baseSlug || `article-${Date.now()}`;
    let suffix = 0;
    // up to 50 attempts
    while (suffix < 50) {
        const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
        const { data } = await admin
            .from("news_posts")
            .select("id")
            .eq("slug", candidate)
            .maybeSingle();
        if (!data) return candidate;
        suffix += 1;
    }
    return `${slug}-${Date.now()}`;
}

async function pickFeaturedCar(admin) {
    const { data: cars } = await admin
        .from("cars")
        .select("id, make, model, year, price, mileage, transmission, fuel_type, features, main_image_url")
        .eq("status", "available")
        .order("price", { ascending: false })
        .limit(20);
    if (!cars || cars.length === 0) return null;
    return cars[Math.floor(Math.random() * cars.length)];
}

export async function generateNewsPost({ userId, autoPublish = false, scheduledFor = null } = {}) {
    const admin = await createAdminClient();

    const { data: recentPosts } = await admin
        .from("news_posts")
        .select("title, category, hero_image_url")
        .order("created_at", { ascending: false })
        .limit(12);

    const recentCategories = (recentPosts || []).slice(0, 3).map((p) => p.category);
    const recentTitles = (recentPosts || []).map((p) => p.title);
    const recentHeroUrls = (recentPosts || []).map((p) => p.hero_image_url);

    let category = await pickNextCategory(recentCategories);
    let featuredCar = null;
    if (category === "model-review") {
        featuredCar = await pickFeaturedCar(admin);
        if (!featuredCar) {
            // No inventory — fall back to a different category
            category = Math.random() < 0.5 ? "buying-guide" : "local";
        }
    }

    const article = await generateNewsArticle({
        category,
        recentTitles,
        car: featuredCar,
    });

    const slug = await uniqueSlug(admin, article.slug || slugify(article.title));
    const hero = pickHeroImage(category, featuredCar, recentHeroUrls);
    const now = new Date().toISOString();
    const publishedAt = autoPublish ? now : null;
    const status = autoPublish ? "published" : "draft";

    const { data: inserted, error } = await admin
        .from("news_posts")
        .insert({
            slug,
            title: article.title,
            excerpt: article.excerpt,
            hero_image_url: hero,
            body_md: article.body_md,
            category,
            featured_car_id: featuredCar?.id || null,
            meta_title: article.meta_title,
            meta_description: article.meta_description,
            reading_minutes: article.reading_minutes,
            status,
            published_at: publishedAt,
            scheduled_for: scheduledFor,
            generated_by_ai: true,
            created_by: userId || null,
        })
        .select()
        .single();

    if (error) {
        console.error("generateNewsPost insert error:", error);
        throw new Error(error.message || "Failed to save generated article");
    }

    if (autoPublish) {
        try {
            await submitToIndexNow([
                `${SITE_URL}/news`,
                `${SITE_URL}/news/${slug}`,
                `${SITE_URL}/sitemap.xml`,
            ]);
        } catch (err) {
            console.warn("IndexNow ping failed (post still published):", err);
        }
        postNewsToGbp(inserted).catch((err) => console.warn("GBP news post failed:", err));
    }

    return inserted;
}

export async function generateNewsPostAction({ autoPublish = false } = {}) {
    try {
        const { user } = await requireAdmin();
        const post = await generateNewsPost({ userId: user.id, autoPublish });
        revalidatePath("/admin/news");
        if (autoPublish) revalidatePath("/news");
        return { success: true, post };
    } catch (err) {
        console.error("generateNewsPostAction error:", err);
        return { success: false, error: err.message || "Generation failed" };
    }
}

export async function updateNewsPost(formData) {
    await requireAdmin();
    const admin = await createAdminClient();

    const id = formData.get("id");
    if (!id) return { success: false, error: "Missing post id" };

    const title = String(formData.get("title") || "").trim();
    const excerpt = String(formData.get("excerpt") || "").trim() || null;
    const body_md = String(formData.get("body_md") || "").trim();
    const category = String(formData.get("category") || "buying-guide");
    const meta_title = String(formData.get("meta_title") || "").trim() || null;
    const meta_description = String(formData.get("meta_description") || "").trim() || null;
    const hero_image_url = String(formData.get("hero_image_url") || "").trim() || null;
    let slug = String(formData.get("slug") || "").trim();

    if (!title || !body_md) return { success: false, error: "Title and body are required" };
    if (!slug) slug = slugify(title);

    const { data: existing } = await admin
        .from("news_posts")
        .select("id, slug, status")
        .eq("slug", slug)
        .maybeSingle();
    if (existing && existing.id !== id) {
        return { success: false, error: `Slug "${slug}" is already used by another post` };
    }

    const { error } = await admin
        .from("news_posts")
        .update({
            title,
            excerpt,
            body_md,
            category,
            meta_title,
            meta_description,
            hero_image_url,
            slug,
            reading_minutes: estimateReadingMinutes(body_md),
        })
        .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/news");
    revalidatePath(`/news/${slug}`);
    revalidatePath("/news");
    return { success: true };
}

// Approve a draft so the scheduled-publish cron may take it live on its date.
// The approval is the human editorial control that the auto-publish path lacked.
export async function approveNewsPost(id) {
    await requireAdmin();
    const admin = await createAdminClient();

    const { error } = await admin
        .from("news_posts")
        .update({ status: "approved" })
        .eq("id", id)
        .eq("status", "draft");
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/news");
    return { success: true };
}

export async function publishNewsPost(id) {
    await requireAdmin();
    const admin = await createAdminClient();

    const { data: post } = await admin
        .from("news_posts")
        .select("id, slug, status, published_at, title, excerpt, hero_image_url")
        .eq("id", id)
        .maybeSingle();
    if (!post) return { success: false, error: "Post not found" };

    try {
        await publishPostRecord(admin, post);
    } catch (err) {
        return { success: false, error: err.message };
    }

    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${post.slug}`);
    return { success: true };
}

export async function unpublishNewsPost(id) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data: post } = await admin.from("news_posts").select("slug").eq("id", id).maybeSingle();
    const { error } = await admin
        .from("news_posts")
        .update({ status: "draft" })
        .eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/news");
    revalidatePath("/news");
    if (post?.slug) revalidatePath(`/news/${post.slug}`);
    return { success: true };
}

export async function deleteNewsPost(id) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data: post } = await admin.from("news_posts").select("slug").eq("id", id).maybeSingle();
    const { error } = await admin.from("news_posts").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/news");
    revalidatePath("/news");
    if (post?.slug) revalidatePath(`/news/${post.slug}`);
    return { success: true };
}

export async function uploadNewsHero(formData) {
    await requireAdmin();
    const admin = await createAdminClient();
    const file = formData.get("hero");
    if (!file || typeof file !== "object" || file.size === 0) {
        return { success: false, error: "No file provided" };
    }
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const fileName = `hero-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
        .from("news-images")
        .upload(fileName, file, { upsert: false, contentType: file.type });
    if (upErr) return { success: false, error: upErr.message };
    const { data } = admin.storage.from("news-images").getPublicUrl(fileName);
    return { success: true, url: data.publicUrl };
}
