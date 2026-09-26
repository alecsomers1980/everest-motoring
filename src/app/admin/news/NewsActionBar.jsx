"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateNewsPostAction } from "./actions";

export default function NewsActionBar() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleGenerate(autoPublish) {
        if (loading) return;
        const confirmMsg = autoPublish
            ? "Generate a new AI article AND publish it live immediately?"
            : "Generate a new AI article as a draft for review?";
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const result = await generateNewsPostAction({ autoPublish });
            if (!result.success) {
                alert(result.error || "Generation failed");
                return;
            }
            router.push(`/admin/news/${result.post.id}`);
        } catch (err) {
            alert(err.message || "Generation failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex gap-2">
            <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerate(false)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50 disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-base">edit_note</span>
                Generate Draft
            </button>
            <button
                type="button"
                disabled={loading}
                onClick={() => handleGenerate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-black rounded-lg font-bold text-sm disabled:opacity-50"
            >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                {loading ? "Generating..." : "Generate & Publish"}
            </button>
        </div>
    );
}
