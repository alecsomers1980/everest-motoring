"use client";

import { useState } from "react";
import { sendTradeInOfferAction } from "./actions";

function buildDefaultBody({ name, vehicle, amount }) {
    const formatted = new Intl.NumberFormat("en-ZA").format(amount || 0);
    return `Dear ${name || "Customer"},

Thank you for submitting your ${vehicle} for valuation with Everest Motoring.

Based on the details and photos you provided, we are pleased to present a preliminary trade-in offer of:

R ${formatted}

Please note: this is an indicative offer only. The final offer will be confirmed after a full physical inspection of the vehicle at our dealership, where we verify its mechanical condition, service history and overall presentation.

To proceed, please book an inspection at our dealership and bring along:
- Your South African ID
- The vehicle's registration papers and licence disc
- Full service history (if available)
- All keys, including spares
- A settlement / balance letter from your bank (if the vehicle is financed)

This offer is valid for 7 days from the date of this email.

To arrange your inspection, contact us on +27 78 893 8881 or info@everestmotoring.co.za.

Kind regards,
The Everest Motoring Team`;
}

export default function OfferModal({ request, onClose, onDone }) {
    const vehicle = `${request.year || ""} ${request.make || ""} ${request.model || ""}`.trim() || "your vehicle";
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState(request.offer_value ? String(request.offer_value) : "");
    const [subject, setSubject] = useState(`Your Everest Motoring Trade-In Offer — ${vehicle}`);
    const [body, setBody] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const cleanAmount = Number(String(amount).replace(/[^\d]/g, ""));

    const goToEmail = () => {
        if (!cleanAmount) {
            setError("Please enter a valid offer amount.");
            return;
        }
        setError(null);
        setBody(buildDefaultBody({ name: request.client_name, vehicle, amount: cleanAmount }));
        setStep(2);
    };

    const submit = async (doSend) => {
        setBusy(true);
        setError(null);
        try {
            const res = await sendTradeInOfferAction({
                requestId: request.id,
                offerValue: amount,
                subject,
                body,
                sendEmail: doSend,
            });
            if (res?.error) {
                setError(res.error);
                setBusy(false);
                return;
            }
            if (res?.emailError) {
                alert("Offer saved, but the email could not be sent: " + res.emailError);
            } else if (res?.sent) {
                alert("Offer saved and emailed to " + res.to);
            }
            onDone();
        } catch (e) {
            setError(e.message);
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Make an Offer</h2>
                        <p className="text-sm text-slate-500">{request.client_name} — {vehicle}</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
                    )}

                    {step === 1 ? (
                        <>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Offer Amount (R)</label>
                                <input
                                    type="number"
                                    min="0"
                                    autoFocus
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="e.g. 80000"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 text-lg"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Enter whole rands, no spaces or commas. {cleanAmount ? `→ R ${new Intl.NumberFormat("en-ZA").format(cleanAmount)}` : ""}
                                </p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={onClose} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="button" onClick={goToEmail} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">Continue</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm">
                                <span className="font-bold text-slate-700">To:</span>{" "}
                                <span className="text-slate-900">{request.client_email || "— no email on file —"}</span>
                                <span className="mx-2 text-slate-300">|</span>
                                <span className="font-bold text-slate-700">Offer:</span>{" "}
                                <span className="text-slate-900">R {new Intl.NumberFormat("en-ZA").format(cleanAmount)}</span>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Email Message (editable)</label>
                                <textarea
                                    rows={16}
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 text-sm leading-relaxed resize-y font-sans"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Edit anything you need. It's sent in the branded Everest email template.
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-between gap-3 pt-2 border-t border-slate-100">
                                <button type="button" disabled={busy} onClick={() => setStep(1)} className="px-5 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Back</button>
                                <div className="flex gap-3">
                                    <button type="button" disabled={busy} onClick={() => submit(false)} className="px-5 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Save offer only</button>
                                    <button type="button" disabled={busy || !request.client_email} onClick={() => submit(true)} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        {busy ? "Sending…" : "Approve & Send Email"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
