"use client";

import { useState, useEffect } from "react";
import {
    CirclePlay, ChevronDown, RefreshCw, Volume2,
    Clapperboard, TriangleAlert, Loader2, Pencil,
} from "lucide-react";
import { checkHeyGenVideoStatus, queueAiWalkaround, requestSceneRegenerationAction, requestAudioRedoAction, getSceneVoiceoversAction, updateSceneVoiceoversAction } from "./ai_actions";
import { estimateSpokenMs, CLIP_DURATION_MS } from "@/utils/ai/voiceoverDuration";

export default function AiVideoStatus({ carId, videoUrl }) {
    const [isChecking, setIsChecking] = useState(false);
    const [statusText, setStatusText] = useState("Checking...");
    const [isActive, setIsActive] = useState(false);
    const [isError, setIsError] = useState(false);
    const [selectedScenes, setSelectedScenes] = useState([]);
    const [panelOpen, setPanelOpen] = useState(false);
    const [voOpen, setVoOpen] = useState(false);
    const [voScenes, setVoScenes] = useState(null);
    const [voDrafts, setVoDrafts] = useState({});
    const [voLoading, setVoLoading] = useState(false);
    const [voError, setVoError] = useState("");

    // Initial load logic to determine what phase we are in
    useEffect(() => {
        if (!videoUrl) {
            setIsActive(false);
            setIsError(false);
            return;
        }

        if (videoUrl.startsWith('mux:') || videoUrl.startsWith('cf:')) {
            setIsActive(false);
            setIsError(false);
            return;
        }

        if (videoUrl.startsWith('error:')) {
            setIsActive(false);
            setIsError(true);
            return;
        }

        if (videoUrl.startsWith('ai_') || videoUrl === 'mux_ingesting' || videoUrl === 'cf_ingesting') {
            setIsActive(true);
            setIsError(false);
            setStatusText('Rendering...');
        }
    }, [videoUrl]);

    const handleRetry = async () => {
        setIsChecking(true);
        setStatusText("Retrying...");
        try {
            await queueAiWalkaround(carId);
            window.location.reload();
        } catch (error) {
            alert("Failed to retry: " + error.message);
            setIsChecking(false);
        }
    };

    const handleGenerate = async () => {
        if (!window.confirm("Generate the AI walkaround video for this vehicle?\n\nThe render runs in the background — you can close this tab and come back later. A Vercel cron job advances the pipeline one step per minute (4 × 8-second clips, then stitch + Cloudflare ingest); full successful renders take ~10–15 minutes and cost roughly $5.60 (Seedance 2 + ElevenLabs voiceover). If a step fails the pipeline aborts immediately, capping the cost at the per-scene spend.")) return;
        setIsChecking(true);
        try {
            await queueAiWalkaround(carId);
            window.location.reload();
        } catch (error) {
            alert("Failed to queue generation: " + error.message);
            setIsChecking(false);
        }
    };

    const handleRegenerate = async () => {
        if (!window.confirm("Regenerate the AI walkaround video for this vehicle?\n\nThe render runs in the background — you can close this tab and come back later. A Vercel cron job advances the pipeline one step per minute (4 × 8-second clips, then stitch + Cloudflare ingest); full successful renders take ~10–15 minutes and cost roughly $5.60 (Seedance 2 Fast 720p + ElevenLabs voiceover). If a step fails the pipeline aborts immediately, capping the cost at the per-scene spend.\n\nThe current video will be replaced once the new one finishes.")) return;
        setIsChecking(true);
        try {
            await queueAiWalkaround(carId);
            window.location.reload();
        } catch (error) {
            alert("Failed to queue regeneration: " + error.message);
            setIsChecking(false);
        }
    };

    // Lazily pull the four spoken lines the first time the editor is opened —
    // no point fetching pipeline state for every row on the page.
    const toggleVoiceoverEditor = async () => {
        if (voOpen) { setVoOpen(false); return; }
        setVoOpen(true);
        if (voScenes) return;
        setVoLoading(true);
        setVoError("");
        try {
            const res = await getSceneVoiceoversAction(carId);
            if (!res || !res.success) {
                setVoError((res && res.error) || "Could not load this video's script.");
                return;
            }
            setVoScenes(res.scenes);
            setVoDrafts(Object.fromEntries(res.scenes.map((s) => [s.scene, s.text])));
        } catch (error) {
            setVoError(error.message);
        } finally {
            setVoLoading(false);
        }
    };

    const handleSaveVoiceovers = async () => {
        const edits = {};
        for (const s of voScenes || []) {
            const draft = (voDrafts[s.scene] || "").trim();
            if (draft && draft !== s.text.trim()) edits[s.scene] = draft;
        }
        const list = Object.keys(edits);
        if (list.length === 0) {
            setVoError("Nothing changed yet — edit a line first.");
            return;
        }
        if (!window.confirm(`Save the new wording for scene${list.length > 1 ? "s" : ""} ${list.join(", ")} and redo the voiceover?\n\nThis re-voices the existing video clips — NO video re-render, so it costs no video credits (just the voiceover, a re-stitch and a re-ingest). The current video stays live until it finishes.\n\nProceed?`)) return;
        setIsChecking(true);
        setVoError("");
        try {
            const res = await updateSceneVoiceoversAction(carId, edits);
            if (!res || !res.success) {
                setVoError((res && res.error) || "Save failed.");
                setIsChecking(false);
                return;
            }
            window.location.reload();
        } catch (error) {
            setVoError(error.message);
            setIsChecking(false);
        }
    };

    const toggleScene = (n) => {
        setSelectedScenes((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b));
    };

    const handleRedoSelectedScenes = async () => {
        if (selectedScenes.length === 0) return;
        const list = selectedScenes.join(", ");
        const approxCost = (selectedScenes.length * 1.55).toFixed(2);
        if (!window.confirm(`Regenerate scenes ${list}?\n\nApprox cost: $${approxCost} ( ~$1.55 per scene — Seedance 8s + ElevenLabs + mux, plus one re-stitch and re-ingest ). The current video stays live until the redo finishes, then is replaced automatically.\n\nProceed?`)) return;
        setIsChecking(true);
        try {
            const res = await requestSceneRegenerationAction(carId, selectedScenes);
            if (!res || !res.success) {
                alert("Failed to queue scene redo: " + ((res && res.error) || "Unknown error"));
                setIsChecking(false);
                return;
            }
            window.location.reload();
        } catch (error) {
            alert("Failed to queue scene redo: " + error.message);
            setIsChecking(false);
        }
    };

    const handleRedoAudioScenes = async () => {
        if (selectedScenes.length === 0) return;
        const list = selectedScenes.join(", ");
        if (!window.confirm(`Redo ONLY the voiceover for scenes ${list}?\n\nThis re-voices the existing video clips — NO video re-render, so it costs no video credits (just the voiceover + a re-stitch). Use this for audio glitches like babble or a clipped word.\n\nThe current video stays live until the redo finishes, then is replaced automatically.\n\nProceed?`)) return;
        setIsChecking(true);
        try {
            const res = await requestAudioRedoAction(carId, selectedScenes);
            if (!res || !res.success) {
                alert("Failed to queue audio redo: " + ((res && res.error) || "Unknown error"));
                setIsChecking(false);
                return;
            }
            window.location.reload();
        } catch (error) {
            alert("Failed to queue audio redo: " + error.message);
            setIsChecking(false);
        }
    };

    // If it's already safely hosted (Mux or Cloudflare):
    // The regeneration controls used to sit open on every row, which made each
    // row several hundred pixels tall. They now live behind a disclosure so the
    // resting state is a single status chip.
    if (videoUrl && (videoUrl.startsWith('mux:') || videoUrl.startsWith('cf:'))) {
        return (
            <div className="flex flex-col items-start gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-md text-label font-semibold uppercase">
                    <CirclePlay className="h-3.5 w-3.5" />
                    Video live
                </span>

                <button
                    type="button"
                    onClick={() => setPanelOpen((v) => !v)}
                    aria-expanded={panelOpen}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${panelOpen ? "rotate-180" : ""}`} />
                    {panelOpen ? "Hide options" : "Video options"}
                </button>

                {panelOpen && (
                    <div className="mt-1 w-full min-w-[210px] rounded-lg border border-hairline bg-slate-50 p-3 space-y-3">
                        <button
                            onClick={handleRegenerate}
                            disabled={isChecking}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 transition-colors disabled:opacity-50"
                            title="Regenerate the walkaround video using the latest prompts"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                            {isChecking ? "Queuing..." : "Regenerate all"}
                        </button>

                        <div>
                            <p className="text-label font-semibold uppercase text-slate-400 mb-1.5">Redo scenes</p>
                            <div className="flex gap-1.5">
                                {[1, 2, 3, 4].map((n) => {
                                    const on = selectedScenes.includes(n);
                                    return (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => toggleScene(n)}
                                            disabled={isChecking}
                                            aria-pressed={on}
                                            className={`h-7 w-7 rounded-md border text-xs font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 ${on
                                                ? "bg-slate-900 text-white border-slate-900"
                                                : "bg-white text-slate-600 border-hairline hover:border-slate-400"}`}
                                            title={`Toggle scene ${n}`}
                                        >
                                            {n}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <button
                                onClick={handleRedoSelectedScenes}
                                disabled={isChecking || selectedScenes.length === 0}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={selectedScenes.length === 0 ? "Select one or more scenes first" : `Regenerate scenes ${selectedScenes.join(", ")} (video + audio)`}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Redo video
                            </button>
                            <button
                                onClick={handleRedoAudioScenes}
                                disabled={isChecking || selectedScenes.length === 0}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={selectedScenes.length === 0 ? "Select one or more scenes first" : `Redo voiceover only for scenes ${selectedScenes.join(", ")} — re-speaks the SAME words, no video credits`}
                            >
                                <Volume2 className="h-3.5 w-3.5" />
                                Redo audio (free)
                            </button>
                        </div>

                        <div className="border-t border-hairline pt-2.5">
                            <button
                                type="button"
                                onClick={toggleVoiceoverEditor}
                                aria-expanded={voOpen}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                                title="Change the words the voice says, then redo just that scene's audio"
                            >
                                <Pencil className="h-3.5 w-3.5" />
                                {voOpen ? "Hide voiceover text" : "Edit voiceover text"}
                            </button>

                            {voOpen && (
                                <div className="mt-2 space-y-2.5">
                                    {voLoading && (
                                        <p className="text-xs text-slate-500">Loading script…</p>
                                    )}
                                    {voError && (
                                        <p className="text-xs text-red-600 leading-snug">{voError}</p>
                                    )}
                                    {voScenes && voScenes.map((s) => {
                                        const draft = voDrafts[s.scene] ?? "";
                                        const ms = estimateSpokenMs(draft);
                                        const over = ms > CLIP_DURATION_MS;
                                        const dirty = draft.trim() !== s.text.trim();
                                        return (
                                            <div key={s.scene}>
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <span className="text-label font-semibold uppercase text-slate-400">
                                                        Scene {s.scene}{dirty ? " •" : ""}
                                                    </span>
                                                    <span className={`text-[11px] tabular-nums ${over ? "text-red-600 font-semibold" : "text-slate-400"}`}>
                                                        ~{(ms / 1000).toFixed(1)}s / {CLIP_DURATION_MS / 1000}s
                                                    </span>
                                                </div>
                                                <textarea
                                                    value={draft}
                                                    onChange={(e) => setVoDrafts((prev) => ({ ...prev, [s.scene]: e.target.value }))}
                                                    disabled={isChecking || !s.canRedoAudio}
                                                    rows={2}
                                                    className={`mt-1 w-full rounded-md border bg-white px-2 py-1.5 text-xs leading-snug text-slate-700 resize-y focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 ${over ? "border-red-300" : "border-hairline"}`}
                                                />
                                                {over && (
                                                    <p className="mt-1 text-[11px] text-red-600 leading-snug">
                                                        Too long for the {CLIP_DURATION_MS / 1000}s clip — it will be cut off. Shorten it, and avoid spec codes like &quot;2.0TDi&quot; or &quot;DSG&quot; (the voice spells those out letter by letter).
                                                    </p>
                                                )}
                                                {!s.canRedoAudio && (
                                                    <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                                                        No saved silent clip for this scene, so its audio can&apos;t be redone on its own. Use &quot;Redo video&quot; on it once first.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {voScenes && (
                                        <button
                                            onClick={handleSaveVoiceovers}
                                            disabled={isChecking}
                                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                            title="Save the edited lines and re-voice only the scenes you changed"
                                        >
                                            <Volume2 className="h-3.5 w-3.5" />
                                            {isChecking ? "Saving..." : "Save & redo audio (free)"}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-start gap-1.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-label font-semibold uppercase">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    Video failed
                </span>
                <p className="text-xs text-slate-500 max-w-[210px] leading-snug">
                    {videoUrl.replace('error: ', '')}
                </p>
                <button
                    onClick={handleRetry}
                    disabled={isChecking}
                    className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                    {isChecking ? "Queuing..." : "Retry"}
                </button>
            </div>
        );
    }

    // No video yet (never generated) — offer to kick off the AI walkaround.
    if (!videoUrl) {
        return (
            <button
                onClick={handleGenerate}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
                title="Generate the AI walkaround video for this vehicle"
            >
                <Clapperboard className="h-3.5 w-3.5" />
                {isChecking ? "Queuing..." : "Generate video"}
            </button>
        );
    }

    if (!isActive) return null;

    const handleCheckStatus = async () => {
        setIsChecking(true);
        setStatusText("Polling Server...");
        try {
            const result = await checkHeyGenVideoStatus(carId);

            if (result.status === 'ready') {
                setStatusText("Complete! Refreshing...");
                setTimeout(() => window.location.reload(), 1500);
            } else if (result.status === 'processing') {
                // Refresh page to get latest DB string state
                window.location.reload();
            } else {
                setStatusText("Generation failed: " + (result.error || "Unknown Error"));
            }
        } catch (error) {
            setStatusText("Error checking status: " + error.message);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-label font-semibold uppercase">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Rendering
            </span>
            <button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
                title="Takes around 3 minutes. Click to refresh the status."
            >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                {statusText}
            </button>
        </div>
    );
}
