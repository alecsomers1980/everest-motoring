import * as React from "react";
import { createAdminClient } from "@/utils/supabase/server";
import { sendEmail } from "@/lib/resend";
import { AffiliateMediaKit } from "@/emails/AffiliateMediaKit";
import { buildAffiliateVehiclePayload } from "@/utils/affiliate/mediaKit";

export async function GET() {
    const supabase = await createAdminClient();

    const { data: car, error } = await supabase
        .from("cars")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !car) {
        return Response.json({ success: false, error: error || "No available car found" }, { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
    const vehicle = buildAffiliateVehiclePayload(car, "TEST123", siteUrl);

    const result = await sendEmail({
        to: "alec@firewireit.co.za",
        subject: `[TEST] New Media Kit: ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        react: React.createElement(AffiliateMediaKit, { vehicle, affiliateName: "Alec (Test)" }),
    });

    return Response.json({ success: result.success, car: { id: car.id, make: car.make, model: car.model }, result });
}
