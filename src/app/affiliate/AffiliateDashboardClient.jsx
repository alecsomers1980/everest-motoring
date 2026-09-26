"use client"

import { useState } from 'react';
import BankDetailsForm from './BankDetailsForm';

export default function AffiliateDashboardClient({ profile, leads }) {
    const [searchQuery, setSearchQuery] = useState("");

    // Filter leads based on search query (Name, Email, Phone, or Car Model)
    const filteredLeads = leads.filter(lead => {
        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase();
        const nameMatch = lead.client_name?.toLowerCase().includes(query);
        const emailMatch = lead.client_email?.toLowerCase().includes(query);
        const phoneMatch = lead.client_phone?.toLowerCase().includes(query);
        const carMatch = lead.cars ? `${lead.cars.make} ${lead.cars.model} ${lead.cars.year}`.toLowerCase().includes(query) : false;

        return nameMatch || emailMatch || phoneMatch || carMatch;
    });

    // Time calculations for Monthly Reset
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Grouping logic
    const inquiryLeads = filteredLeads.filter(l => ['new', 'contacted'].includes(l.status));
    const financingLeads = filteredLeads.filter(l => ['document_collection', 'finance_pending'].includes(l.status));

    // Completed Deals - Split by Current Month vs Archived
    const allCompletedLeads = filteredLeads.filter(l => l.status === 'closed_won');

    const completedThisMonth = allCompletedLeads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate >= startOfCurrentMonth;
    });

    const completedArchived = allCompletedLeads.filter(l => {
        const leadDate = new Date(l.created_at);
        return leadDate < startOfCurrentMonth;
    });

    // The commission rate is set per affiliate in the admin section. No rate
    // set means no rand amounts are shown to this affiliate at all.
    const commissionRate = profile.commission_per_deal;
    const showsAmounts = commissionRate != null;
    const exactCommissionOwed = showsAmounts
        ? completedThisMonth.length * Number(commissionRate)
        : null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 lg:px-12 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Your Pipeline</h1>
                    <p className="text-slate-500 mt-1">Track your referred leads, pipeline stages, and approved commissions.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Your Code:</span>
                    <span className="text-lg font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded border border-amber-100">{profile.affiliate_code || 'PENDING'}</span>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total Referrals</p>
                    <span className="text-3xl font-bold text-slate-900">{leads.length}</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-amber-500">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Busy w/ Finance</p>
                    <span className="text-3xl font-bold text-amber-600">{financingLeads.length}</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-green-500 bg-green-50/30">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2" title="Resets every month">Completed (This Month)</p>
                    <span className="text-3xl font-bold text-green-700">{completedThisMonth.length}</span>
                </div>
                <div className="bg-slate-900 p-6 rounded-xl shadow-md border-t-4 border-t-emerald-500 relative overflow-hidden">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 relative z-10 flex items-center gap-1">
                        Commissions Owed
                        {showsAmounts && (
                            <span className="material-symbols-outlined text-[14px] text-emerald-400" title={`R${new Intl.NumberFormat('en-ZA').format(commissionRate)} per completed sale THIS MONTH`}>info</span>
                        )}
                    </p>
                    {showsAmounts ? (
                        <span className="text-3xl font-bold text-white relative z-10">R {new Intl.NumberFormat('en-ZA').format(exactCommissionOwed)}</span>
                    ) : (
                        <span className="block text-sm text-slate-400 relative z-10">
                            Your commission rate hasn&apos;t been set yet — contact Everest Motoring.
                        </span>
                    )}
                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-6xl text-white/10 rotate-12">payments</span>
                </div>
            </div>

            {/* Bank Details Secure Form */}
            <BankDetailsForm
                initialBankName={profile.bank_name}
                initialAccountNumber={profile.account_number}
                initialBranchCode={profile.branch_code}
            />

            {/* Search Bar */}
            <div className="mb-8 mt-8 max-w-2xl relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                    type="text"
                    placeholder="Search referrals by name, email, phone, or car..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                )}
            </div>

            {/* Pipeline Stages */}
            <div className="space-y-8">

                <PipelineStageCard
                    title="Stage 1: Call Back Request"
                    description="Clients who have registered interest and are being contacted by our sales team."
                    leads={inquiryLeads}
                    icon="phone_in_talk"
                    colorClass="text-blue-600 bg-blue-50 border-blue-200"
                />

                <PipelineStageCard
                    title="Stage 2: Financing"
                    description="Clients actively collecting documents or awaiting bank approval."
                    leads={financingLeads}
                    icon="description"
                    colorClass="text-amber-600 bg-amber-50 border-amber-200"
                />

                <PipelineStageCard
                    title="Stage 3: Completed THIS MONTH"
                    description="Successfully closed deals this month where referral commissions are guaranteed."
                    leads={completedThisMonth}
                    icon="task_alt"
                    colorClass="text-green-600 bg-green-50 border-green-200"
                />

                {/* Archived Completed Deals */}
                {completedArchived.length > 0 && (
                    <div className="pt-8 mt-8 border-t-2 border-dashed border-slate-200">
                        <SimpleArchivedTable
                            title="Previously Completed (Archived)"
                            leads={completedArchived}
                        />
                    </div>
                )}

            </div>
        </div>
    );
}

// Helper component for Pipeline Stages
function PipelineStageCard({ title, description, leads, icon, colorClass }) {
    if (!leads || leads.length === 0) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorClass}`}>
                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                        <p className="text-sm text-slate-500">{description}</p>
                    </div>
                </div>
                <div className="font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full text-sm">
                    {leads.length} {leads.length === 1 ? 'Lead' : 'Leads'}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-white border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="p-4 font-bold w-1/4">Client Name</th>
                            <th className="p-4 font-bold w-2/4">Interest / Vehicle</th>
                            <th className="p-4 font-bold w-1/4">Status Detail</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4">
                                    <p className="font-bold text-slate-800">{lead.client_name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{new Date(lead.created_at).toLocaleDateString()}</p>
                                </td>
                                <td className="p-4">
                                    {lead.cars ? (
                                        <div className="flex items-center gap-3">
                                            {lead.cars.main_image_url && (
                                                <img src={lead.cars.main_image_url} className="w-12 h-12 object-cover rounded shadow-sm border border-slate-200" alt="Car" />
                                            )}
                                            <div>
                                                <span className="font-bold text-slate-800 block text-sm">
                                                    {lead.cars.year} {lead.cars.make} {lead.cars.model}
                                                </span>
                                                <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Price: R {new Intl.NumberFormat('en-ZA').format(lead.cars.price)}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 italic text-sm">General Inquiry</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1.5 rounded-md uppercase tracking-wider border border-slate-200 whitespace-nowrap">
                                        {lead.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Minimal Archive Table for Past Completed Deals
function SimpleArchivedTable({ title, leads }) {
    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-100/50 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-[20px]">history</span>
                <h2 className="text-md font-bold text-slate-700">{title}</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Client</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {leads.map(lead => (
                            <tr key={lead.id} className="text-slate-600">
                                <td className="px-4 py-3">
                                    {new Date(lead.created_at).toLocaleDateString('en-ZA', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">{lead.client_name}</td>
                                <td className="px-4 py-3">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">Completed</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
