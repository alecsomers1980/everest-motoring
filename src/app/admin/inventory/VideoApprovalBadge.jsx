"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { decideVideoFromAdminAction } from "./ai_actions";

export default function VideoApprovalBadge({ carId, status }) {
  const [successMessage, setSuccessMessage] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  if (status === null || status === undefined) return null;

  if (status === "approved") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-label font-semibold uppercase rounded-md">
          <CheckCircle2 className="h-3 w-3" />
          Video approved
        </span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-label font-semibold uppercase rounded-md">
          <XCircle className="h-3 w-3" />
          Video rejected
        </span>
      </div>
    );
  }

  if (status === "pending") {
    if (successMessage) {
      return (
        <div className="flex flex-col items-start gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-label font-semibold uppercase rounded-md">
            <CheckCircle2 className="h-3 w-3" />
            <span className="max-w-xs whitespace-normal text-xs normal-case font-medium">
              {successMessage}
            </span>
          </span>
        </div>
      );
    }

    const handleDecision = (action) => {
      if (action === "reject") {
        const confirmed = window.confirm(
          "Reject this walkaround video? No video posts will be created for this vehicle."
        );
        if (!confirmed) return;
      }
      setError(null);
      startTransition(async () => {
        try {
          const result = await decideVideoFromAdminAction(carId, action);
          if (result.success) {
            setSuccessMessage(result.message);
          } else {
            setError(result.error);
          }
        } catch (err) {
          setError(err.message || "Something went wrong.");
        }
      });
    };

    return (
      <div className="flex flex-col items-start gap-1.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-label font-semibold uppercase rounded-md">
          <Clock className="h-3 w-3" />
          Video awaiting approval
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:border-emerald-400 hover:text-emerald-900 transition-colors disabled:opacity-50"
            onClick={() => handleDecision("approve")}
            disabled={isPending}
          >
            {isPending ? "..." : "Approve"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-red-400 hover:text-red-700 transition-colors disabled:opacity-50"
            onClick={() => handleDecision("reject")}
            disabled={isPending}
          >
            {isPending ? "..." : "Reject"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return null;
}