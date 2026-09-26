"use client";

import { useState, useTransition } from "react";
import { addAffiliateAction } from "./actions";

export default function AddAffiliateModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (formData) => {
        setMessage({ type: '', text: '' });
        startTransition(async () => {
            const result = await addAffiliateAction(formData);
            if (result.success) {
                setMessage({ type: 'success', text: 'Affiliate successfully added and invited!' });
                setTimeout(() => {
                    setIsOpen(false);
                    setMessage({ type: '', text: '' });
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to add affiliate' });
            }
        });
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-primary hover:bg-primary-light text-black transition-colors px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Add Affiliate
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">Add New Affiliate</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-700 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6">
                            {message.text && (
                                <div className={`p-4 rounded-lg mb-6 text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    <span className="material-symbols-outlined">
                                        {message.type === 'success' ? 'check_circle' : 'error'}
                                    </span>
                                    {message.text}
                                </div>
                            )}

                            <form action={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">First Name</label>
                                        <input
                                            type="text"
                                            name="firstName"
                                            required
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Last Name</label>
                                        <input
                                            type="text"
                                            name="lastName"
                                            required
                                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        placeholder="john@example.com"
                                    />
                                    <p className="text-xs text-slate-500 mt-1.5">An invite link will be emailed to them to set their password.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Phone Number</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                        placeholder="082 123 4567"
                                    />
                                </div>

                                <div className="pt-4 flex justify-end gap-3 mt-6 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-5 py-2.5 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="px-5 py-2.5 rounded-lg font-bold text-black bg-primary hover:bg-primary-light transition-colors flex items-center justify-center min-w-[140px] text-sm shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isPending ? (
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                                Creating...
                                            </span>
                                        ) : (
                                            "Add Affiliate"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
