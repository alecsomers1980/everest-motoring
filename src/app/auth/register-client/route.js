import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();

    const email = formData.get("email");
    const password = formData.get("password");
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const phone = formData.get("phone");
    const carId = formData.get("carId");

    const supabase = await createClient();

    // Create the auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${requestUrl.origin}/auth/callback`,
            data: {
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                role: 'client', // Hardcode role for this registration path
            }
        },
    });

    if (authError) {
        if (request.headers.get('accept')?.includes('application/json')) {
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }
        return NextResponse.redirect(
            `${requestUrl.origin}/login?register=client&error=${encodeURIComponent(authError.message)}`,
            { status: 303 }
        );
    }

    // Capture Affiliate Attribution via secure cookie set by middleware
    const affiliateId = request.cookies.get("everest_affiliate_id")?.value;

    // If a car_id was provided, immediately create the lead linking the client to the car
    if (carId && authData?.user?.id) {
        const payload = {
            client_id: authData.user.id,
            car_id: carId,
            client_name: `${firstName} ${lastName}`,
            client_email: email,
            client_phone: phone,
            status: "new",
        };

        // If attributed to an affiliate, attach them
        if (affiliateId) {
            // lookup the actual User ID of the affiliate code
            const { data: afflData } = await supabase
                .from('profiles')
                .select('id')
                .eq('affiliate_code', affiliateId)
                .single();

            if (afflData?.id) {
                payload.affiliate_id = afflData.id;
            }
        }

        await supabase.from("leads").insert(payload);
    }

    // Registration succeeded. Tell them to check their email before logging in.
    const successMessage = "Account created! Please check your email to verify your address.";

    if (request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json({ message: successMessage });
    }

    return NextResponse.redirect(
        `${requestUrl.origin}/login?message=${encodeURIComponent(successMessage)}`,
        { status: 303 }
    );
}
