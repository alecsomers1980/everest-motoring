import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import LinkGeneratorClient from "./LinkGeneratorClient";
import { ensureAffiliateCode } from "@/utils/affiliate/code";

export const metadata = { title: "Link Generator | Affiliate Portal" };

export default async function LinkGeneratorPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // Fetch the affiliate's profile data to get their unique code
    const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, affiliate_code, role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'affiliate') return redirect("/login");

    const affiliateCode = await ensureAffiliateCode(supabase, profile);

    // Fetch ONLY available cars directly from the server
    const { data: cars } = await supabase
        .from('cars')
        .select('id, make, model, year, price, mileage, main_image_url')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

    return (
        <LinkGeneratorClient
            cars={cars || []}
            affiliateCode={affiliateCode}
        />
    );
}
