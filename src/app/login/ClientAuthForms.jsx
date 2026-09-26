"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/gtag";
import Icon from "@/components/Icon";

export default function ClientAuthForms({ initialIsRegisteringClient, carId, initialError, initialMessage }) {
    const [isRegisteringClient, setIsRegisteringClient] = useState(initialIsRegisteringClient);
    const [error, setError] = useState(initialError || "");
    const [message, setMessage] = useState(initialMessage || "");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/auth/login", {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Invalid Credentials");
                setLoading(false);
            } else if (data.redirect) {
                window.location.href = data.redirect;
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/auth/register-client", {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Registration failed");
                setLoading(false);
            } else {
                trackEvent("sign_up", { method: "client_portal" });
                setMessage(data.message || "Account created! Please check your email.");
                setIsRegisteringClient(false);
                setLoading(false);
            }
        } catch (err) {
            setError("An unexpected error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className={`w-full ${isRegisteringClient ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 transition-all duration-300`}>

            <div className={`p-6 text-center border-b border-white/10 ${isRegisteringClient ? 'bg-primary text-black' : 'bg-slate-950 text-white'}`}>
                <img
                    src="/images/logo.png"
                    alt="Everest Motoring Logo"
                    className="h-10 w-auto mx-auto mb-4"
                />
                <h1 className="text-2xl font-bold">{isRegisteringClient ? 'Client Portal Registration' : 'Secure Portal Login'}</h1>
                {isRegisteringClient && (
                    <p className="text-white/80 mt-2">Track your vehicle financing securely in one place.</p>
                )}
            </div>

            <div className="p-8 md:p-10">
                {error && (
                    <div className="animate-in fade-in slide-in-from-top-4 mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 shadow-sm">
                        <Icon name="error" className="shrink-0 text-red-500" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                )}

                {message && (
                    <div className="animate-in fade-in slide-in-from-top-4 mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3 shadow-sm">
                        <Icon name="check_circle" className="shrink-0 text-green-500" />
                        <p className="text-sm font-medium">{message}</p>
                    </div>
                )}

                {isRegisteringClient ? (
                    <>
                        <form className="space-y-6" onSubmit={handleRegister}>
                            <input type="hidden" name="carId" value={carId} />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">First Name</label>
                                    <input type="text" name="firstName" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Last Name</label>
                                    <input type="text" name="lastName" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
                                    <input type="email" name="email" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Phone Number</label>
                                    <input type="tel" name="phone" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 mb-4">Account Security</h3>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Create Password</label>
                                    <input type="password" name="password" required minLength={8} disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" placeholder="Minimum 8 characters" />
                                </div>
                            </div>

                            <div className="pt-6">
                                <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-lg shadow-md transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-70">
                                    {loading ? 'Processing...' : 'Create Account'}
                                    {!loading && <Icon name="arrow_forward" />}
                                </button>
                            </div>
                        </form>

                        <div className="mt-8 text-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-500">
                                Already have an account? <button type="button" onClick={() => setIsRegisteringClient(false)} className="text-primary-ink font-bold hover:underline">Sign In Instead</button>
                            </p>
                        </div>
                    </>
                ) : (
                    <>
                        <form className="space-y-6" onSubmit={handleLogin}>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
                                <input type="email" name="email" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" placeholder="you@example.com" />
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
                                    <a href="#" className="text-sm font-medium text-primary-ink hover:underline">Forgot?</a>
                                </div>
                                <input type="password" name="password" required disabled={loading} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-50" placeholder="••••••••" />
                            </div>

                            <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-lg shadow-md transition-all disabled:opacity-70">
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="mt-8 text-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-500">
                                New Client? <button type="button" onClick={() => setIsRegisteringClient(true)} className="text-primary-ink font-bold hover:underline">Apply Here</button>
                            </p>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
