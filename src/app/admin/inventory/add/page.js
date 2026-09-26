import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import VehicleForm from "../VehicleForm";

export const metadata = {
    title: "Add Vehicle | Everest Admin",
};

export default async function AddVehiclePage() {

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-200">
                <a href="/admin/inventory" className="text-slate-400 hover:text-slate-900 transition-colors flex items-center bg-white rounded-full p-2 shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </a>
                <h1 className="text-3xl font-bold text-slate-900">Add New Vehicle</h1>
            </div>

            <VehicleForm />
        </div>
    );
}
