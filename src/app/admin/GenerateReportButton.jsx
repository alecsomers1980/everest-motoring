"use client";

export default function GenerateReportButton() {
    return (
        <a
            href="/admin/reports"
            className="bg-primary hover:bg-primary-dark text-black px-10 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-[0_0_30px_rgba(255,255,1,0.2)] active:scale-95 inline-flex items-center gap-2"
        >
            <span className="material-symbols-outlined text-[20px]">summarize</span>
            Performance Reports
        </a>
    );
}
