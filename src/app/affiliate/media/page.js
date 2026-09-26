import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MediaKitListClient from "./MediaKitListClient";

export const metadata = { title: "Media Kits | Affiliate Portal" };

export default async function MediaKitListPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    const { data: profile } = await supabase
        .from('profiles')
        .select('affiliate_code, role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'affiliate') return redirect("/login");

    // Only currently available cars — sold/reserved/withdrawn or deleted vehicles drop off automatically.
    const { data: cars } = await supabase
        .from('cars')
        .select('id, make, model, year, price, mileage, main_image_url')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

    return <MediaKitListClient cars={cars || []} />;
}
