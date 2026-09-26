import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import MediaKitClient from "./MediaKitClient";
import { ensureAffiliateCode } from "@/utils/affiliate/code";

export const metadata = { title: "Media Kit | Affiliate Portal" };

export default async function MediaKitPage({ params }) {
    const { carId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, affiliate_code, role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "affiliate") return redirect("/login");

    const affiliateCode = await ensureAffiliateCode(supabase, profile);

    const { data: car } = await supabase
        .from("cars")
        .select("id, make, model, year, price, mileage, transmission, fuel_type, colour, features, main_image_url, video_url")
        .eq("id", carId)
        .single();

    if (!car) return notFound();

    const cfSubdomain = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN;
    const videoUid = typeof car.video_url === "string" && car.video_url.startsWith("cf:")
        ? car.video_url.slice(3)
        : null;
    const videoIframeUrl = videoUid && cfSubdomain
        ? `https://${cfSubdomain}/${videoUid}/iframe`
        : null;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

    return (
        <MediaKitClient
            car={car}
            affiliateCode={affiliateCode}
            videoIframeUrl={videoIframeUrl}
            siteUrl={siteUrl}
        />
    );
}
