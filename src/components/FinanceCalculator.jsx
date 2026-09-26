"use client";

import { useState } from "react";
import {
    calculateMonthly,
    formatRand,
    DEFAULT_INTEREST_RATE,
    TERM_OPTIONS,
} from "@/utils/finance/calculator";

export default function FinanceCalculator({ price }) {
    const [deposit, setDeposit] = useState(0);
    const [termMonths, setTermMonths] = useState(72);
    const [balloonPct, setBalloonPct] = useState(0);

    const { monthly, balloonAmount } = calculateMonthly({
        price,
        deposit,
        termMonths,
        balloonPct,
    });

    const maxDeposit = Math.round(price * 0.5);

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Estimate your monthly repayment</h2>
            <p className="text-sm text-slate-500 mb-6">
                Adjust the sliders to see what this vehicle could cost you each month.
            </p>

            <div className="bg-black rounded-xl p-6 mb-6 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Estimated monthly instalment
                </p>
                <p className="text-4xl font-bold text-primary">{formatRand(monthly)}</p>
                <p className="text-xs text-slate-400 mt-2">
                    over {termMonths} months at {(DEFAULT_INTEREST_RATE * 100).toFixed(2)}% p.a.
                </p>
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-baseline mb-2">
                        <label htmlFor="fc-deposit" className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Deposit
                        </label>
                        <span className="font-bold text-slate-900">{formatRand(deposit)}</span>
                    </div>
                    <input
                        id="fc-deposit"
                        type="range"
                        min={0}
                        max={maxDeposit}
                        step={5000}
                        value={deposit}
                        onChange={(e) => setDeposit(Number(e.target.value))}
                        className="w-full accent-primary cursor-pointer"
                    />
                </div>

                <div>
                    <label htmlFor="fc-term" className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Repayment term
                    </label>
                    <div id="fc-term" className="grid grid-cols-3 gap-2">
                        {TERM_OPTIONS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTermMonths(t)}
                                aria-pressed={termMonths === t}
                                className={`py-2 rounded-lg text-sm font-bold transition-colors border ${
                                    termMonths === t
                                        ? "bg-primary border-primary text-black"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-baseline mb-2">
                        <label htmlFor="fc-balloon" className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Balloon payment
                        </label>
                        <span className="font-bold text-slate-900">
                            {(balloonPct * 100).toFixed(0)}%
                            {balloonAmount > 0 && (
                                <span className="text-slate-500 font-medium"> · {formatRand(balloonAmount)}</span>
                            )}
                        </span>
                    </div>
                    <input
                        id="fc-balloon"
                        type="range"
                        min={0}
                        max={40}
                        step={5}
                        value={balloonPct * 100}
                        onChange={(e) => setBalloonPct(Number(e.target.value) / 100)}
                        className="w-full accent-primary cursor-pointer"
                    />
                    {balloonAmount > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                            A balloon lowers your monthly instalment, but {formatRand(balloonAmount)} stays owing at
                            the end of the term.
                        </p>
                    )}
                </div>
            </div>

            <p className="mt-8 pt-6 border-t border-slate-200 text-xs leading-relaxed text-slate-500">
                <strong className="text-slate-700">Estimate only.</strong> This is not a quote or an offer of credit.
                Figures are illustrative, include the statutory initiation and monthly service fees, and exclude
                insurance. Your actual rate and instalment depend on your credit profile and are subject to credit
                approval. Terms and conditions apply. Everest Motoring works with registered financial service
                providers &mdash; E&amp;OE.
            </p>
        </div>
    );
}
