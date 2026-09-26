import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MaterialSymbolsStylesheet from "@/components/MaterialSymbolsStylesheet";

export default async function AffiliateLayout({ children }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Ensure they have the affiliate role and read their approval status
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'affiliate') {
        return redirect("/");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <MaterialSymbolsStylesheet />
            {/* Affiliate Portal Header */}
            <div className="w-full bg-slate-900 px-6 py-4 flex justify-between items-center text-white border-b-4 border-amber-500 shadow-sm">
                <div className="flex items-center gap-4">
                    <img
                        src="/images/logo.png"
                        alt="Everest Motoring Logo"
                        className="h-8 w-auto mix-blend-screen"
                    />
                    <span className="hidden sm:inline font-bold text-lg tracking-wider text-amber-500 border-l border-slate-700 pl-4">AFFILIATE NETWORK</span>
                </div>
                <div className="text-sm font-medium flex gap-6 items-center">
                    <a href="/affiliate" className="text-slate-300 hover:text-white transition-colors">Pipeline</a>
                    <a href="/affiliate/links" className="text-slate-300 hover:text-white transition-colors hidden sm:block">Link Generator</a>
                    <a href="/affiliate/media" className="text-slate-300 hover:text-white transition-colors hidden sm:block">Media Kits</a>
                    <form action="/auth/logout" method="POST" className="border-l border-slate-700 pl-6">
                        <button type="submit" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">logout</span>
                            <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </form>
                </div>
            </div>

            {/* Page Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-8 flex flex-col">
                {profile.is_approved ? (
                    children
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-700 max-w-lg mx-auto w-full">
                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mb-6 border border-amber-100 shadow-sm">
                            <span className="material-symbols-outlined text-5xl text-amber-500">pending_actions</span>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-3">Application Under Review</h2>
                        <p className="text-slate-500 text-lg leading-relaxed mb-8 text-balance">
                            Thank you for registering to become an Everest Motoring Affiliate. Our team is currently reviewing your application. You will be notified once your account has been activated.
                        </p>
                        <form action="/auth/logout" method="POST">
                            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-lg font-bold transition-all shadow-md flex items-center gap-2 mx-auto">
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                                Return to Login
                            </button>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
}
