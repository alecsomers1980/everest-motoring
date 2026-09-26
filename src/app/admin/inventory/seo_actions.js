"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { submitToIndexNow } from "@/utils/seo/indexNow";
import { getVehicleUrl } from "@/utils/url/vehicleUrl";
import { generateSeoForCar } from "@/utils/ai/seoGenerator";
import { revalidatePath } from "next/cache";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

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
    return user;
}

export async function pingVehicleUrls(carIds, { includeIndex = true } = {}) {
    await requireAdmin();

    const supabase = await createClient();
    const ids = (Array.isArray(carIds) ? carIds : [carIds]).filter(Boolean);

    const urls = [];
    if (includeIndex) {
        urls.push(`${SITE_URL}/`);
        urls.push(`${SITE_URL}/inventory`);
    }

    if (ids.length > 0) {
        const { data: cars } = await supabase
            .from("cars")
            .select("id, make, model, year")
            .in("id", ids);

        (cars || []).forEach((car) => {
            urls.push(getVehicleUrl(car, SITE_URL));
        });
    }

    return await submitToIndexNow(urls);
}

export async function pingDeletedVehicle(car) {
    await requireAdmin();
    const urls = [
        `${SITE_URL}/`,
        `${SITE_URL}/inventory`,
        getVehicleUrl(car, SITE_URL),
    ];
    return await submitToIndexNow(urls);
}

export async function autoFixSeoForCar(carId) {
    try {
        await requireAdmin();
        const admin = await createAdminClient();

        const { data: car, error: carErr } = await admin
            .from("cars")
            .select("id, make, model, year, price, mileage, transmission, fuel_type, features, main_image_url, gallery_urls")
            .eq("id", carId)
            .single();
        if (carErr || !car) return { success: false, error: "Vehicle not found" };

        const seo = await generateSeoForCar(car);

        const { error: updErr } = await admin
            .from("cars")
            .update({
                seo_meta_title: seo.seo_meta_title,
                seo_meta_description: seo.seo_meta_description,
                image_alts: seo.image_alts,
                seo_updated_at: new Date().toISOString(),
            })
            .eq("id", carId);
        if (updErr) return { success: false, error: updErr.message };

        revalidatePath("/admin/inventory");
        revalidatePath("/inventory");
        revalidatePath(`/inventory/${carId}`);

        return { success: true, seo };
    } catch (err) {
        console.error("autoFixSeoForCar:", err);
        return { success: false, error: err.message || "SEO fix failed" };
    }
}

export async function autoFixSeoBatch({ onlyMissing = true, limit = 20 } = {}) {
    try {
        await requireAdmin();
        const admin = await createAdminClient();

        let query = admin
            .from("cars")
            .select("id, make, model, year, price, mileage, transmission, fuel_type, features, main_image_url, gallery_urls, seo_updated_at")
            .neq("status", "sold");

        if (onlyMissing) {
            query = query.is("seo_updated_at", null);
        }

        const { data: cars, error } = await query.limit(limit);
        if (error) return { success: false, error: error.message };
        if (!cars || cars.length === 0) return { success: true, processed: 0, failed: 0 };

        let processed = 0;
        let failed = 0;
        const failures = [];

        for (const car of cars) {
            try {
                const seo = await generateSeoForCar(car);
                const { error: updErr } = await admin
                    .from("cars")
                    .update({
                        seo_meta_title: seo.seo_meta_title,
                        seo_meta_description: seo.seo_meta_description,
                        image_alts: seo.image_alts,
                        seo_updated_at: new Date().toISOString(),
                    })
                    .eq("id", car.id);
                if (updErr) throw new Error(updErr.message);
                processed += 1;
            } catch (err) {
                failed += 1;
                failures.push({ id: car.id, error: err.message });
                console.warn(`[SEO batch] failed for ${car.id}:`, err.message);
            }
        }

        revalidatePath("/admin/inventory");
        revalidatePath("/inventory");

        return { success: true, processed, failed, failures };
    } catch (err) {
        console.error("autoFixSeoBatch:", err);
        return { success: false, error: err.message || "Batch SEO fix failed" };
    }
}
