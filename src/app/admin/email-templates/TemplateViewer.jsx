"use client";

import { useState } from "react";

const WIDTHS = {
    desktop: "100%",
    mobile: "390px",
};

export default function TemplateViewer({ templates }) {
    const [activeKey, setActiveKey] = useState(templates[0]?.key);
    const [device, setDevice] = useState("desktop");

    const active = templates.find((t) => t.key === activeKey) || templates[0];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Template list */}
            <aside className="bg-white border border-slate-200 rounded-2xl p-3 h-fit shadow-sm">
                <p className="px-3 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    {templates.length} Templates
                </p>
                <nav className="flex flex-col gap-1">
                    {templates.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setActiveKey(t.key)}
                            className={`text-left px-3 py-3 rounded-xl transition-all ${
                                t.key === activeKey
                                    ? "bg-primary text-black shadow-sm"
                                    : "text-slate-700 hover:bg-slate-100"
                            }`}
                        >
                            <span className="block font-bold text-sm">{t.name}</span>
                            <span
                                className={`block text-xs mt-0.5 leading-snug ${
                                    t.key === activeKey ? "text-black/70" : "text-slate-400"
                                }`}
                            >
                                {t.description}
                            </span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Preview panel */}
            <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="font-bold text-slate-900">{active?.name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{active?.description}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 shrink-0">
                        {Object.keys(WIDTHS).map((d) => (
                            <button
                                key={d}
                                onClick={() => setDevice(d)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                                    device === d
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {d}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-100 p-4 sm:p-8 flex justify-center">
                    <iframe
                        key={`${active?.key}-${device}`}
                        title={active?.name}
                        srcDoc={active?.html}
                        sandbox="allow-same-origin"
                        className="bg-white rounded-lg shadow-md w-full border border-slate-200"
                        style={{ maxWidth: WIDTHS[device], height: "800px" }}
                    />
                </div>
            </section>
        </div>
    );
}
