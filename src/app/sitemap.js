import { createClient } from "@/utils/supabase/server";
import { getVehiclePath } from "@/utils/url/vehicleUrl";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

const STATIC_ROUTES = [
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/inventory", changeFrequency: "daily", priority: 0.9 },
    { path: "/news", changeFrequency: "weekly", priority: 0.7 },
    { path: "/about", changeFrequency: "monthly", priority: 0.6 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
    { path: "/finance", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap() {
    const now = new Date();

    const staticEntries = STATIC_ROUTES.map((r) => ({
        url: `${SITE_URL}${r.path}`,
        lastModified: now,
        changeFrequency: r.changeFrequency,
        priority: r.priority,
    }));

    let carEntries = [];
    try {
        const supabase = await createClient();
        const { data: cars, error } = await supabase
            .from("cars")
            .select("id, make, model, year, created_at")
            .neq("status", "sold");

        if (error) console.error("sitemap: cars query error", error.message);

        carEntries = (cars || []).map((car) => ({
            url: `${SITE_URL}${getVehiclePath(car)}`,
            lastModified: car.created_at ? new Date(car.created_at) : now,
            changeFrequency: "weekly",
            priority: 0.8,
        }));
    } catch (err) {
        console.error("sitemap: failed to load cars", err);
    }

    let newsEntries = [];
    try {
        const supabase = await createClient();
        const { data: posts, error } = await supabase
            .from("news_posts")
            .select("slug, published_at, updated_at")
            .eq("status", "published");

        if (error) console.error("sitemap: news query error", error.message);

        newsEntries = (posts || []).map((p) => ({
            url: `${SITE_URL}/news/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : (p.published_at ? new Date(p.published_at) : now),
            changeFrequency: "monthly",
            priority: 0.7,
        }));
    } catch (err) {
        console.error("sitemap: failed to load news", err);
    }

    return [...staticEntries, ...carEntries, ...newsEntries];
}
