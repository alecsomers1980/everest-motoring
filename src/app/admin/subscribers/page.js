import { createAdminClient } from "@/utils/supabase/server";
import SendNewsletterButton from "./SendNewsletterButton";

export const metadata = {
    title: "Newsletter Subscribers | Everest Admin",
};

export default async function SubscribersPage() {
    const supabase = await createAdminClient();

    const { data: subscribers } = await supabase
        .from("newsletter_subscribers")
        .select("id, email, created_at")
        .order("created_at", { ascending: false });

    const rows = subscribers || [];

    return (
        <div className="p-8 max-w-5xl mx-auto w-full text-white">
            <div className="mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                    Newsletter <span className="italic">Subscribers</span>
                </h1>
                <p className="text-slate-400 mt-1 font-medium">
                    Email addresses captured from the newsletter sign-up forms.
                </p>
                <div className="mt-5">
                    <SendNewsletterButton />
                    <p className="text-slate-400 text-xs mt-2 font-medium">
                        Sends the latest-arrivals newsletter to all subscribers now. It also goes out automatically once a year.
                    </p>
                </div>
            </div>

            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                {rows.length} Subscriber{rows.length !== 1 ? "s" : ""}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">
                            <th className="p-5">Email</th>
                            <th className="p-5">Subscribed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-5 font-bold text-slate-900">
                                    <a href={`mailto:${s.email}`} className="hover:text-primary-ink">{s.email}</a>
                                </td>
                                <td className="p-5 text-slate-500 font-medium">
                                    {s.created_at ? new Date(s.created_at).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan="2" className="p-12 text-center text-slate-500 bg-slate-50/50">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">mail</span>
                                    <p>No subscribers yet.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
