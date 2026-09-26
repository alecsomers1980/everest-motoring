"use client";

import { useState, useRef } from "react";
import { updateTradeInStatus } from "./actions";
import OfferModal from "./OfferModal";

export default function TradeInStatusSelector({ requestId, currentStatus, request }) {
    const [showOffer, setShowOffer] = useState(false);
    const selectRef = useRef(null);

    const handleChange = (e) => {
        const newStatus = e.target.value;
        if (newStatus === "offer_made") {
            // Open the editable offer + email popup instead of submitting directly.
            setShowOffer(true);
            return;
        }
        e.target.form?.requestSubmit();
    };

    return (
        <>
            <form action={updateTradeInStatus} className="inline-block relative w-full sm:w-auto">
                <input type="hidden" name="requestId" value={requestId} />
                <select
                    ref={selectRef}
                    name="status"
                    defaultValue={currentStatus}
                    onChange={handleChange}
                    className={`appearance-none bg-transparent pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 inline-flex items-center px-3 py-1.5 text-xs font-bold uppercase rounded-full w-full ${currentStatus === 'pending_valuation' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        currentStatus === 'offer_made' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                            currentStatus === 'purchased' ? 'bg-green-100 text-green-700 border border-green-200' :
                                currentStatus === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    'bg-slate-200 text-slate-600 border border-slate-300'
                        }`}
                >
                    <option value="pending_valuation">Pending Valuation</option>
                    <option value="offer_made">Offer Made</option>
                    <option value="purchased">Purchased</option>
                    <option value="rejected">Rejected</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-current opacity-70">
                    <span className="material-symbols-outlined text-[14px]">expand_more</span>
                </div>
            </form>

            {showOffer && (
                <OfferModal
                    request={request || { id: requestId }}
                    onClose={() => {
                        setShowOffer(false);
                        if (selectRef.current) selectRef.current.value = currentStatus;
                    }}
                    onDone={() => window.location.reload()}
                />
            )}
        </>
    );
}
