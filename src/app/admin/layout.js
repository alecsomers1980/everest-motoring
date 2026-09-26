import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserCircle, Globe, LogOut } from "lucide-react";
import VideoRenderManager from "@/components/VideoRenderManager";
import MaterialSymbolsStylesheet from "@/components/MaterialSymbolsStylesheet";
import { AdminNavDesktop, AdminNavMobile } from "@/components/admin/AdminNav";

// Server Actions inherit the route segment config of the page that
// dispatches them. The AI walkaround pipeline (ai_actions.js) runs the
// longest chain — ingestMuxAction calls Cloudflare's enableDownloads which
// polls for up to 180s waiting for MP4 generation. 300s (the Pro plan
// ceiling) gives that headroom without risking platform-level rejection.
// pollSingleClipAction's ~30s worst case (Kie poll + ElevenLabs TTS +
// Fal mux) also benefits from the larger budget on slow days.
export const maxDuration = 300;

export default async function AdminLayout({ children }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const { createAdminClient } = await import("@/utils/supabase/server");
    const supabaseAdmin = await createAdminClient();

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') {
        return redirect("/login?error=You+must+be+logged+in+as+an+Admin+to+access+this+dashboard.");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col relative">
            <MaterialSymbolsStylesheet />
            {/* Unified Admin Header */}
            <header className="w-full bg-black px-6 py-4 flex justify-between items-center text-white border-b border-hairline-dark relative z-30">
                <div className="flex items-center gap-10 relative z-10">
                    <Link href="/admin" className="text-lg font-semibold tracking-display">
                        Everest<span className="text-primary">.</span>
                        <span className="ml-2 text-slate-500 font-normal">Admin</span>
                    </Link>
                    <AdminNavDesktop />
                </div>
                <div className="flex gap-2 items-center relative z-10">
                    <Link
                        href="/admin/profile"
                        className="hidden lg:inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
                    >
                        <UserCircle className="h-4 w-4" />
                        Profile
                    </Link>
                    <Link
                        href="/"
                        className="hidden lg:inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
                    >
                        <Globe className="h-4 w-4" />
                        View site
                    </Link>
                    <form action="/auth/logout" method="POST" className="hidden lg:block">
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign out
                        </button>
                    </form>
                    <AdminNavMobile />
                </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 w-full flex flex-col relative z-10">
                {children}
            </main>

            <VideoRenderManager />
        </div>
    );
}

