"use client";

import { useTransition } from "react";
import { toggleAffiliateApproval } from "./actions";

export default function AffiliateApprovalToggle({ affiliate }) {
    const [isPending, startTransition] = useTransition();

    const handleToggle = () => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("affiliateId", affiliate.id);
            formData.append("currentStatus", affiliate.is_approved ? "true" : "false");
            await toggleAffiliateApproval(formData);
        });
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isPending}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold font-mono tracking-wider uppercase transition-all shadow-sm border ${affiliate.is_approved
                    ? "bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 group"
                    : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200 group"
                }`}
        >
            <span className={`w-2 h-2 rounded-full ${affiliate.is_approved ? 'bg-green-500 group-hover:bg-red-500' : 'bg-slate-400 group-hover:bg-green-500'}`}></span>
            {isPending ? "Updating..." : (affiliate.is_approved ? "Approved" : "Pending Approval")}
        </button>
    );
}
