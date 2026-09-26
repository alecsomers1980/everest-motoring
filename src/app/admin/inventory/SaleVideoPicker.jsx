"use client";

import { useEffect, useRef, useState } from "react";
import { startSaleVideo, pollSaleVideo } from "./sale_actions";
import { SEEDANCE_STYLES } from "@/utils/ai/seedanceService";

const POLL_INTERVAL_MS = 8000;

export default function SaleVideoPicker({ sale, onUpdated }) {
    // "finalizing" (cron muxing the voiceover) is shown as in-progress so a
    // reopened dialog keeps polling instead of offering to generate again.
    const [status, setStatus] = useState(
        sale?.sale_video_status === "finalizing" ? "generating" : (sale?.sale_video_status || "none")
    );
    const [videoUrl, setVideoUrl] = useState(sale?.sale_video_url || null);
    const [selectedStyle, setSelectedStyle] = useState(sale?.sale_video_style || null);
    const [previousStyle, setPreviousStyle] = useState(null);
    const [error, setError] = useState(null);
    const [starting, setStarting] = useState(false);
    const [revealFromCover, setRevealFromCover] = useState(false);
    const pollRef = useRef(null);

    useEffect(() => {
        if (status !== "generating" || !sale?.id) return;

        const tick = async () => {
            try {
                const res = await pollSaleVideo(sale.id);
                if (res.status === "ready") {
                    setStatus("ready");
                    setVideoUrl(res.videoUrl);
                    if (onUpdated) onUpdated({ sale_video_status: "ready", sale_video_url: res.videoUrl });
                } else if (res.status === "failed") {
                    setStatus("failed");
                    setError(res.error || "Generation failed");
                }
            } catch (err) {
                console.warn("pollSaleVideo failed:", err);
            }
        };

        tick();
        pollRef.current = setInterval(tick, POLL_INTERVAL_MS);
        return () => clearInterval(pollRef.current);
    }, [status, sale?.id, onUpdated]);

    async function handleStart(styleKey) {
        setError(null);
        setStarting(true);
        setSelectedStyle(styleKey);
        setStatus("generating");
        try {
            const res = await startSaleVideo(sale.id, styleKey, { revealFromCover });
            if (res.error) {
                setError(res.error);
                setStatus("failed");
            } else if (res.ready && res.videoUrl) {
                // Congratulations-card path completes synchronously.
                setVideoUrl(res.videoUrl);
                setStatus("ready");
                if (onUpdated) onUpdated({ sale_video_status: "ready", sale_video_url: res.videoUrl });
            } else {
                setStatus("generating");
            }
        } catch (err) {
            setError(err.message || "Failed to start generation.");
            setStatus("failed");
        } finally {
            setStarting(false);
        }
    }

    if (status === "ready" && videoUrl) {
        return (
            <div className="space-y-3">
                <video src={videoUrl} controls className="w-full max-h-96 rounded-xl border border-slate-200" />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Download
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            setPreviousStyle(selectedStyle);
                            setStatus("none");
                            setVideoUrl(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
                    >
                        <span className="material-symbols-outlined text-base">refresh</span>
                        Regenerate
                    </button>
                    <span className="text-xs text-slate-500">
                        Video will be embedded in the scheduled review email automatically.
                    </span>
                </div>
            </div>
        );
    }

    if (status === "generating") {
        const styleLabel = SEEDANCE_STYLES.find((s) => s.key === selectedStyle)?.label || "Video";
        return (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                <span className="material-symbols-outlined animate-spin text-primary-ink">sync</span>
                <div className="text-sm">
                    <div className="font-bold text-slate-800">Generating {styleLabel}…</div>
                    <div className="text-slate-600">Seedance 2 typically takes 1–3 minutes. You can close this dialog — we'll keep generating in the background.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                </div>
            )}
            {sale?.delivery_photo_url ? (
                <div className="rounded-xl border-2 border-slate-200 p-4">
                    <div className="font-bold text-slate-900 mb-1">Pixel Build</div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Handover video</div>
                    <div className="text-sm text-slate-600 mb-4">
                        The car assembles itself from glowing voxels right next to the buyer — on the
                        exact background of the delivery photo — with everyone smiling at camera as it
                        completes.
                    </div>
                    {sale?.car_id && (
                        <label className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={revealFromCover}
                                onChange={(e) => setRevealFromCover(e.target.checked)}
                                className="mt-0.5 h-4 w-4"
                            />
                            <span>
                                <span className="block text-sm font-bold text-slate-700">Photo shows the car under a cover</span>
                                <span className="block text-xs text-slate-500 mt-0.5">
                                    Reveal the real car from the vehicle&apos;s main inventory photo instead of letting the AI guess what&apos;s under the cover.
                                </span>
                            </span>
                        </label>
                    )}
                    <button
                        type="button"
                        disabled={starting}
                        onClick={() => handleStart("pixel_build")}
                        className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-wait"
                    >
                        {starting ? "Starting…" : previousStyle ? "Regenerate Handover Video" : "Generate Handover Video"}
                    </button>
                    <p className="text-xs text-slate-500 mt-3">8-second 16:9 clip from the delivery photo (Seedance 2 Fast).</p>
                </div>
            ) : (
                <div className="rounded-xl border-2 border-slate-200 p-4">
                    <div className="font-bold text-slate-900 mb-1">Pixel Build (from car image)</div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">No delivery photo</div>
                    <div className="text-sm text-slate-600 mb-4">
                        No delivery photo on file, so we'll use the vehicle's main image for the Pixel
                        Build animation, with a congratulations voiceover for{" "}
                        {sale?.buyer_name || "the buyer"}.
                    </div>
                    <button
                        type="button"
                        disabled={starting}
                        onClick={() => handleStart("pixel_build")}
                        className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-wait"
                    >
                        {starting ? "Generating…" : previousStyle ? "Regenerate Handover Video" : "Generate Handover Video"}
                    </button>
                    <p className="text-xs text-slate-500 mt-3">Takes ~1–3 minutes. Tip: upload a delivery photo above so the car builds next to the buyer.</p>
                </div>
            )}
        </div>
    );
}
