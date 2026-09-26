import Icon from "@/components/Icon";

export const metadata = {
    title: "Affiliate Registration | Everest Motoring",
    description: "Apply to become an Everest Motoring affiliate and start earning competitive commissions on premium pre-owned vehicle sales.",
};

export default async function RegisterPage({ searchParams }) {
    const params = await searchParams;
    const error = params?.error;
    const message = params?.message;

    return (
        <div className="min-h-[calc(100vh-80px)] bg-slate-50 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">

                <div className="bg-slate-950 p-8 text-center border-b-4 border-primary">
                    <h1 className="text-3xl font-bold text-white mb-2">Affiliate Application</h1>
                    <p className="text-slate-400">Join South Africa's premium pre-owned vehicle network.</p>
                </div>

                <div className="p-8 md:p-10">
                    {/* Feedback Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
                            <Icon name="error" className="shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3">
                            <Icon name="check_circle" className="shrink-0" />
                            <p className="text-sm font-medium">{message}</p>
                        </div>
                    )}

                    <form className="space-y-6" action="/auth/register" method="POST">


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    required
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    required
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Phone Number</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Tracking Configuration</h3>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Desired Affiliate Code</label>
                                <p className="text-xs text-slate-500 mb-3">This will be used to generate your tracking links (e.g. ?ref=YOURCODE).</p>
                                <input
                                    type="text"
                                    name="affiliateCode"
                                    required
                                    pattern="[A-Za-z0-9\-]+"
                                    title="Letters, numbers and hyphens only. No spaces."
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all uppercase"
                                    placeholder="e.g. JOHN10"
                                    style={{ textTransform: 'uppercase' }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Account Security</h3>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    minLength={8}
                                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    placeholder="Minimum 8 characters"
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button type="submit" className="w-full bg-secondary hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-lg shadow-md transition-all text-lg">
                                Submit Application
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <p className="text-sm text-slate-500">
                            Already have an account? <a href="/login" className="text-primary-ink font-bold hover:underline">Sign In Instead</a>
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
