import { createClient } from "@/utils/supabase/server";
import TestDriveForm from "./TestDriveForm";
import PageBanner from "@/components/PageBanner";

export const metadata = {
    title: "Book a Test Drive | Everest Motoring White River",
    description: "Book a personalized test drive at Everest Motoring. Select your preferred vehicle, date, and time.",
};

export default async function BookTestDrivePage() {
    const supabase = await createClient();
    const { data: cars } = await supabase
        .from("cars")
        .select("id, make, model, year, price")
        .eq("status", "available")
        .order("created_at", { ascending: false });

    return (
        <div className="bg-background-light min-h-screen">
            <PageBanner
                title="Book a Test Drive"
                subtitle="Experience the Everest difference. Choose your preferred vehicle and we will have it ready for you."
            />

            <section className="py-20 px-4 lg:px-12">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 md:p-12 border border-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">Request your Appointment</h2>
                    <TestDriveForm availableCars={cars || []} />
                </div>
            </section>
        </div>
    );
}
