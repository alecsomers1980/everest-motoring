"use client";

import { useState, useRef, useEffect } from "react";
import { startTestHandoverVideo, pollTestHandoverVideo } from "../inventory/handover_test_actions";

const STYLES = [
    { key: "pixel_build", label: "Pixel Build (with people)", hint: "Car assembles next to the person in the photo" },
    { key: "pixel_build_car_only", label: "Pixel Build (car only)", hint: "Car-only build, no people added — for the car's main image" },
    { key: "dream_drive", label: "Dream Drive Transition", hint: "Showroom morphs into a coastal sunset" },
    { key: "reveal", label: "Time-Lapse Reveal", hint: "Silk cover pulls away, sun sets, city lights bloom" },
    { key: "hero_orbit", label: "Stylized Hero Walkaround", hint: "3D drone orbit with cinematic grade" },
];

export default function HandoverTestPage() {
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState("");
    const [videoUrl, setVideoUrl] = useState(null);
    const pollRef = useRef(null);
    const metaRef = useRef({ name: "friend", carLabel: "vehicle" });

    useEffect(() => () => clearInterval(pollRef.current), []);

    async function handleSubmit(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        metaRef.current = {
            name: fd.get("buyer_name") || "friend",
            carLabel: fd.get("car_label") || "vehicle",
        };
        setBusy(true);
        setVideoUrl(null);
        setStatus("Uploading photo & queuing generation…");
        try {
            const res = await startTestHandoverVideo(fd);
            if (!res?.success) { setStatus(""); setBusy(false); alert(res?.error || "Failed."); return; }
            setStatus("Generating clip… ~1–3 min, then adding the voiceover. Polling…");
            pollRef.current = setInterval(async () => {
                const p = await pollTestHandoverVideo(res.taskId, metaRef.current.name, metaRef.current.carLabel);
                if (p.status === "ready") { clearInterval(pollRef.current); setVideoUrl(p.videoUrl); setStatus("Done!"); setBusy(false); }
                else if (p.status === "failed") { clearInterval(pollRef.current); setStatus("Failed: " + (p.error || "unknown")); setBusy(false); }
            }, 8000);
        } catch (err) { setStatus(""); setBusy(false); alert(err.message); }
    }

    return (
        <div className="flex-1 w-full px-6 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">Handover Video Test</h1>
                <p className="text-slate-500 mt-1 mb-5">
                    Preview the post-sale handover video on any photo — no sale record needed. Uses a
                    delivery photo (person + car) or just the car's main image. A congratulations
                    voiceover is added automatically. Each run is a real generation and costs credits.
                </p>

                <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Photo (delivery photo, or the car's main image)</label>
                        <input type="file" name="image" accept="image/png, image/jpeg, image/webp" required disabled={busy}
                            className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Style</label>
                        <select name="style" defaultValue="pixel_build" disabled={busy} className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white">
                            {STYLES.map((s) => (<option key={s.key} value={s.key}>{s.label} — {s.hint}</option>))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Buyer name (for the voiceover)</label>
                        <input type="text" name="buyer_name" placeholder="e.g. Johan" disabled={busy} className="w-full px-4 py-3 border border-slate-300 rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle (for the voiceover, optional)</label>
                        <input type="text" name="car_label" placeholder="e.g. 2022 Renault Kiger" disabled={busy} className="w-full px-4 py-3 border border-slate-300 rounded-lg" />
                    </div>
                    <button type="submit" disabled={busy} className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-300 text-black font-bold rounded-lg w-full">
                        {busy ? "Working…" : "Generate Test Video"}
                    </button>
                </form>

                {status && (
                    <div className="mt-4 text-sm font-medium text-slate-600 flex items-center gap-2">
                        {busy && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
                        {status}
                    </div>
                )}

                {videoUrl && (
                    <div className="mt-6">
                        <video src={videoUrl} controls autoPlay loop className="w-full rounded-xl border border-slate-200" />
                        <a href={videoUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-ink font-bold underline mt-2 inline-block">Open / download</a>
                    </div>
                )}
            </div>
        </div>
    );
}
