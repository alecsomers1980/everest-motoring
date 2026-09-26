import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import VehicleForm from "../../VehicleForm";

export const metadata = {
    title: "Edit Vehicle | Everest Admin",
};

export default async function EditVehiclePage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch the existing vehicle data
    const { data: car, error } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !car) {
        notFound();
    }

    return (
        <div className="p-8 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-200">
                <a href="/admin/inventory" className="text-slate-400 hover:text-slate-900 transition-colors flex items-center bg-white rounded-full p-2 shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                </a>
                <h1 className="text-3xl font-bold text-slate-900">Edit Vehicle: {car.year} {car.make} {car.model}</h1>
            </div>

            <div className="p-8 max-w-3xl mx-auto w-full">
                <VehicleForm initialData={car} />
            </div>
        </div>
    );
}
