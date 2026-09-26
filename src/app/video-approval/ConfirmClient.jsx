"use client";

import { useState, useTransition } from "react";
import { confirmVideoDecisionAction } from "./actions";

export default function ConfirmClient({ carId, action, signature, carLabel }) {
  const [feedback, setFeedback] = useState({ type: null, message: "" });
  const [isPending, startTransition] = useTransition();

  const baseClasses = "w-full font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50";
  const toneClasses =
    action === "approve"
      ? "bg-green-600 hover:bg-green-700 text-white"
      : "bg-red-600 hover:bg-red-700 text-white";
  const label = action === "approve" ? "Approve & schedule posts" : "Confirm rejection";

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmVideoDecisionAction(carId, action, signature);
      setFeedback(
        result.success
          ? { type: "success", message: result.message }
          : { type: "error", message: result.error }
      );
    });
  }

  if (feedback.type === "success") {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm">
        {feedback.message}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleConfirm}
        disabled={isPending}
        aria-label={`${action === "approve" ? "Approve" : "Reject"} video for ${carLabel}`}
        className={`${baseClasses} ${toneClasses}`}
      >
        {isPending ? "Working…" : label}
      </button>
      {feedback.type === "error" && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {feedback.message}
        </div>
      )}
    </div>
  );
}