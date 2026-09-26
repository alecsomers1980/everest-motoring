import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request) {
    // 1. Maintain Supabase Auth Session
    const response = await updateSession(request);

    // 2. Affiliate Tracking Logic
    // If ANY URL across the entire domain contains ?ref=JOHN123, catch it.
    const refCode = request.nextUrl.searchParams.get("ref");

    if (refCode) {
        // Set a 30-day secure cookie so the lead is attributed even if they apply weeks later
        response.cookies.set({
            name: "everest_affiliate_id",
            value: refCode,
            path: "/",
            maxAge: 60 * 60 * 24 * 30, // 30 days
            httpOnly: true, // Secure: Next.js Server actions can read it, but malicious Client JS cannot
            sameSite: "lax",
        });
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
