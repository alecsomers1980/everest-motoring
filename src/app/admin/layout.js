import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import VideoRenderManager from "@/components/VideoRenderManager";
import MaterialSymbolsStylesheet from "@/components/MaterialSymbolsStylesheet";
import { AdminSidebar, AdminNavMobile } from "@/components/admin/AdminNav";

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
        <div className="min-h-screen bg-slate-50 flex flex-col relative lg:pl-60">
            <MaterialSymbolsStylesheet />
            <AdminSidebar />
            {/* Mobile Admin Header — desktop navigates from the sidebar */}
            <header className="lg:hidden w-full bg-black px-6 py-4 flex justify-between items-center text-white border-b border-hairline-dark relative z-30">
                <Link href="/admin" className="text-lg font-semibold tracking-display">
                    Everest<span className="text-primary">.</span>
                    <span className="ml-2 text-white/50 font-normal">Admin</span>
                </Link>
                <AdminNavMobile />
            </header>

            {/* Page Content */}
            <main className="flex-1 w-full min-w-0 flex flex-col relative z-10">
                {children}
            </main>

            <VideoRenderManager />
        </div>
    );
}

