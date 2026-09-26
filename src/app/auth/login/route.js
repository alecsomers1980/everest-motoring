import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
    const requestUrl = new URL(request.url);
    const formData = await request.formData();
    const email = formData.get("email");
    const password = formData.get("password");
    const supabase = await createClient();

    const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        if (request.headers.get('accept')?.includes('application/json')) {
            return NextResponse.json({ error: "Invalid Credentials" }, { status: 400 });
        }
        return NextResponse.redirect(
            `${requestUrl.origin}/login?error=Invalid Credentials`,
            { status: 301 }
        );
    }

    // Determine user role and route them
    let redirectPath = '/login';

    if (authData?.user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', authData.user.id)
            .single();

        if (profile?.role === 'admin') {
            redirectPath = '/admin/inventory';
        } else if (profile?.role === 'client') {
            redirectPath = '/portal';
        } else if (profile?.role === 'affiliate') {
            redirectPath = '/affiliate';
        }
    }

    // If login succeeds, send them to their specific dashboard
    if (request.headers.get('accept')?.includes('application/json')) {
        return NextResponse.json({ redirect: redirectPath });
    }

    return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`, {
        status: 301,
    });
}
