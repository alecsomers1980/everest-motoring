import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Icon from "@/components/Icon";

export const metadata = {
    title: "Dashboard | Everest Motoring",
    description: "Secure dashboard for affiliates and staff.",
};

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <div className="w-full bg-slate-950 px-6 py-4 flex justify-between items-center text-white">
                <div className="flex items-center gap-4">
                    <img
                        src="/images/logo.png"
                        alt="Everest Motoring Logo"
                        className="h-8 w-auto mix-blend-screen"
                    />
                    <span className="font-bold border-l border-white/20 pl-4">Portal</span>
                </div>
                <div className="text-sm font-medium text-slate-300">
                    Logged in as: <span className="text-white">{user.email}</span>
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8 text-center">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome to your Dashboard</h1>
                    <p className="text-slate-500 text-lg">Your authentication was successful.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                        <Icon name="group" className="text-primary-ink text-3xl bg-primary/10 p-3 rounded-lg" />
                        <div>
                            <h3 className="font-bold text-slate-900">Total Leads</h3>
                            <p className="text-2xl font-bold text-slate-700 mt-1">0</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                        <Icon name="directions_car" className="text-secondary text-3xl bg-secondary/10 p-3 rounded-lg" />
                        <div>
                            <h3 className="font-bold text-slate-900">Sales Closed</h3>
                            <p className="text-2xl font-bold text-slate-700 mt-1">0</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-4">
                        <Icon name="account_balance_wallet" className="text-green-600 text-3xl bg-green-50 p-3 rounded-lg" />
                        <div>
                            <h3 className="font-bold text-slate-900">Pending Commision</h3>
                            <p className="text-2xl font-bold text-slate-700 mt-1">R 0.00</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
