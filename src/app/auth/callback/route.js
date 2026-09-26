import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request) {
    // The `/auth/callback` route is required for the server-side auth flow to work with Deep Links (like Email Invites/Forgot Password).
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");

    let sessionError = null;
    const supabase = await createClient();

    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        sessionError = error;
    } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        sessionError = error;
    }

    if (token_hash || code) {
        if (!sessionError) {
            // Check their role to redirect appropriately
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'client') {
                    // For a full production app, you might want to redirect an 'invite' type to a /portal/setup-password page.
                    // For now, we drop them directly into the dashboard.
                    return NextResponse.redirect(`${requestUrl.origin}/portal`);
                }

                if (profile?.role === 'admin') {
                    return NextResponse.redirect(`${requestUrl.origin}/admin/inventory`);
                }

                return NextResponse.redirect(`${requestUrl.origin}/login`);
            }
        } else {
            console.error("Auth Callback Error:", sessionError.message);
            return NextResponse.redirect(`${requestUrl.origin}/login?error=Invalid%20or%20expired%20link`);
        }
    }

    // Default redirect if something fails or no code is present
    return NextResponse.redirect(`${requestUrl.origin}/login`);
}
