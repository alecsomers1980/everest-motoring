"use client";

import React, { useState } from "react";
import { inviteClientAction } from "./actions";
import LeadStatusSelector from "./LeadStatusSelector";

export default function LeadsTable({ initialLeads }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("active_only");
    const [expandedRows, setExpandedRows] = useState([]);

    const toggleExpand = (id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]
        );
    };

    // Filter logic
    const filteredLeads = initialLeads.filter(lead => {
        // Text Search
        const carDetails = lead.cars ? `${lead.cars.year} ${lead.cars.make} ${lead.cars.model}` : "";
        const searchString = `${lead.client_name} ${lead.client_phone} ${lead.client_email || ""} ${carDetails}`.toLowerCase();
        const matchesSearch = searchString.includes(searchTerm.toLowerCase());

        // Status Filter
        let matchesStatus = true;
        if (statusFilter === "active_only") {
            // Hide closed if no search term, but if searched, show them
            if (!searchTerm) {
                matchesStatus = !["closed_won", "closed_lost"].includes(lead.status);
            }
        } else if (statusFilter) {
            matchesStatus = lead.status === statusFilter;
        }

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8">
            {/* Search and Filters Bar */}
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-white/10 flex flex-col md:flex-row gap-4 relative z-10">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-slate-500">search</span>
                    <input
                        type="text"
                        placeholder="Search by client name, email, phone, or vehicle..."
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full md:w-56">
                    <select
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none cursor-pointer hover:bg-slate-100 transition-all font-bold"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="active_only">Filter: Active Inquiries</option>
                        <option value="">Show All (Including Closed)</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="document_collection">Document Collection</option>
                        <option value="finance_pending">Finance Pending</option>
                        <option value="closed_won">Closed Won</option>
                        <option value="closed_lost">Closed Lost</option>
                    </select>
                </div>
            </div>

            {/* Total Results */}
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                Showing {filteredLeads.length} Inquir{filteredLeads.length !== 1 ? 'ies' : 'y'}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">
                            <th className="p-6">Client Details</th>
                            <th className="p-6">Vehicle of Interest</th>
                            <th className="p-6">Inquiry Date</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLeads.map((lead) => (
                            <React.Fragment key={lead.id}>
                                <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-slate-900 text-lg tracking-tight">{lead.client_name}</p>
                                        <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                            <span className="material-symbols-outlined text-[16px] text-primary-ink">call</span>
                                            {lead.client_phone}
                                        </p>
                                        {lead.client_email && (
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1 font-medium">
                                                <span className="material-symbols-outlined text-[16px] text-primary-ink">mail</span>
                                                {lead.client_email}
                                            </p>
                                        )}
                                        <div className="mt-3">
                                            {lead.profiles ? (
                                                <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[14px]">link</span>
                                                    Ref: {lead.profiles.first_name} {lead.profiles.last_name} ({lead.profiles.affiliate_code})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-500 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[14px]">public</span>
                                                    Organic Direct
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {lead.cars ? (
                                            <div className="flex items-center gap-3">
                                                {lead.cars.main_image_url ? (
                                                    <img src={lead.cars.main_image_url} className="w-12 h-10 object-cover rounded shadow-sm border border-slate-200" alt="Car" />
                                                ) : (
                                                    <div className="w-12 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-300">
                                                        <span className="material-symbols-outlined text-sm">directions_car</span>
                                                    </div>
                                                )}
                                                <div>
                                                    <a href={`/inventory/${lead.car_id}`} target="_blank" className="font-bold text-primary-ink hover:underline block">
                                                        {lead.cars.year} {lead.cars.make} {lead.cars.model}
                                                    </a>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">R {new Intl.NumberFormat('en-ZA').format(lead.cars.price)}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Vehicle no longer found</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-sm text-slate-600 text-nowrap">
                                        {new Date(lead.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="p-4">
                                        <LeadStatusSelector leadId={lead.id} currentStatus={lead.status} />
                                    </td>
                                    <td className="p-4 flex flex-col items-end gap-2 text-right">

                                        {lead.lead_documents && lead.lead_documents.length > 0 && (
                                            <button
                                                onClick={() => toggleExpand(lead.id)}
                                                className="bg-slate-800 text-white hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1 shadow-sm w-full max-w-[160px]"
                                            >
                                                <span className="material-symbols-outlined text-[16px]">
                                                    {expandedRows.includes(lead.id) ? 'folder_open' : 'folder'}
                                                </span>
                                                {expandedRows.includes(lead.id) ? 'Hide Docs' : `View Docs (${lead.lead_documents.length})`}
                                            </button>
                                        )}

                                        <a
                                            href={`https://wa.me/${lead.client_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${lead.client_name}, this is Everest Motoring reaching out regarding your inquiry for the ${lead.cars?.year || ''} ${lead.cars?.make || ''} ${lead.cars?.model || ''}. How can we help you today?`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors px-3 py-1.5 rounded-md font-medium text-sm flex items-center justify-center gap-1 w-full max-w-[160px]"
                                        >
                                            <svg className="w-[18px] h-[18px] fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                            </svg>
                                            WhatsApp
                                        </a>

                                        <a href={`tel:${lead.client_phone}`} className="bg-primary/10 text-primary-ink hover:bg-primary/20 transition-colors px-3 py-1.5 rounded-md font-medium text-sm flex items-center justify-center gap-1 w-full max-w-[160px]">
                                            <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                                            Call Client
                                        </a>

                                        {!lead.client_id && lead.client_email && lead.status !== 'finance_pending' && (
                                            <form action={inviteClientAction} className="w-full max-w-[160px]">
                                                <input type="hidden" name="leadId" value={lead.id} />
                                                <input type="hidden" name="clientName" value={lead.client_name} />
                                                <input type="hidden" name="clientEmail" value={lead.client_email} />
                                                <button type="submit" className="w-full bg-slate-800 text-white hover:bg-slate-700 transition-colors px-3 py-1.5 rounded-md font-medium text-xs flex items-center justify-center gap-1 shadow-sm border border-slate-900">
                                                    <span className="material-symbols-outlined text-[14px]">vpn_key</span>
                                                    Invite & Request Docs
                                                </button>
                                            </form>
                                        )}
                                    </td>
                                </tr>

                                {/* Expanded Documents Row */}
                                {expandedRows.includes(lead.id) && lead.lead_documents && lead.lead_documents.length > 0 && (
                                    <tr className="bg-slate-50 border-t border-slate-100">
                                        <td colSpan="5" className="p-6">
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                                                <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-primary-ink">folder_open</span>
                                                    Client Uploaded Documents ({lead.lead_documents.length})
                                                </h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {lead.lead_documents.map(doc => {
                                                        // Use the signed URL generated by the server, fallback to "#" if generation failed
                                                        const fileUrl = doc.signedUrl || "#";

                                                        return (
                                                            <a
                                                                key={doc.id}
                                                                href={fileUrl}
                                                                target={doc.signedUrl ? "_blank" : "_self"}
                                                                rel="noopener noreferrer"
                                                                className="flex flex-col p-4 border border-hairline rounded-lg hover:border-slate-400 hover:shadow-sm transition-all group bg-white relative overflow-hidden"
                                                            >
                                                                {!doc.signedUrl && (
                                                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center p-4 text-center z-10">
                                                                        <span className="text-xs font-bold w-full bg-red-100 text-red-600 py-1 rounded">URL Expired / Error</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex items-start justify-between mb-2">
                                                                    <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary-ink transition-colors">
                                                                        {doc.file_path.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image'}
                                                                    </span>
                                                                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                                                        {doc.status}
                                                                    </span>
                                                                </div>
                                                                <p className="font-bold text-sm text-slate-900 truncate">
                                                                    {doc.document_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                                                </p>
                                                                <p className="text-xs text-slate-500 mt-1">
                                                                    Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                                                                </p>
                                                            </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}

                        {filteredLeads.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-12 text-center text-slate-500 bg-slate-50/50">
                                    <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">inbox</span>
                                    <p>No vehicle inquiries match your search.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
