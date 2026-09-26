"use client";

import { useState } from "react";
import AddAffiliateModal from "./AddAffiliateModal";

export default function AffiliateTopActions({ affiliates }) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        const inviteLink = `${window.location.origin}/register`;
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExportCSV = () => {
        if (!affiliates || affiliates.length === 0) return;

        // Create CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "First Name,Last Name,Email,Phone,Tracking Code,Total Leads,Closed Won,Pending Commissions ZAR\n";

        // Add Rows
        affiliates.forEach(aff => {
            const row = [
                aff.first_name,
                aff.last_name,
                aff.email,
                aff.phone,
                aff.affiliate_code || 'NONE',
                aff.totalLeads,
                aff.closedWon,
                aff.estPending
            ].join(",");
            csvContent += row + "\n";
        });

        // Trigger Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `everest_affiliates_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
            <AddAffiliateModal />
            <button
                onClick={handleCopyLink}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 transition-colors px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 border border-amber-200"
            >
                <span className="material-symbols-outlined text-[18px]">
                    {copied ? 'check' : 'content_copy'}
                </span>
                {copied ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
            <button
                onClick={handleExportCSV}
                className="bg-slate-800 hover:bg-slate-700 text-white transition-colors px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
            >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Report (.csv)
            </button>
        </div>
    );
}
