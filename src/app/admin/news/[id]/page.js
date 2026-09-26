import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/utils/supabase/server";
import NewsEditor from "./NewsEditor";

export const metadata = { title: "Edit Article | Admin" };

export default async function AdminNewsEditPage({ params }) {
    const { id } = await params;
    const admin = await createAdminClient();
    const { data: post } = await admin
        .from("news_posts")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (!post) notFound();

    return (
        <div className="p-8 max-w-[1100px] mx-auto w-full">
            <Link href="/admin/news" className="text-sm text-slate-500 hover:text-primary-ink flex items-center gap-1 mb-6">
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to all articles
            </Link>
            <NewsEditor post={post} />
        </div>
    );
}
