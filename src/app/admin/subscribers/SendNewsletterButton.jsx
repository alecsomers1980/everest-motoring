"use client";
import { useState } from "react";
import { sendNewsletterAction } from "./actions";

export default function SendNewsletterButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function onSend() {
    if (!window.confirm("Send the newsletter to all subscribers now?")) return;
    setBusy(true);
    setMsg(null);
    const res = await sendNewsletterAction();
    setBusy(false);
    if (res.error) {
      setMsg({ type: "error", text: res.error });
    } else {
      setMsg({
        type: "success",
        text: `Newsletter sent to ${res.sent} of ${res.total} subscribers.`,
      });
    }
  }

  return (
    <div>
      <button
        className="px-5 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg disabled:opacity-50"
        disabled={busy}
        onClick={onSend}
      >
        {busy ? "Sending…" : "Send Newsletter Now"}
      </button>
      {msg && (
        <div
          className={
            msg.type === "success"
              ? "mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800"
              : "mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          }
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}
