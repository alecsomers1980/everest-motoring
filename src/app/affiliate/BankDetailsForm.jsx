"use client";

import { useState } from "react";
import { saveBankDetails } from "./actions"; // We will create this action

export default function BankDetailsForm({ initialBankName, initialAccountNumber, initialBranchCode }) {
    const [status, setStatus] = useState("idle");
    const [message, setMessage] = useState("");
    const [accountNumber, setAccountNumber] = useState(initialAccountNumber || "");
    const [revealed, setRevealed] = useState(!initialAccountNumber);

    const maskedAccountNumber = accountNumber
        ? `${"•".repeat(Math.max(accountNumber.length - 4, 0))}${accountNumber.slice(-4)}`
        : "";

    async function handleAction(formData) {
        setStatus("saving");
        setMessage("");

        const result = await saveBankDetails(formData);

        if (result?.error) {
            setStatus("error");
            setMessage(result.error);
        } else {
            setStatus("success");
            setMessage("Bank details securely saved.");
            setTimeout(() => setStatus("idle"), 3000);
        }
    }

    return (
        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden mb-8 text-white">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                        <span className="material-symbols-outlined">account_balance</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Payout Details</h2>
                        <p className="text-sm text-slate-400">Securely store your banking information for commission payouts.</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <form action={handleAction} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Bank Name</label>
                        <input
                            type="text"
                            name="bank_name"
                            defaultValue={initialBankName || ""}
                            required
                            placeholder="e.g. FNB"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider">Account Number</label>
                            {accountNumber && (
                                <button
                                    type="button"
                                    onClick={() => setRevealed((r) => !r)}
                                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">{revealed ? "visibility_off" : "visibility"}</span>
                                    {revealed ? "Hide" : "Reveal"}
                                </button>
                            )}
                        </div>
                        <input
                            type="text"
                            value={revealed ? accountNumber : maskedAccountNumber}
                            onChange={(e) => revealed && setAccountNumber(e.target.value)}
                            readOnly={!revealed}
                            required
                            placeholder="Account Number"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <input type="hidden" name="account_number" value={accountNumber} />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Branch Code</label>
                            <input
                                type="text"
                                name="branch_code"
                                defaultValue={initialBranchCode || ""}
                                required
                                placeholder="Branch Code"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            />
                        </div>
                        <div className="w-auto pb-[2px]">
                            <button
                                type="submit"
                                disabled={status === "saving"}
                                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition-colors h-[46px] flex items-center gap-2"
                            >
                                {status === "saving" ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                                        Saving
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">lock</span>
                                        Save
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${status === "error" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                        <span className="material-symbols-outlined text-[18px]">{status === "error" ? "error" : "check_circle"}</span>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
}
