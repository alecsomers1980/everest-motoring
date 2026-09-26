"use client";

import { useState } from "react";
import { updateLeadStatusAction } from "./actions";

export default function LeadStatusSelector({ leadId, currentStatus }) {
    const [status, setStatus] = useState(currentStatus);
    const [isUpdating, setIsUpdating] = useState(false);

    const handleStatusChange = async (e) => {
        const newStatus = e.target.value;
        const previousStatus = status;

        setStatus(newStatus);
        setIsUpdating(true);

        const result = await updateLeadStatusAction(leadId, newStatus);

        if (result?.error) {
            alert(result.error);
            setStatus(previousStatus); // Revert on failure
        }
        setIsUpdating(false);
    };

    return (
        <div className="relative">
            <select
                value={status}
                onChange={handleStatusChange}
                disabled={isUpdating}
                className={`text-xs font-bold uppercase rounded-md pl-2 pr-6 py-1.5 appearance-none border outline-none cursor-pointer transition-colors w-full ${
                    status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    status === 'contacted' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    status === 'finance_pending' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    status === 'document_collection' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    status === 'closed_won' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                } ${isUpdating ? 'opacity-50 cursor-wait' : 'hover:opacity-90'}`}
            >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="document_collection">Docs Collection</option>
                <option value="finance_pending">Finance Pending</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none opacity-60">
                arrow_drop_down
            </span>
            {isUpdating && (
                <span className="material-symbols-outlined absolute -right-6 top-1/2 -translate-y-1/2 text-[16px] animate-spin text-slate-400">
                    sync
                </span>
            )}
        </div>
    );
}
