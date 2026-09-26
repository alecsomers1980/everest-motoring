"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { autoFixSeoBatch } from "./seo_actions";

export default function SeoBatchButton() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    async function handleBatch(onlyMissing) {
        if (busy) return;
        const msg = onlyMissing
            ? "Auto-Fix SEO for all vehicles that don't have SEO metadata yet? (up to 20 vehicles, uses Gemini vision on images)"
            : "Re-generate SEO for ALL non-sold vehicles? This will overwrite existing SEO fields. (up to 20)";
        if (!confirm(msg)) return;

        setBusy(true);
        setResult(null);
        try {
            const r = await autoFixSeoBatch({ onlyMissing, limit: 20 });
            if (!r?.success) {
                alert(r?.error || "Batch SEO fix failed");
            } else {
                setResult(r);
                router.refresh();
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex items-center gap-3">
            {result && (
                <span className="text-xs font-bold text-slate-600">
                    Processed {result.processed} · Failed {result.failed}
                </span>
            )}
            <button
                type="button"
                onClick={() => handleBatch(true)}
                disabled={busy}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50"
            >
                <span className={`material-symbols-outlined text-base ${busy ? "animate-spin" : ""}`}>
                    {busy ? "sync" : "auto_fix_high"}
                </span>
                {busy ? "Fixing..." : "Auto-Fix Missing SEO"}
            </button>
        </div>
    );
}
