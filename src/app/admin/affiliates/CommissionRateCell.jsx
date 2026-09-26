"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setAffiliateCommissionAction } from "./actions";

export default function CommissionRateCell({ affiliateId, initialValue }) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const formattedValue = value == null ? null : new Intl.NumberFormat("en-ZA").format(value);

  function startEditing() {
    setDraft(value == null ? "" : String(value));
    setError(null);
    setIsEditing(true);
  }

  function cancel() {
    setError(null);
    setIsEditing(false);
  }

  function saveValue(nextValue) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setAffiliateCommissionAction(affiliateId, nextValue);
        if (result.success === false) {
          setError(result.error || "Failed to save commission rate.");
        } else {
          setValue(nextValue);
          setIsEditing(false);
        }
      } catch (err) {
        setError(err?.message || "Failed to save commission rate.");
      }
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (trimmed === "") return saveValue(null);
    const nextValue = Number(trimmed);
    if (!Number.isFinite(nextValue) || nextValue < 0) {
      setError("Please enter a valid amount of 0 or more.");
      return;
    }
    saveValue(nextValue);
  }

  return (
    <div className="flex flex-col items-end">
      {isEditing ? (
        <>
          <form onSubmit={handleSubmit} className="flex items-center justify-end gap-1">
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && cancel()}
              disabled={isPending}
              className="w-24 rounded-md border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800"
            />
            <button type="submit" disabled={isPending} className="rounded-md bg-green-500 p-1 text-white hover:bg-green-600 disabled:opacity-50" title="Save">
              <span className="material-symbols-outlined text-[14px]">check</span>
            </button>
            <button type="button" onClick={cancel} disabled={isPending} className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-50" title="Cancel">
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </form>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          title="Click to edit commission per closed deal"
          className={`rounded-md px-2 py-1 text-xs font-bold hover:bg-slate-50 ${value == null ? "italic text-slate-400" : "text-slate-800"}`}
        >
          {value == null ? "Not set" : `R ${formattedValue}`}
        </button>
      )}
    </div>
  );
}