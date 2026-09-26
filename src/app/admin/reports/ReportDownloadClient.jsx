"use client";

import { useState } from "react";

export default function ReportDownloadClient({ monthOptions }) {
  const [month, setMonth] = useState(monthOptions[0]?.value || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function download() {
    setError(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/reports/monthly?month=${encodeURIComponent(month)}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `Server returned ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Everest-Report-${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <label className="text-sm font-bold uppercase tracking-widest text-slate-500">
          Select month
        </label>
        <select
          value={month}
          onChange={(e) => { setMonth(e.target.value); setError(null); }}
          className="px-4 py-3 rounded-xl border border-slate-300 bg-white text-black font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[200px]"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={download}
        disabled={loading}
        className="bg-primary hover:bg-primary-dark text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,255,1,0.2)] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 self-start"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            Generating PDF...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">download</span>
            Download PDF
          </>
        )}
      </button>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {error}
        </div>
      )}
    </div>
  );
}
