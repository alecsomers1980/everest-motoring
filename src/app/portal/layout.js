import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MaterialSymbolsStylesheet from "@/components/MaterialSymbolsStylesheet";

export default async function PortalLayout({ children }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Ensure they are a client
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'client') {
        return redirect("/");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <MaterialSymbolsStylesheet />
            {/* Client Portal Header */}
            <div className="w-full bg-slate-950 px-6 py-4 flex justify-between items-center text-white border-b-4 border-indigo-500 shadow-sm">
                <div className="flex items-center gap-4">
                    <img
                        src="/images/logo.png"
                        alt="Everest Motoring Logo"
                        className="h-8 w-auto mix-blend-screen"
                    />
                    <span className="hidden sm:inline font-bold text-lg tracking-wider text-slate-300 border-l border-slate-700 pl-4">SECURE CLIENT PORTAL</span>
                </div>
                <div className="text-sm font-medium flex gap-4 items-center">
                    <form action="/auth/logout" method="POST">
                        <button type="submit" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">logout</span>
                            Sign Out
                        </button>
                    </form>
                </div>
            </div>

            {/* Page Content */}
            <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col">
                {children}
            </main>
        </div>
    );
}
