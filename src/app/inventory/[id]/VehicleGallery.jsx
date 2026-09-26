"use client";

import { useState } from "react";
import Image from "next/image";
import MuxPlayer from "@mux/mux-player-react";
import { altForImage } from "@/utils/ai/seoGenerator";
import Icon from "@/components/Icon";

export default function VehicleGallery({ car }) {
    const allImages = [];
    if (car.main_image_url) allImages.push(car.main_image_url);
    if (car.gallery_urls && car.gallery_urls.length > 0) {
        allImages.push(...car.gallery_urls);
    }

    const hasValidVideo = car.video_url && !car.video_url.startsWith('heygen_pending:') && car.video_url !== 'ai_processing';

    // Start with video if available, otherwise the first image
    const [activeMedia, setActiveMedia] = useState(hasValidVideo ? 'video' : (allImages.length > 0 ? 0 : null));

    return (
        <div>
            {/* Top Gallery / Main Video Hero */}
            <div className="relative h-[440px] md:h-[680px] bg-black overflow-hidden">
                {activeMedia === 'video' ? (
                    car.video_url.startsWith('cf:') ? (
                        <iframe
                            src={`https://${process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN}/${car.video_url.split(':')[1]}/iframe?autoplay=true`}
                            className="w-full h-full"
                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                            allowFullScreen
                        />
                    ) : car.video_url.startsWith('mux:') ? (
                        <MuxPlayer
                            streamType="on-demand"
                            playbackId={car.video_url.split(':')[1]}
                            metadata={{
                                video_id: car.video_url.split(':')[1],
                                video_title: `${car.year} ${car.make} ${car.model} AI Walkaround`
                            }}
                            autoPlay
                            volume={0.66}
                            style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <video
                            src={car.video_url}
                            className="w-full h-full object-cover"
                            autoPlay
                            loop
                            controls
                            onCanPlay={(e) => { e.target.volume = 0.66; }}
                        />
                    )
                ) : activeMedia !== null && allImages[activeMedia] ? (
                    <Image
                        src={allImages[activeMedia]}
                        alt={altForImage(car, allImages[activeMedia], activeMedia, allImages.length)}
                        fill
                        priority
                        fetchPriority="high"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px"
                        className="object-cover"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-700">
                        <Icon name="directions_car" className="text-6xl" />
                    </div>
                )}
            </div>

            {/* Thumbnails. Buttons, not divs — these were previously unreachable by
                keyboard. Selection is a single yellow underline rather than a
                border + ring + scale bounce. */}
            {((allImages.length > 0) || hasValidVideo) && (
                <div
                    role="tablist"
                    aria-label="Vehicle media"
                    className="flex overflow-x-auto gap-3 px-6 py-5 bg-white border-b border-hairline snap-x"
                >
                    {hasValidVideo && (
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeMedia === 'video'}
                            onClick={() => setActiveMedia('video')}
                            className={`group relative w-32 h-20 md:w-36 md:h-24 flex-shrink-0 snap-start overflow-hidden rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${activeMedia === 'video' ? 'border-slate-900' : 'border-hairline hover:border-slate-400'}`}
                        >
                            <span className="absolute inset-0 bg-slate-900 flex items-center justify-center flex-col gap-1.5">
                                <Icon name="play_circle" className="text-2xl text-white" />
                                <span className="text-white text-label font-semibold uppercase">Video</span>
                            </span>
                            {activeMedia === 'video' && (
                                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                            )}
                        </button>
                    )}

                    {allImages.map((url, idx) => (
                        <button
                            key={idx}
                            type="button"
                            role="tab"
                            aria-selected={activeMedia === idx}
                            aria-label={`View image ${idx + 1} of ${allImages.length}`}
                            onClick={() => setActiveMedia(idx)}
                            className={`relative w-32 h-20 md:w-36 md:h-24 flex-shrink-0 snap-start overflow-hidden rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${activeMedia === idx ? 'border-slate-900' : 'border-hairline hover:border-slate-400'}`}
                        >
                            <Image
                                src={url}
                                alt={altForImage(car, url, idx, allImages.length)}
                                fill
                                sizes="(max-width: 768px) 128px, 144px"
                                loading="lazy"
                                className="object-cover"
                            />
                            {activeMedia === idx && (
                                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
