"use client";

import { useState } from "react";
import { saveFinancingDetailsAction } from "./actions";

export default function FinancingDetailsForm({ leadId }) {
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");

    async function handleAction(formData) {
        setStatus("saving");
        setMessage("");

        const result = await saveFinancingDetailsAction(formData);

        if (result?.error) {
            setStatus("error");
            setMessage(result.error);
        } else {
            // Success redirect is handled by the server action revalidating/redirecting
            setStatus("success");
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="bg-slate-950 p-6 flex items-center gap-3 text-white">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary-ink">
                    <span className="material-symbols-outlined">assignment</span>
                </div>
                <div>
                    <h2 className="text-xl font-bold">Step 1: Financing Profile</h2>
                    <p className="text-sm text-slate-400">Let's start by getting some basic details to speed up your application.</p>
                </div>
            </div>

            <div className="p-6 md:p-8">
                <form action={handleAction} className="space-y-8">
                    <input type="hidden" name="lead_id" value={leadId} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Employment Status</label>
                            <select
                                name="employment_status"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                            >
                                <option value="">Select Status...</option>
                                <option value="employed_full_time">Employed (Full-Time)</option>
                                <option value="employed_contract">Employed (Contract)</option>
                                <option value="self_employed">Self-Employed / Business Owner</option>
                                <option value="retired">Retired</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Net Monthly Income (After Tax)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R</span>
                                <input
                                    type="number"
                                    name="monthly_income"
                                    required
                                    min="5000"
                                    placeholder="25000"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Preferred Financing Period (Months)</label>
                        <select
                            name="financing_period"
                            required
                            defaultValue="72"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                        >
                            <option value="48">48 Months (4 Years)</option>
                            <option value="60">60 Months (5 Years)</option>
                            <option value="72">72 Months (6 Years)</option>
                        </select>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                        <p className="text-sm text-slate-500 italic max-w-sm">
                            Your data is encrypted and securely sent directly to our finance department.
                        </p>
                        <button
                            type="submit"
                            disabled={status === "saving" || status === "success"}
                            className="bg-primary hover:bg-primary-dark disabled:bg-slate-300 text-black font-bold py-3 px-8 rounded-lg transition-colors shadow-md flex items-center gap-2"
                        >
                            {status === "saving" ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                                    Saving Profile...
                                </>
                            ) : (
                                <>
                                    Save & Continue
                                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>

                    {message && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 mt-4">
                            <span className="material-symbols-outlined shrink-0">error</span>
                            <p className="text-sm font-medium">{message}</p>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
