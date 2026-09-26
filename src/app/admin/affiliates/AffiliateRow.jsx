"use client";

import { useState, useTransition } from "react";
import { approveAffiliateAction, declineAffiliateAction, deleteAffiliateAction, getAffiliateBankDetails } from "./actions";
import CommissionRateCell from "./CommissionRateCell";

const STATUS_STYLES = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    finance_pending: "bg-purple-100 text-purple-700",
    document_collection: "bg-orange-100 text-orange-700",
    closed_won: "bg-green-100 text-green-700",
    closed_lost: "bg-slate-100 text-slate-500",
};

function StatusBadge({ status }) {
    const cls = STATUS_STYLES[status] || "bg-slate-100 text-slate-600";
    return (
        <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${cls}`}>
            {(status || "unknown").replace(/_/g, " ")}
        </span>
    );
}

export default function AffiliateRow({ aff, affiliateLeads = [], isPending = false }) {
    const [expanded, setExpanded] = useState(false);
    const [isTxn, startTransition] = useTransition();
    const [payoutDetails, setPayoutDetails] = useState(null);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [payoutError, setPayoutError] = useState("");

    const handleViewPayoutDetails = () => {
        setPayoutLoading(true);
        setPayoutError("");
        startTransition(async () => {
            const result = await getAffiliateBankDetails(aff.id);
            setPayoutLoading(false);
            if (!result.success) {
                setPayoutError(result.error || "Failed to load payout details");
                return;
            }
            setPayoutDetails(result);
        });
    };

    const handleApprove = () => {
        startTransition(async () => {
            const result = await approveAffiliateAction(aff.id, aff.first_name);
            if (!result.success) alert("Failed to approve: " + result.error);
        });
    };

    const handleDecline = () => {
        startTransition(async () => {
            const result = await declineAffiliateAction(aff.id);
            if (!result.success) alert("Failed to decline: " + result.error);
        });
    };

    const handleDelete = () => {
        if (!confirm(`Are you sure you want to permanently remove ${aff.first_name} ${aff.last_name}? This cannot be undone.`)) return;
        startTransition(async () => {
            const result = await deleteAffiliateAction(aff.id);
            if (!result.success) alert("Failed to delete: " + result.error);
        });
    };

    return (
        <>
            <tr className={`transition-colors border-b border-slate-100 ${expanded ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                {/* Name — clickable to expand */}
                <td className="p-4">
                    <button
                        onClick={() => setExpanded(p => !p)}
                        className="flex items-center gap-2 text-left group"
                    >
                        <span className={`material-symbols-outlined text-[18px] text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
                            chevron_right
                        </span>
                        <div>
                            <p className="font-bold text-slate-900 text-base group-hover:text-primary-ink transition-colors">
                                {aff.first_name} {aff.last_name}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Joined {new Date(aff.created_at).toLocaleDateString('en-ZA')}
                            </p>
                        </div>
                        {affiliateLeads.length > 0 && (
                            <span className="ml-1 text-xs bg-primary/10 text-primary-ink font-bold px-2 py-0.5 rounded-full">
                                {affiliateLeads.length}
                            </span>
                        )}
                    </button>
                </td>

                {/* Contact */}
                <td className="p-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">phone</span>
                        {aff.phone}
                    </span>
                </td>

                {/* Tracking Code */}
                <td className="p-4 text-center">
                    {aff.affiliate_code ? (
                        <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 font-bold tracking-widest uppercase border border-amber-200 rounded text-sm font-mono">
                            {aff.affiliate_code}
                        </span>
                    ) : (
                        <span className="text-slate-300 text-xs italic">Not assigned</span>
                    )}
                </td>

                {/* Leads / Closed Won */}
                <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                        {aff.totalLeads}
                    </span>
                </td>
                <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-700 font-bold text-sm">
                        {aff.closedWon}
                    </span>
                </td>

                {/* Commission rate — editable, blank hides all amounts */}
                <td className="p-4 text-right">
                    <CommissionRateCell affiliateId={aff.id} initialValue={aff.commission_per_deal ?? null} />
                </td>

                {/* Est. Commission */}
                <td className="p-4 text-right font-bold text-slate-800">
                    {aff.estPending == null
                        ? <span className="text-slate-300 italic font-normal">—</span>
                        : `R ${new Intl.NumberFormat('en-ZA').format(aff.estPending)}`}
                </td>

                {/* Actions */}
                <td className="p-4">
                    <div className="flex flex-col items-end gap-2">
                        {isPending ? (
                            <>
                                <button
                                    onClick={handleApprove}
                                    disabled={isTxn}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-md transition-colors disabled:opacity-50 w-full justify-center"
                                >
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    {isTxn ? "..." : "Approve"}
                                </button>
                                <button
                                    onClick={handleDecline}
                                    disabled={isTxn}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-md transition-colors disabled:opacity-50 w-full justify-center"
                                >
                                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                                    {isTxn ? "..." : "Decline"}
                                </button>
                            </>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-green-700 bg-green-50 border border-green-200 text-xs font-bold px-3 py-1.5 rounded-md">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Approved
                            </span>
                        )}
                        <button
                            onClick={handleDelete}
                            disabled={isTxn}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs font-bold rounded-md transition-colors disabled:opacity-50 w-full justify-center border border-transparent hover:border-red-200"
                        >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Remove
                        </button>
                    </div>
                </td>
            </tr>

            {/* ── Expandable leads panel ── */}
            {expanded && (
                <tr>
                    <td colSpan="8" className="bg-slate-50 border-b border-slate-200 p-0">
                        <div className="mx-4 mb-4 mt-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400 text-[18px]">assignment</span>
                                <h4 className="text-sm font-bold text-white">
                                    Leads from {aff.first_name} {aff.last_name}
                                </h4>
                                <span className="ml-auto text-xs text-slate-400">{affiliateLeads.length} total</span>
                            </div>

                            {affiliateLeads.length === 0 ? (
                                <p className="p-6 text-sm text-slate-400 italic text-center">No leads from this affiliate yet.</p>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="px-4 py-2 font-bold">Client</th>
                                            <th className="px-4 py-2 font-bold">Vehicle</th>
                                            <th className="px-4 py-2 font-bold">Date</th>
                                            <th className="px-4 py-2 font-bold">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {affiliateLeads.map(lead => (
                                            <tr key={lead.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2.5 font-medium text-slate-800">
                                                    {lead.client_name}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600">
                                                    {lead.cars
                                                        ? `${lead.cars.year} ${lead.cars.make} ${lead.cars.model}`
                                                        : <span className="italic text-slate-300">Vehicle removed</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500">
                                                    {new Date(lead.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <StatusBadge status={lead.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* ── Payout details (audit logged on view) ── */}
                        <div className="mx-4 mb-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-400 text-[18px]">account_balance</span>
                                <h4 className="text-sm font-bold text-white">Payout Details</h4>
                                {!payoutDetails && (
                                    <button
                                        onClick={handleViewPayoutDetails}
                                        disabled={payoutLoading}
                                        className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-md transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                                        {payoutLoading ? "Loading..." : "View Payout Details"}
                                    </button>
                                )}
                            </div>

                            {payoutError && (
                                <p className="p-4 text-sm text-red-500">{payoutError}</p>
                            )}

                            {payoutDetails && (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Name</p>
                                        <p className="font-medium text-slate-800">{payoutDetails.bankName || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</p>
                                        <p className="font-medium text-slate-800 font-mono">{payoutDetails.accountNumber || "—"}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Branch Code</p>
                                        <p className="font-medium text-slate-800 font-mono">{payoutDetails.branchCode || "—"}</p>
                                    </div>
                                    <p className="md:col-span-3 text-xs text-slate-400 italic">This view was recorded in the payout access log.</p>
                                </div>
                            )}

                            {!payoutDetails && !payoutError && (
                                <p className="p-4 text-sm text-slate-400 italic">Hidden by default. Viewing logs who accessed this affiliate's bank details and when.</p>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
