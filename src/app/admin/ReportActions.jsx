"use client";

export default function ReportActions() {
    return (
        <div className="flex gap-4">
            <button 
                onClick={() => window.print()}
                className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl border border-white/10 font-bold flex items-center gap-2 transition-all active:scale-95"
            >
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                Export Report
            </button>
        </div>
    );
}
