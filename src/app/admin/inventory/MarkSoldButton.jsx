"use client";

import { useState, useEffect } from "react";
import { Handshake, Tag, X, Loader2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { getLeadsForCar, markCarAsSold, getSaleForCar, addDeliveryPhotoToSale, setSaleSkipSocial } from "./sale_actions";
import SaleVideoPicker from "./SaleVideoPicker";
import { trackEvent } from "@/lib/gtag";

export default function MarkSoldButton({ car }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [selectedLeadId, setSelectedLeadId] = useState("");
    const [existingSale, setExistingSale] = useState(null);
    const [form, setForm] = useState({
        buyer_name: "",
        buyer_email: "",
        buyer_phone: "",
        buyer_birthday: "",
        notes: "",
    });

    const isSold = car.status === "sold";

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const [leadsData, sale] = await Promise.all([
                    isSold ? Promise.resolve([]) : getLeadsForCar(car.id),
                    isSold ? getSaleForCar(car.id) : Promise.resolve(null),
                ]);
                if (cancelled) return;
                setLeads(leadsData || []);
                setExistingSale(sale);
                if (sale) {
                    setForm({
                        buyer_name: sale.buyer_name || "",
                        buyer_email: sale.buyer_email || "",
                        buyer_phone: sale.buyer_phone || "",
                        buyer_birthday: sale.buyer_birthday || "",
                        notes: sale.notes || "",
                    });
                }
            } catch (err) {
                console.error("MarkSoldButton load error:", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [open, car.id, isSold]);

    function handleLeadSelect(leadId) {
        setSelectedLeadId(leadId);
        if (!leadId) return;
        const lead = leads.find((l) => l.id === leadId);
        if (lead) {
            setForm((f) => ({
                ...f,
                buyer_name: lead.client_name || "",
                buyer_email: lead.client_email || "",
                buyer_phone: lead.client_phone || "",
            }));
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fd = new FormData(e.target);
            fd.set("car_id", car.id);
            if (selectedLeadId) fd.set("lead_id", selectedLeadId);
            const result = await markCarAsSold(fd);
            if (result?.error) {
                alert(result.error);
            } else {
                trackEvent("purchase", {
                    transaction_id: car.id,
                    currency: "ZAR",
                    value: Number(car.price) || 0,
                    items: [
                        {
                            item_id: car.id,
                            item_name: `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim(),
                            item_brand: car.make || undefined,
                            price: Number(car.price) || 0,
                            quantity: 1,
                        },
                    ],
                });
                setOpen(false);
                window.location.reload();
            }
        } catch (err) {
            console.error("markCarAsSold threw:", err);
            alert(`Failed to mark as sold: ${err?.message || err}`);
        } finally {
            setSubmitting(false);
        }
    }

    async function handlePhotoUpload(e) {
        const file = e.target.files?.[0];
        if (!file || !existingSale) return;
        setPhotoUploading(true);
        try {
            const fd = new FormData();
            fd.set("sale_id", existingSale.id);
            fd.set("delivery_photo", file);
            const res = await addDeliveryPhotoToSale(fd);
            if (res?.error) {
                alert(res.error);
            } else {
                setExistingSale((s) => ({ ...s, delivery_photo_url: res.url }));
            }
        } catch (err) {
            alert("Upload failed: " + (err?.message || err));
        } finally {
            setPhotoUploading(false);
        }
    }

    async function handleToggleSkipSocial(checked) {
        const previous = existingSale.skip_social;
        setExistingSale((s) => ({ ...s, skip_social: checked }));
        const res = await setSaleSkipSocial(existingSale.id, checked);
        if (res?.error) {
            setExistingSale((s) => ({ ...s, skip_social: previous }));
            alert(res.error);
        }
    }

    return (
        <>
            <IconButton
                onClick={() => setOpen(true)}
                tone={isSold ? "default" : "positive"}
                active={isSold}
                aria-label={isSold ? "View sale details" : "Mark as sold"}
                title={isSold ? "View Sale Details" : "Mark as Sold"}
            >
                {isSold ? <Handshake className="h-5 w-5" /> : <Tag className="h-5 w-5" />}
            </IconButton>

            {open && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {existingSale ? "Sale Record" : "Mark as Sold"}
                                </h2>
                                <p className="text-sm text-slate-500">
                                    {car.year} {car.make} {car.model}
                                </p>
                            </div>
                            <IconButton onClick={() => setOpen(false)} aria-label="Close">
                                <X className="h-5 w-5" />
                            </IconButton>
                        </div>

                        {loading ? (
                            <div className="p-12 text-center text-slate-500">
                                <Loader2 className="mx-auto h-7 w-7 animate-spin" />
                                <p className="mt-2 text-sm">Loading...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {existingSale && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
                                        <div>
                                            <strong>Sold on:</strong>{" "}
                                            {new Date(existingSale.sold_at).toLocaleDateString()}
                                        </div>
                                        {existingSale.review_email_sent_at ? (
                                            <div>
                                                <strong>Review email sent:</strong>{" "}
                                                {new Date(existingSale.review_email_sent_at).toLocaleDateString()}
                                            </div>
                                        ) : existingSale.review_email_scheduled_for ? (
                                            <div>
                                                <strong>Review email scheduled for:</strong>{" "}
                                                {new Date(existingSale.review_email_scheduled_for).toLocaleString()}
                                            </div>
                                        ) : (
                                            <div className="text-amber-700">
                                                No review email scheduled (no buyer email captured).
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!existingSale && leads.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Existing leads on this vehicle
                                        </label>
                                        <select
                                            value={selectedLeadId}
                                            onChange={(e) => handleLeadSelect(e.target.value)}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white text-slate-900"
                                        >
                                            <option value="">— Manual entry —</option>
                                            {leads.map((lead) => (
                                                <option key={lead.id} value={lead.id}>
                                                    {lead.client_name}
                                                    {lead.client_email ? ` (${lead.client_email})` : ""} — {lead.status}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Pick a lead to auto-fill, or leave blank to enter manually.
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Buyer Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="buyer_name"
                                            required
                                            disabled={!!existingSale}
                                            value={form.buyer_name}
                                            onChange={(e) => setForm({ ...form, buyer_name: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Buyer Phone
                                        </label>
                                        <input
                                            type="tel"
                                            name="buyer_phone"
                                            disabled={!!existingSale}
                                            value={form.buyer_phone}
                                            onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })}
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-600"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Buyer Email
                                    </label>
                                    <input
                                        type="email"
                                        name="buyer_email"
                                        disabled={!!existingSale}
                                        value={form.buyer_email}
                                        onChange={(e) => setForm({ ...form, buyer_email: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-600"
                                    />
                                    {!existingSale && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            If provided, a review request email will be scheduled for 4 days from now.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Buyer Birthday
                                    </label>
                                    <input
                                        type="date"
                                        name="buyer_birthday"
                                        disabled={!!existingSale}
                                        value={form.buyer_birthday}
                                        onChange={(e) => setForm({ ...form, buyer_birthday: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-600"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Used to send a birthday greeting later. Optional.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">
                                        Delivery Photo
                                    </label>
                                    {existingSale?.delivery_photo_url ? (
                                        <img
                                            src={existingSale.delivery_photo_url}
                                            alt="Delivery"
                                            className="rounded-lg max-h-64 border border-slate-200"
                                        />
                                    ) : existingSale ? (
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-500 italic">
                                                No photo on file. Upload one to create a handover video that includes the buyer.
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/png, image/jpeg, image/webp"
                                                disabled={photoUploading}
                                                onChange={handlePhotoUpload}
                                                className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 disabled:opacity-60"
                                            />
                                            {photoUploading && <p className="text-xs text-slate-500">Uploading…</p>}
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                name="delivery_photo"
                                                accept="image/png, image/jpeg, image/webp"
                                                className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-primary-ink hover:file:bg-primary/20"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Customer collecting their car. Will be reused for a video clip later.
                                            </p>
                                        </>
                                    )}
                                </div>

                                {existingSale && (
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">
                                            Handover Video
                                        </label>
                                        <SaleVideoPicker
                                            sale={existingSale}
                                            onUpdated={(patch) => setExistingSale((s) => ({ ...s, ...patch }))}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
                                    <textarea
                                        name="notes"
                                        rows="3"
                                        disabled={!!existingSale}
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 disabled:bg-slate-50 disabled:text-slate-600 resize-none"
                                    ></textarea>
                                </div>

                                {!existingSale && (
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
                                )}

                                {existingSale && (
                                    <label className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={!!existingSale.skip_social}
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
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50"
                                    >
                                        {existingSale ? "Close" : "Cancel"}
                                    </button>
                                    {!existingSale && (
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold rounded-lg"
                                        >
                                            {submitting ? "Saving..." : "Confirm Sale"}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
