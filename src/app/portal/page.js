import { createClient } from "@/utils/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import UploadCard from "./UploadCard";
import FinancingDetailsForm from "./FinancingDetailsForm";

export const metadata = { title: "Dashboard | Client Portal" };

const REQUIRED_DOCS = [
    { type: 'id_copy', label: 'South African ID (Front & Back)' },
    { type: 'proof_of_address', label: 'Proof of Address (Utility Bill)' },
    { type: 'payslip_1', label: 'Most Recent Payslip' },
    { type: 'payslip_2', label: 'Payslip 2 (Last Month)' },
    { type: 'payslip_3', label: 'Payslip 3 (2 Months Ago)' },
    { type: 'bank_statement_3_months', label: '3 Months Bank Statements (PDF)' },
    { type: 'drivers_license', label: 'Valid Drivers License' }
];

export default async function PortalDashboard() {
    const supabaseUserClient = await createClient();
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) return redirect("/login");

    // Bypass RLS using the Service Role Key since client roles don't have read access to 'leads'.
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: lead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select(`
            *,
            cars ( make, model, year, main_image_url, price ),
            profiles:affiliate_id ( first_name, last_name, phone )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (leadError) console.error("Portal Lead Fetch Error:", leadError);

    if (!lead) {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center mt-12 mb-20">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">folder_off</span>
                <h2 className="text-2xl font-bold text-slate-800">No Active Deal Found</h2>
                <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
                    Your dedicated sales executive has not yet linked a vehicle to your profile. Please check back later or contact the dealership.
                </p>
            </div>
        );
    }

    const { data: docs } = await supabaseAdmin
        .from('lead_documents')
        .select('*')
        .eq('client_id', user.id)
        .eq('lead_id', lead.id);

    // Helper map to quickly find document status (pending, uploaded, approved, rejected)
    const docStatusMap = {};
    docs?.forEach(d => { docStatusMap[d.document_type] = d.status; });

    const totalRequired = REQUIRED_DOCS.length;
    const totalUploaded = REQUIRED_DOCS.filter(d => ['uploaded', 'approved'].includes(docStatusMap[d.type])).length;

    // Overall Progress calculation incorporates the onboarding steps
    let progressPercent = 0;
    if (lead.onboarding_step === 1) {
        progressPercent = 10; // Started
    } else if (lead.onboarding_step >= 2) {
        // Step 1 completed gives 30% base. Remaining 70% is documents.
        const docProgress = (totalUploaded / totalRequired) * 70;
        progressPercent = Math.round(30 + docProgress);
    }

    // Default to Step 1 if null
    const currentStep = lead.onboarding_step || 1;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto py-8">

            {/* Visual Stepper */}
            <div className="mb-8 hidden md:block">
                <div className="flex items-center justify-between relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-1000"
                        style={{ width: currentStep === 1 ? '0%' : currentStep === 2 && progressPercent < 100 ? '50%' : '100%' }}
                    ></div>

                    <div className={`relative z-10 flex flex-col items-center gap-2 ${currentStep >= 1 ? 'text-primary-ink' : 'text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 bg-white ${currentStep >= 1 ? 'border-primary' : 'border-slate-300'}`}>
                            {currentStep > 1 ? <span className="material-symbols-outlined">check</span> : '1'}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Details</span>
                    </div>

                    <div className={`relative z-10 flex flex-col items-center gap-2 ${currentStep >= 2 ? 'text-primary-ink' : 'text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 bg-white ${currentStep >= 2 ? 'border-primary' : 'border-slate-300'}`}>
                            {progressPercent === 100 ? <span className="material-symbols-outlined">check</span> : '2'}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Documents</span>
                    </div>

                    <div className={`relative z-10 flex flex-col items-center gap-2 ${progressPercent === 100 ? 'text-primary-ink' : 'text-slate-400'}`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg border-2 bg-white ${progressPercent === 100 ? 'border-primary' : 'border-slate-300'}`}>
                            {progressPercent === 100 ? <span className="material-symbols-outlined">check</span> : '3'}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider">Approval</span>
                    </div>
                </div>
            </div>

            {/* Header / Car Intro */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 flex flex-col md:flex-row">
                {lead.cars?.main_image_url ? (
                    <img src={lead.cars.main_image_url} className="w-full md:w-1/3 h-56 md:h-auto object-cover" alt="Car" />
                ) : (
                    <div className="w-full md:w-1/3 h-56 flex items-center justify-center bg-slate-100 text-slate-300 border-r border-slate-100">
                        <span className="material-symbols-outlined text-5xl">directions_car</span>
                    </div>
                )}

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-center">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
                        <div>
                            <p className="text-xs font-bold text-primary-ink uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">local_mall</span>
                                Your Vehicle Deal
                            </p>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{lead.cars?.year} {lead.cars?.make} {lead.cars?.model}</h1>

                            {/* Assigned Affiliate / Status */}
                            <div className="mt-4 flex flex-wrap gap-3">
                                {lead.profiles ? (
                                    <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded text-sm font-medium">
                                        <span className="material-symbols-outlined text-[16px]">support_agent</span>
                                        Agent: {lead.profiles.first_name} {lead.profiles.last_name}
                                    </div>
                                ) : (
                                    <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded text-sm font-medium">
                                        <span className="material-symbols-outlined text-[16px]">support_agent</span>
                                        Everest Internal Team
                                    </div>
                                )}

                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold uppercase tracking-wider ${lead.status === 'new' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    lead.status === 'contacted' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                        lead.status === 'finance_pending' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                            lead.status === 'closed_won' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                    Status: {lead.status.replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                        <span className="text-xl font-bold text-slate-700 bg-slate-50 border border-slate-200 px-4 py-2 rounded shadow-sm self-start whitespace-nowrap">
                            R {new Intl.NumberFormat('en-ZA').format(lead.cars?.price || 0)}
                        </span>
                    </div>

                    <div className="mt-auto">
                        <div className="flex justify-between text-sm font-bold mb-3">
                            <span className="text-slate-700 uppercase tracking-wider text-xs">Application Progress</span>
                            <span className="text-primary-ink">{progressPercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                            <div className="bg-primary h-3 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <p className="text-slate-500 mt-4 text-sm bg-slate-50 p-3 rounded border border-slate-100">
                            {progressPercent === 100
                                ? "🎉 All information received. We are processing your finance application with the banks. We will be in touch shortly!"
                                : currentStep === 1
                                    ? "Please complete your financing details below to proceed."
                                    : `Please upload the ${totalRequired - totalUploaded} remaining documents below.`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step Content */}
            {currentStep === 1 ? (
                <FinancingDetailsForm leadId={lead.id} />
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-6 mt-12 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary-ink shrink-0">
                            <span className="material-symbols-outlined">lock</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Required Finance Documents</h2>
                            <p className="text-sm text-slate-500">Upload clear, readable copies of the documents below to secure your financing.</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-20">
                        {REQUIRED_DOCS.map(doc => (
                            <UploadCard
                                key={doc.type}
                                leadId={lead.id}
                                documentType={doc.type}
                                label={doc.label}
                                status={docStatusMap[doc.type] || 'pending'}
                            />
                        ))}
                    </div>
                </>
            )}

        </div>
    );
}
