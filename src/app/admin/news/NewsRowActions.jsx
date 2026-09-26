"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveNewsPost, publishNewsPost, unpublishNewsPost, deleteNewsPost } from "./actions";

export default function NewsRowActions({ post }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    async function run(fn, confirmMsg) {
        if (confirmMsg && !confirm(confirmMsg)) return;
        setBusy(true);
        try {
            const result = await fn(post.id);
            if (!result?.success) {
                alert(result?.error || "Action failed");
            } else {
                router.refresh();
            }
        } finally {
            setBusy(false);
        }
    }

    const isPublished = post.status === "published";
    const isDraft = post.status === "draft";

    return (
        <div className="flex justify-end gap-2">
            {isDraft && (
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(approveNewsPost, "Approve this article for its scheduled publish date?")}
                    className="p-2 text-slate-400 hover:text-blue-600 disabled:opacity-40"
                    title="Approve for scheduled publishing"
                >
                    <span className="material-symbols-outlined">check_circle</span>
                </button>
            )}
            {isPublished ? (
                <>
                    <Link
                        href={`/news/${post.slug}`}
                        target="_blank"
                        className="p-2 text-slate-400 hover:text-primary-ink"
                        title="View live"
                    >
                        <span className="material-symbols-outlined">open_in_new</span>
                    </Link>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(unpublishNewsPost, "Unpublish this article (returns to draft)?")}
                        className="p-2 text-slate-400 hover:text-yellow-600 disabled:opacity-40"
                        title="Unpublish"
                    >
                        <span className="material-symbols-outlined">visibility_off</span>
                    </button>
                </>
            ) : (
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(publishNewsPost, "Publish this article live?")}
                    className="p-2 text-slate-400 hover:text-green-600 disabled:opacity-40"
                    title="Publish"
                >
                    <span className="material-symbols-outlined">publish</span>
                </button>
            )}
            <Link
                href={`/admin/news/${post.id}`}
                className="p-2 text-slate-400 hover:text-primary-ink"
                title="Edit"
            >
                <span className="material-symbols-outlined">edit</span>
            </Link>
            <button
                type="button"
                disabled={busy}
                onClick={() => run(deleteNewsPost, `Delete "${post.title}"? This cannot be undone.`)}
                className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-40"
                title="Delete"
            >
                <span className="material-symbols-outlined">delete</span>
            </button>
        </div>
    );
}
