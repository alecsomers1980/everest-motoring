"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    updateNewsPost,
    publishNewsPost,
    unpublishNewsPost,
    uploadNewsHero,
} from "../actions";

const CATEGORIES = [
    { value: "buying-guide", label: "Buying Guide" },
    { value: "local", label: "White River / Local" },
    { value: "model-review", label: "Model Review" },
];

export default function NewsEditor({ post }) {
    const router = useRouter();
    const [form, setForm] = useState({
        title: post.title || "",
        slug: post.slug || "",
        category: post.category || "buying-guide",
        excerpt: post.excerpt || "",
        meta_title: post.meta_title || "",
        meta_description: post.meta_description || "",
        hero_image_url: post.hero_image_url || "",
        body_md: post.body_md || "",
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    function update(field, value) {
        setForm((f) => ({ ...f, [field]: value }));
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const fd = new FormData();
            fd.set("id", post.id);
            Object.entries(form).forEach(([k, v]) => fd.set(k, v ?? ""));
            const result = await updateNewsPost(fd);
            if (!result.success) {
                setMessage({ type: "error", text: result.error });
            } else {
                setMessage({ type: "ok", text: "Saved." });
                router.refresh();
            }
        } finally {
            setSaving(false);
        }
    }

    async function handlePublishToggle() {
        const publishing = post.status !== "published";
        const confirmMsg = publishing
            ? "Publish this article live? It will appear on /news immediately."
            : "Unpublish this article (returns to draft)?";
        if (!confirm(confirmMsg)) return;
        setSaving(true);
        try {
            const action = publishing ? publishNewsPost : unpublishNewsPost;
            const result = await action(post.id);
            if (!result.success) {
                setMessage({ type: "error", text: result.error });
            } else {
                router.refresh();
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleHeroUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.set("hero", file);
            const result = await uploadNewsHero(fd);
            if (!result.success) {
                setMessage({ type: "error", text: result.error });
            } else {
                update("hero_image_url", result.url);
                setMessage({ type: "ok", text: "Hero image uploaded. Remember to save." });
            }
        } finally {
            setUploading(false);
        }
    }

    const isPublished = post.status === "published";

    return (
        <div>
            <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-slate-900">Edit Article</h1>
                        <span className={`px-2 py-1 text-xs font-bold uppercase rounded-md ${isPublished ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {post.status}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500">
                        Created {new Date(post.created_at).toLocaleDateString()}
                        {post.generated_by_ai ? " • AI-generated" : ""}
                    </p>
                </div>
                <div className="flex gap-2">
                    {isPublished && (
                        <Link
                            href={`/news/${post.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm hover:bg-slate-50"
                        >
                            <span className="material-symbols-outlined text-base">open_in_new</span>
                            View Live
                        </Link>
                    )}
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handlePublishToggle}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-50 ${isPublished
                            ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                            : "bg-green-600 hover:bg-green-700 text-white"
                            }`}
                    >
                        <span className="material-symbols-outlined text-base">
                            {isPublished ? "visibility_off" : "publish"}
                        </span>
                        {isPublished ? "Unpublish" : "Publish"}
                    </button>
                </div>
            </div>

            {message && (
                <div
                    className={`mb-4 p-3 rounded-lg text-sm ${message.type === "error"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-green-50 text-green-700 border border-green-200"
                        }`}
                >
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title *</label>
                    <input
                        type="text"
                        required
                        value={form.title}
                        onChange={(e) => update("title", e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Slug</label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={(e) => update("slug", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">URL: /news/{form.slug || "(auto)"}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                        <select
                            value={form.category}
                            onChange={(e) => update("category", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white"
                        >
                            {CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Excerpt</label>
                    <textarea
                        rows="2"
                        value={form.excerpt}
                        onChange={(e) => update("excerpt", e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Hero Image</label>
                    <div className="flex gap-3 items-start">
                        <input
                            type="url"
                            value={form.hero_image_url}
                            onChange={(e) => update("hero_image_url", e.target.value)}
                            placeholder="https://..."
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-mono text-xs"
                        />
                        <label className="inline-flex items-center gap-2 px-4 py-3 border border-slate-300 rounded-lg font-bold text-sm text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap">
                            <span className="material-symbols-outlined text-base">upload</span>
                            {uploading ? "Uploading..." : "Upload"}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleHeroUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                    {form.hero_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.hero_image_url} alt="Hero preview" className="mt-3 rounded-lg max-h-48 border border-slate-200" />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Body (Markdown)</label>
                    <textarea
                        required
                        rows="24"
                        value={form.body_md}
                        onChange={(e) => update("body_md", e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg font-mono text-sm resize-y"
                    />
                    <p className="text-xs text-slate-500 mt-1">Markdown supported: ## headings, **bold**, lists, [links](/url).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Meta Title (SEO)</label>
                        <input
                            type="text"
                            value={form.meta_title}
                            onChange={(e) => update("meta_title", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg"
                            maxLength="80"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Meta Description (SEO)</label>
                        <textarea
                            rows="2"
                            value={form.meta_description}
                            onChange={(e) => update("meta_description", e.target.value)}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg resize-none"
                            maxLength="200"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <Link href="/admin/news" className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold rounded-lg"
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
