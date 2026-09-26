import Link from "next/link";
import { createAdminClient } from "@/utils/supabase/server";
import NewsActionBar from "./NewsActionBar";
import NewsRowActions from "./NewsRowActions";

export const metadata = { title: "News | Admin" };

const CATEGORY_LABEL = {
    "buying-guide": "Buying Guide",
    "local": "White River",
    "model-review": "Model Review",
};

const STATUS_STYLES = {
    published: "bg-green-100 text-green-700",
    approved: "bg-blue-100 text-blue-700",
    draft: "bg-yellow-100 text-yellow-700",
    archived: "bg-slate-200 text-slate-600",
};

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export default async function AdminNewsPage() {
    const admin = await createAdminClient();
    const { data: posts } = await admin
        .from("news_posts")
        .select("id, slug, title, category, status, published_at, scheduled_for, created_at, generated_by_ai, reading_minutes")
        .order("created_at", { ascending: false });

    return (
        <div className="p-8 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-black">Editorial <span className="italic">Desk</span></h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Two AI drafts on the 1st of each month. Approve one and it publishes on its
                        scheduled date — an unapproved draft never goes live.
                    </p>
                </div>
                <NewsActionBar />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">
                            <th className="p-6">Title</th>
                            <th className="p-6">Category</th>
                            <th className="p-6">Status</th>
                            <th className="p-6">Scheduled</th>
                            <th className="p-6">Published</th>
                            <th className="p-6">Source</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(posts || []).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <Link href={`/admin/news/${p.id}`} className="font-bold text-slate-900 hover:text-primary-ink">
                                        {p.title}
                                    </Link>
                                    <p className="text-xs text-slate-400 mt-1">/news/{p.slug}</p>
                                </td>
                                <td className="p-4 text-sm text-slate-600">
                                    {CATEGORY_LABEL[p.category] || p.category}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-block px-2 py-1 text-xs font-bold uppercase rounded-md ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{formatDate(p.scheduled_for)}</td>
                                <td className="p-4 text-sm text-slate-600">{formatDate(p.published_at)}</td>
                                <td className="p-4 text-xs text-slate-500">
                                    {p.generated_by_ai ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 font-bold uppercase tracking-wider rounded-md border border-purple-200">
                                            <span className="material-symbols-outlined text-[12px]">auto_awesome</span>
                                            AI
                                        </span>
                                    ) : (
                                        <span className="text-slate-400">Manual</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <NewsRowActions post={p} />
                                </td>
                            </tr>
                        ))}
                        {(!posts || posts.length === 0) && (
                            <tr>
                                <td colSpan="7" className="p-12 text-center text-slate-500">
                                    No articles yet. Click "Generate Article" to create your first AI-written post.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
