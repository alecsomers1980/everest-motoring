"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { addOffInventorySale, addDeliveryPhotoToSale, setSaleSkipSocial } from "../inventory/sale_actions";
import SaleVideoPicker from "../inventory/SaleVideoPicker";

// Upload an image straight to Supabase storage from the browser so large photos
// don't hit the server-action / platform request-body limit. Returns the public
// URL (or null when no file was chosen).
async function uploadImage(supabase, bucket, file) {
    if (!file || file.size === 0) return null;
    const ext = (file.name?.split(".").pop() || "jpg").toLowerCase();
    const fileName = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { contentType: file.type || "image/jpeg" });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
}

function vehicleLabel(sale) {
    return [sale.vehicle_year, sale.vehicle_make, sale.vehicle_model].filter(Boolean).join(" ") || "Vehicle";
}

export default function OfflineSalesManager({ initialSales }) {
    const [addOpen, setAddOpen] = useState(false);
    const [manage, setManage] = useState(null); // the sale being managed

    return (
        <>
            <div className="flex justify-end mb-6">
                <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="bg-primary hover:bg-primary-dark transition-all px-6 py-3 rounded-xl font-black text-black shadow-lg shadow-primary/20 flex items-center gap-2 active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Add Sold Vehicle
                </button>
            </div>

            {initialSales.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    No off-inventory sales recorded yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {initialSales.map((sale) => (
                        <div
                            key={sale.id}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4"
                        >
                            <div className="w-20 h-14 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                                {sale.vehicle_image_url ? (
                                    <img src={sale.vehicle_image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-slate-400">directions_car</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-900 truncate">{vehicleLabel(sale)}</p>
                                <p className="text-sm text-slate-500 truncate">
                                    {sale.buyer_name}
                                    {sale.buyer_email ? ` • ${sale.buyer_email}` : ""}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                        Sold {new Date(sale.sold_at).toLocaleDateString()}
                                    </span>
                                    {sale.review_email_sent_at ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-green-100 text-green-700">Email sent</span>
                                    ) : sale.review_email_scheduled_for ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">Email scheduled</span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">No email</span>
                                    )}
                                    {sale.skip_social && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-700">No social</span>
                                    )}
                                    {sale.sale_video_status === "ready" && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">Video ready</span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setManage(sale)}
                                className="px-5 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 flex-shrink-0"
                            >
                                Manage
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {addOpen && <AddSaleModal onClose={() => setAddOpen(false)} />}
            {manage && <ManageSaleModal sale={manage} onClose={() => setManage(null)} />}
        </>
    );
}

function AddSaleModal({ onClose }) {
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData(e.target);
            const vehicleFile = fd.get("vehicle_image");
            const deliveryFile = fd.get("delivery_photo");
            // Upload images client-side, then send only their URLs to the action.
            fd.delete("vehicle_image");
            fd.delete("delivery_photo");

            const supabase = createClient();
            const [vehicleImageUrl, deliveryPhotoUrl] = await Promise.all([
                uploadImage(supabase, "vehicles", vehicleFile),
                uploadImage(supabase, "delivery-photos", deliveryFile),
            ]);
            if (vehicleImageUrl) fd.set("vehicle_image_url", vehicleImageUrl);
            if (deliveryPhotoUrl) fd.set("delivery_photo_url", deliveryPhotoUrl);

            const result = await addOffInventorySale(fd);
            if (result?.error) {
                alert(result.error);
            } else {
                window.location.reload();
            }
        } catch (err) {
            alert(`Failed to record sale: ${err?.message || err}`);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Add Sold Vehicle</h2>
                        <p className="text-sm text-slate-500">Not in inventory</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Vehicle */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
                            <input type="number" name="vehicle_year" min="1950" max="2100" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        </div>
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Make *</label>
                            <input type="text" name="vehicle_make" required className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Model *</label>
                            <input type="text" name="vehicle_model" required className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Vehicle Photo</label>
                        <input type="file" name="vehicle_image" accept="image/png, image/jpeg, image/webp" className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20" />
                        <p className="text-xs text-slate-500 mt-1">Used in the review email and as the fallback image for the handover video.</p>
                    </div>

                    {/* Buyer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Buyer Name *</label>
                            <input type="text" name="buyer_name" required className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Buyer Phone</label>
                            <input type="tel" name="buyer_phone" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Buyer Email</label>
                        <input type="email" name="buyer_email" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                        <p className="text-xs text-slate-500 mt-1">If provided, a review request email is scheduled for 4 days from now.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Buyer Birthday</label>
                        <input type="date" name="buyer_birthday" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Photo</label>
                        <input type="file" name="delivery_photo" accept="image/png, image/jpeg, image/webp" className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20" />
                        <p className="text-xs text-slate-500 mt-1">Customer collecting their car. Used to build the handover video with the buyer in it.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
                        <textarea name="notes" rows="2" className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 resize-none"></textarea>
                    </div>

                    <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer">
                        <input type="checkbox" name="skip_social" className="mt-1 h-4 w-4" />
                        <span>
                            <span className="block text-sm font-bold text-slate-700">Don&apos;t post to Facebook / Instagram</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                                Skip the &ldquo;Just Sold&rdquo; celebration post. The review email won&apos;t mention
                                Facebook, but the customer still gets their downloadable video.
                            </span>
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold rounded-lg">
                            {submitting ? "Saving..." : "Record Sale"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ManageSaleModal({ sale: initialSale, onClose }) {
    const [sale, setSale] = useState(initialSale);
    const [photoUploading, setPhotoUploading] = useState(false);

    async function handlePhotoUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        setPhotoUploading(true);
        try {
            const supabase = createClient();
            const url = await uploadImage(supabase, "delivery-photos", file);
            const fd = new FormData();
            fd.set("sale_id", sale.id);
            fd.set("delivery_photo_url", url);
            const res = await addDeliveryPhotoToSale(fd);
            if (res?.error) {
                alert(res.error);
            } else {
                setSale((s) => ({ ...s, delivery_photo_url: res.url }));
            }
        } catch (err) {
            alert("Upload failed: " + (err?.message || err));
        } finally {
            setPhotoUploading(false);
        }
    }

    async function handleToggleSkipSocial(checked) {
        const previous = sale.skip_social;
        setSale((s) => ({ ...s, skip_social: checked }));
        const res = await setSaleSkipSocial(sale.id, checked);
        if (res?.error) {
            setSale((s) => ({ ...s, skip_social: previous }));
            alert(res.error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{vehicleLabel(sale)}</h2>
                        <p className="text-sm text-slate-500">{sale.buyer_name}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
                        <div><strong>Sold on:</strong> {new Date(sale.sold_at).toLocaleDateString()}</div>
                        {sale.review_email_sent_at ? (
                            <div><strong>Review email sent:</strong> {new Date(sale.review_email_sent_at).toLocaleDateString()}</div>
                        ) : sale.review_email_scheduled_for ? (
                            <div><strong>Review email scheduled for:</strong> {new Date(sale.review_email_scheduled_for).toLocaleString()}</div>
                        ) : (
                            <div className="text-amber-700">No review email scheduled (no buyer email captured).</div>
                        )}
                    </div>
                    <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!sale.skip_social}
                            onChange={(e) => handleToggleSkipSocial(e.target.checked)}
                            className="mt-1 h-4 w-4"
                        />
                        <span>
                            <span className="block text-sm font-bold text-slate-700">Don&apos;t post to Facebook / Instagram</span>
                            <span className="block text-xs text-slate-500 mt-0.5">
                                Skips the &ldquo;Just Sold&rdquo; celebration post. Set this before the video finishes (~2 min) to reliably stop it.
                            </span>
                        </span>
                    </label>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Photo</label>
                        {sale.delivery_photo_url ? (
                            <img src={sale.delivery_photo_url} alt="Delivery" className="rounded-lg max-h-64 border border-slate-200" />
                        ) : (
                            <div className="space-y-2">
                                <p className="text-sm text-slate-500 italic">No photo on file. Upload one to build a handover video that includes the buyer.</p>
                                <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/webp"
                                    disabled={photoUploading}
                                    onChange={handlePhotoUpload}
                                    className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 disabled:opacity-60"
                                />
                                {photoUploading && <p className="text-xs text-slate-500">Uploading…</p>}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Handover Video</label>
                        <SaleVideoPicker sale={sale} onUpdated={(patch) => setSale((s) => ({ ...s, ...patch }))} />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200">
                        <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
