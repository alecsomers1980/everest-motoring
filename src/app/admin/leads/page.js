import { createClient } from "@/utils/supabase/server";
import { inviteClientAction } from "./actions";
import LeadsTable from "./LeadsTable";

export const metadata = {
    title: "Car Inquiries | Everest Admin",
};

export default async function LeadsPage() {
    const supabase = await createClient();

    const { createAdminClient } = await import("@/utils/supabase/server");
    const supabaseAdmin = await createAdminClient();

    const { data: leads } = await supabaseAdmin
        .from('leads')
        .select(`
            *,
            cars ( make, model, year, main_image_url, price ),
            profiles:affiliate_id ( first_name, last_name, affiliate_code ),
            lead_documents ( id, document_type, file_path, status, created_at )
        `)
        .order('created_at', { ascending: false });

    // Generate signed URLs for all documents to allow safe viewing of the private bucket
    if (leads) {
        // Collect all file paths
        const filePaths = [];
        leads.forEach(lead => {
            if (lead.lead_documents) {
                lead.lead_documents.forEach(doc => {
                    filePaths.push(doc.file_path);
                });
            }
        });

        if (filePaths.length > 0) {
            const { data: signedUrls, error } = await supabaseAdmin
                .storage
                .from('finance_documents')
                .createSignedUrls(filePaths, 60 * 60); // 1 hour expiry

            if (!error && signedUrls) {
                // Map the signed URLs back to the documents
                const urlMap = {};
                signedUrls.forEach(su => {
                    urlMap[su.path] = su.signedUrl;
                });

                leads.forEach(lead => {
                    if (lead.lead_documents) {
                        lead.lead_documents.forEach(doc => {
                            doc.signedUrl = urlMap[doc.file_path] || null;
                        });
                    }
                });
            } else {
                console.error("Failed to generate signed URLs:", error);
            }
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-black">Vehicle <span className="italic">Inquiries</span></h1>
                    <p className="text-slate-400 mt-1 font-medium">Manage leads generated from individual car listings.</p>
                </div>
            </div>

            <LeadsTable initialLeads={leads || []} />
        </div>
    );
}
