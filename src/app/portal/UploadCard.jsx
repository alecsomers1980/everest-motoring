"use client";

import { useState, useRef } from "react";
import { uploadClientDocument } from "./actions";

export default function UploadCard({ leadId, documentType, label, status }) {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const formRef = useRef(null);

    const handleUpload = async (formData) => {
        setIsUploading(true);
        setError(null);

        const result = await uploadClientDocument(formData);

        if (result?.error) {
            setError(result.error);
        } else {
            formRef.current?.reset();
        }
        setIsUploading(false);
    };

    const isPending = status === 'pending' || status === 'rejected';

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
            <div>
                <h3 className="font-bold text-slate-900">{label}</h3>
                <p className="text-sm text-slate-500 mt-1">
                    {status === 'pending' && "Awaiting secure upload."}
                    {status === 'uploaded' && "File received. Under review by our team."}
                    {status === 'approved' && "Document verified."}
                    {status === 'rejected' && "File rejected. Please re-upload a clear copy."}
                </p>
                {error && <p className="text-sm text-red-500 mt-2 bg-red-50 p-2 rounded">{error}</p>}
            </div>

            <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
                {isPending ? (
                    <form ref={formRef} action={handleUpload} className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <input type="hidden" name="leadId" value={leadId} />
                        <input type="hidden" name="documentType" value={documentType} />
                        <input
                            type="file"
                            name="file"
                            disabled={isUploading}
                            className="bg-slate-50 border border-slate-200 rounded text-sm file:mr-4 file:py-2.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-bold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 w-full sm:w-64 cursor-pointer focus:outline-none"
                            required
                        />
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 font-bold rounded shadow transition-colors flex items-center justify-center gap-2 whitespace-nowrap disabled:bg-slate-400"
                        >
                            {isUploading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                                    Uploading
                                </>
                            ) : (
                                "Submit"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className={`px-4 py-2.5 rounded justify-center flex items-center gap-2 text-sm font-bold w-full sm:w-auto border ${status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        <span className="material-symbols-outlined text-[18px]">
                            {status === 'approved' ? 'check_circle' : 'hourglass_empty'}
                        </span>
                        {status === 'approved' ? 'Verified' : 'Under Review'}
                    </div>
                )}
            </div>
        </div>
    );
}
