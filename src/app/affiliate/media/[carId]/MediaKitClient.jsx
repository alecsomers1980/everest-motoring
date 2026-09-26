"use client";

import { useState } from "react";

export default function MediaKitClient({ car, affiliateCode, videoIframeUrl, siteUrl }) {
    const [copied, setCopied] = useState(false);
    const [videoState, setVideoState] = useState("idle"); // idle | loading | ready | error
    const [videoUrl, setVideoUrl] = useState(null);
    const [videoError, setVideoError] = useState(null);

    const trackingLink = `${siteUrl}/inventory/${car.id}?ref=${affiliateCode}`;
    const flyerImageUrl = `/api/affiliate/flyer/${car.id}?ref=${affiliateCode}`;
    const vehicleTitle = `${car.year} ${car.make} ${car.model}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(trackingLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrepareVideo = async () => {
        setVideoState("loading");
        setVideoError(null);
        try {
            const res = await fetch(`/api/affiliate/video-download/${car.id}`);
            const data = await res.json();
            if (data.ready) {
                setVideoUrl(data.url);
                setVideoState("ready");
            } else {
                setVideoError(data.error || "Video not ready yet");
                setVideoState("error");
            }
        } catch (err) {
            setVideoError(err.message);
            setVideoState("error");
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto px-4 lg:px-8 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">{vehicleTitle} — Media Kit</h1>
                <p className="text-slate-500 mt-1">Everything you need to promote this vehicle and earn commission.</p>
            </div>

            {/* Tracking Link + How It Works */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h2 className="font-bold text-slate-800 mb-2">Your Tracking Link</h2>
                <p className="text-sm text-slate-500 mb-4">
                    Share this link via WhatsApp, social media, or email. When someone buys this
                    vehicle after clicking it, you earn commission — automatically tracked to
                    your affiliate code <strong>{affiliateCode}</strong>.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-mono text-sm text-slate-800 break-all">
                        {trackingLink}
                    </div>
                    <button
                        onClick={handleCopy}
                        className={`shrink-0 px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${
                            copied
                                ? "bg-green-500 text-white"
                                : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                    >
                        {copied ? "Copied!" : "Copy Link"}
                    </button>
                </div>
            </div>

            {/* Video */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
                <h2 className="font-bold text-slate-800 mb-2">Vehicle Video</h2>
                {videoIframeUrl ? (
                    <>
                        <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 mb-4">
                            <iframe
                                src={videoIframeUrl}
                                className="w-full h-full"
                                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        {videoState === "ready" ? (
                            <a
                                href={videoUrl}
                                download
                                className="inline-block px-6 py-3 rounded-lg font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-all"
                            >
                                Download MP4
                            </a>
                        ) : (
                            <button
                                onClick={handlePrepareVideo}
                                disabled={videoState === "loading"}
                                className="px-6 py-3 rounded-lg font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-all disabled:opacity-50"
                            >
                                {videoState === "loading" ? "Preparing download… (up to a minute)" : "Prepare Video Download"}
                            </button>
                        )}
                        {videoState === "error" && (
                            <p className="text-sm text-red-600 mt-2">{videoError}</p>
                        )}
                    </>
                ) : (
                    <p className="text-sm text-slate-500">Video not available for this vehicle yet.</p>
                )}
            </div>

            {/* Affiliate Flyer (A4) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="font-bold text-slate-800 mb-2">Affiliate Flyer (A4)</h2>
                <p className="text-sm text-slate-500 mb-4">
                    A printable, full-page flyer with the vehicle, full specs, premium features,
                    and a scannable QR code linked to your tracking code — great for print or as a
                    detailed PDF-style share.
                </p>
                <img
                    src={flyerImageUrl}
                    alt={`${vehicleTitle} flyer`}
                    className="w-full max-w-xs rounded-lg border border-slate-200 mb-4"
                />
                <a
                    href={flyerImageUrl}
                    download={`${vehicleTitle.replace(/\s+/g, "-")}-Flyer.png`}
                    className="inline-block px-6 py-3 rounded-lg font-bold text-sm bg-amber-500 text-white hover:bg-amber-600 text-center transition-all"
                >
                    Download Flyer
                </a>
            </div>
        </div>
    );
}
