"use client";

import { useState } from "react";
import { submitContactForm } from "./actions";
import Icon from "@/components/Icon";

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900";

export default function ContactForm() {
    const [status, setStatus] = useState("idle"); // idle | loading | success
    const [error, setError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setStatus("loading");
        try {
            const res = await submitContactForm(new FormData(e.target));
            if (res?.error) {
                setError(res.error);
                setStatus("idle");
                return;
            }
            setStatus("success");
        } catch (err) {
            setError(err.message || "Something went wrong.");
            setStatus("idle");
        }
    }

    if (status === "success") {
        return (
            <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                <Icon name="check_circle" className="text-4xl text-green-600" />
                <h3 className="mt-2 text-lg font-bold text-slate-900">Message sent!</h3>
                <p className="mt-1 text-sm text-slate-600">
                    Thanks for reaching out — one of our team will get back to you shortly.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
                <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Full Name <span className="text-red-500">*</span>
                    </label>
                    <input type="text" id="name" name="name" required placeholder="e.g. John Doe" className={inputClass} />
                </div>
                <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Email Address <span className="text-red-500">*</span>
                    </label>
                    <input type="email" id="email" name="email" required placeholder="e.g. john@example.com" className={inputClass} />
                </div>
            </div>

            <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone Number
                </label>
                <input type="tel" id="phone" name="phone" placeholder="e.g. +27 82 000 0000" className={inputClass} />
            </div>

            <div>
                <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Message <span className="text-red-500">*</span>
                </label>
                <textarea id="message" name="message" rows={5} required placeholder="Tell us how we can help you…" className={`${inputClass} resize-none`} />
            </div>

            <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                    <span className="text-red-500">*</span> Required fields
                </p>
                <button
                    type="submit"
                    disabled={status === "loading"}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-bold text-black shadow-lg shadow-primary/20 transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60"
                >
                    {status === "loading" ? "Sending…" : "Send Message"}
                    {status !== "loading" && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                    )}
                </button>
            </div>
        </form>
    );
}
