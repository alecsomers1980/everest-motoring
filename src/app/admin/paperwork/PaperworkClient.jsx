"use client";

import { useState } from "react";
import DealForms from "./DealForms";
import FinanceHouses from "./FinanceHouses";

const TABS = [
    { id: "deal", label: "Deal forms" },
    { id: "banks", label: "Finance houses" },
];

export default function PaperworkClient({ initialHouses, missingTable }) {
    const [tab, setTab] = useState("deal");
    const [houses, setHouses] = useState(initialHouses);

    return (
        <div>
            <div role="tablist" className="flex gap-2 mb-6 border-b border-slate-200">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        id={`tab-${t.id}`}
                        aria-selected={tab === t.id}
                        aria-controls={`panel-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 -mb-px border-b-2 text-sm font-bold ${
                            tab === t.id ? "border-black text-black" : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {/* Both panels stay mounted so a reviewed deal survives a visit to Finance houses. */}
            <div role="tabpanel" id="panel-deal" aria-labelledby="tab-deal" hidden={tab !== "deal"}>
                <DealForms houses={houses} missingTable={missingTable} />
            </div>
            <div role="tabpanel" id="panel-banks" aria-labelledby="tab-banks" hidden={tab !== "banks"}>
                <FinanceHouses houses={houses} onChange={setHouses} missingTable={missingTable} />
            </div>
        </div>
    );
}
