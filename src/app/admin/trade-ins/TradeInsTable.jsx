"use client";

import React, { useState, useEffect } from "react";
import TradeInStatusSelector from "./TradeInStatusSelector";

export default function TradeInsTable({ initialRequests }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [expandedRows, setExpandedRows] = useState([]);
    // Lightbox: { images: string[], index: number } | null
    const [lightbox, setLightbox] = useState(null);

    const toggleExpand = (id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const getImages = (req) =>
        [req.image_front, req.image_back, req.image_left, req.image_right, req.image_roof, req.image_interior_front, req.image_interior_back].filter(Boolean);

    const closeLightbox = () => setLightbox(null);
    const navLightbox = (dir) =>
        setLightbox(lb => (lb ? { ...lb, index: (lb.index + dir + lb.images.length) % lb.images.length } : lb));

    useEffect(() => {
        if (!lightbox) return;
        const onKey = (e) => {
            if (e.key === "Escape") closeLightbox();
            else if (e.key === "ArrowRight") navLightbox(1);
            else if (e.key === "ArrowLeft") navLightbox(-1);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightbox]);

    // Filter logic
    const filteredRequests = initialRequests.filter(req => {
        // Text Search (Client Name, Phone, Car Make/Model, Reg Plate)
        const searchString = `${req.client_name} ${req.client_phone} ${req.year} ${req.make} ${req.model} ${req.registration_number}`.toLowerCase();
        const matchesSearch = searchString.includes(searchTerm.toLowerCase());

        // Status Filter
        const matchesStatus = statusFilter ? req.status === statusFilter : true;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8">
            {/* Search and Filters Bar */}
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 flex flex-col md:flex-row gap-4 relative z-10">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-500">search</span>
                    <input
                        type="text"
                        placeholder="Search by client name, vehicle, or registration..."
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full md:w-64">
                    <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all font-bold"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="pending_valuation">⏳ Pending Valuation</option>
                        <option value="offer_made">📧 Offer Made</option>
                        <option value="purchased">🚗 Car Purchased</option>
                        <option value="rejected">❌ Rejected</option>
                    </select>
                </div>
            </div>

            {/* Total Results */}
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Showing {filteredRequests.length} Valuation Request{filteredRequests.length !== 1 ? 's' : ''}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">
                            <th className="p-6">Client Contact</th>
                            <th className="p-6">Vehicle Details</th>
                            <th className="p-6">Offer Value</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredRequests.map((req) => (
                            <React.Fragment key={req.id}>
                                <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleExpand(req.id)}>
                                    <td className="p-6">
                                        <p className="font-black text-slate-900 text-lg flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[18px] text-primary-ink">
                                                {expandedRows.includes(req.id) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                                            </span>
                                            {req.client_name}
                                        </p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                            <span className="material-symbols-outlined text-[16px] text-primary-ink ml-6">call</span>
                                            {req.client_phone}
                                        </p>
                                    </td>

                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-400">
                                                <span className="material-symbols-outlined">directions_car</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{req.year} {req.make} {req.model}</p>
                                                <p className="text-xs text-slate-500 font-medium">{new Intl.NumberFormat('en-ZA').format(req.mileage || 0)} km • {req.condition}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="p-4 font-bold text-slate-700">
                                        {req.offer_value ? `R ${new Intl.NumberFormat('en-ZA').format(req.offer_value)}` : '-'}
                                    </td>

                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <TradeInStatusSelector requestId={req.id} currentStatus={req.status} request={req} />
                                    </td>

                                    <td className="p-4 flex flex-col items-end gap-2 text-right" onClick={(e) => e.stopPropagation()}>
                                        <a
                                            href={`https://wa.me/${req.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${req.client_name}, this is Everest Motoring reaching out regarding your trade-in request for the ${req.year} ${req.make} ${req.model}.`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors px-3 py-1.5 rounded-md font-medium text-sm flex items-center justify-center gap-1 w-full max-w-[140px]"
                                        >
                                            WhatsApp
                                        </a>
                                    </td>
                                </tr>

                                {expandedRows.includes(req.id) && (
                                    <tr className="bg-slate-50 border-t border-slate-100">
                                        <td colSpan="5" className="p-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                                                <div>
                                                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Request Details</h4>
                                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                                        <dt className="text-slate-500">Email:</dt>
                                                        <dd className="font-medium text-slate-900">{req.client_email}</dd>
                                                        
                                                        <dt className="text-slate-500">Location:</dt>
                                                        <dd className="font-medium text-slate-900">{req.client_suburb}, {req.client_province}</dd>

                                                        <dt className="text-slate-500">Mileage:</dt>
                                                        <dd className="font-medium text-slate-900">{new Intl.NumberFormat('en-ZA').format(req.mileage || 0)} km</dd>

                                                        <dt className="text-slate-500">Transmission:</dt>
                                                        <dd className="font-medium text-slate-900">{req.transmission}</dd>

                                                        <dt className="text-slate-500">Fuel Type:</dt>
                                                        <dd className="font-medium text-slate-900">{req.fuel_type}</dd>
                                                        
                                                        <dt className="text-slate-500">Category:</dt>
                                                        <dd className="font-medium text-slate-900">{req.category}</dd>
                                                    </dl>
                                                    {req.additional_notes && (
                                                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded border border-yellow-100 text-sm">
                                                            <strong>Notes:</strong> {req.additional_notes}
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Uploaded Images</h4>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {getImages(req).map((img, i) => (
                                                            <button
                                                                type="button"
                                                                key={i}
                                                                onClick={() => setLightbox({ images: getImages(req), index: i })}
                                                                className="aspect-square bg-slate-100 rounded border border-slate-200 overflow-hidden block hover:opacity-80 cursor-zoom-in"
                                                            >
                                                                <img src={img} className="w-full h-full object-cover" alt="Vehicle Part" />
                                                            </button>
                                                        ))}
                                                        {getImages(req).length === 0 && (
                                                            <span className="text-sm text-slate-400 italic">No images provided.</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}

                        {filteredRequests.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-slate-500 bg-slate-50/50">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">sell</span>
                                    <p>No trade-in valuations match your search criteria.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {lightbox && (
                <div
                    className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 select-none"
                    onClick={closeLightbox}
                >
                    <button
                        type="button"
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-4xl">close</span>
                    </button>

                    {lightbox.images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navLightbox(-1); }}
                            className="absolute left-2 md:left-6 text-white/70 hover:text-white transition-colors"
                            aria-label="Previous"
                        >
                            <span className="material-symbols-outlined text-6xl">chevron_left</span>
                        </button>
                    )}

                    <img
                        src={lightbox.images[lightbox.index]}
                        onClick={(e) => e.stopPropagation()}
                        className="max-h-[88vh] max-w-[88vw] object-contain rounded-lg shadow-2xl"
                        alt="Vehicle"
                    />

                    {lightbox.images.length > 1 && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navLightbox(1); }}
                            className="absolute right-2 md:right-6 text-white/70 hover:text-white transition-colors"
                            aria-label="Next"
                        >
                            <span className="material-symbols-outlined text-6xl">chevron_right</span>
                        </button>
                    )}

                    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/80 text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                        {lightbox.index + 1} / {lightbox.images.length}
                    </div>
                </div>
            )}
        </div>
    );
}
