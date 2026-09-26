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
    const affiliateCode = formData.get("affiliateCode");

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
                role: affiliateCode ? 'affiliate' : 'client', // Conditionally assign role
                affiliate_code: affiliateCode?.toUpperCase().trim() || null,
            }
        },
    });

    if (authError) {
        return NextResponse.redirect(
            `${requestUrl.origin}/register?error=${encodeURIComponent(authError.message)}`,
            { status: 303 }
        );
    }

    // Upon successful registration, we redirect to a 'check email' page
    // Notice: The trigger in Supabase (which we will create via SQL) will automatically copy this user into the `profiles` table.
    return NextResponse.redirect(
        `${requestUrl.origin}/login?message=${encodeURIComponent("Check your email to verify your application")}&registered=affiliate`,
        { status: 303 }
    );
}
