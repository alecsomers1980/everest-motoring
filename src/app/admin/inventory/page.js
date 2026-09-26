import { createClient, createAdminClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import AiVideoStatus from "./AiVideoStatus";
import InventoryTable from "./InventoryTable";
import SeoBatchButton from "./SeoBatchButton";
import { pingDeletedVehicle } from "./seo_actions";
import { deleteStreamFromVideoUrl } from "@/utils/ai/cloudflareStreamService";
import Link from "next/link";
import { Rule } from "@/components/ui/Surface";

export const metadata = {
    title: "Admin Dashboard | Everest Motoring",
};

// Server Actions invoked from this page (the AI walkaround pipeline in
// ai_actions.js) can run long — ingestMuxAction polls Cloudflare Stream for
// up to 180s. Next.js derives a Server Action's timeout from the page it is
// invoked from, so the limit must be set HERE, not only on the admin layout.
// Without it the action runs under the 60s Pro default and a slow Cloudflare
// MP4 render returns a 504, surfacing to the client as the opaque
// "An unexpected response was received from the server." error.
export const maxDuration = 300;

export default async function AdminDashboardPage() {
    const supabase = await createClient();

    // Authentication is handled globally by src/app/admin/layout.js

    // Server Action to delete a vehicle. Returns { success, error } so the
    // client can surface the real Supabase error (e.g. foreign-key violations
    // from sales/leads/etc. that are blocking the delete).
    async function deleteCar(carId) {
        "use server";
        if (!carId) return { success: false, error: "No vehicle id supplied" };

        const supabaseAdmin = await createAdminClient();

        // Fetch the row first so we can build the canonical URL for IndexNow after delete
        // and clean up the Cloudflare Stream entry once the row is gone.
        const { data: car } = await supabaseAdmin
            .from("cars")
            .select("id, make, model, year, price, video_url")
            .eq("id", carId)
            .single();

        // Log the deletion event before the row is gone, so the monthly
        // report can count deletions.  Wrap in its own try/catch so a
        // logging failure never blocks the actual delete.
        try {
            await supabaseAdmin.from("car_events").insert({
                event: "deleted",
                car_id: car?.id || carId,
                make: car?.make || null,
                model: car?.model || null,
                year: car?.year || null,
                price: car?.price || null,
            });
        } catch (logErr) {
            console.warn("car_events insert failed (non-fatal):", logErr);
        }

        const { error } = await supabaseAdmin.from("cars").delete().eq("id", carId);

        if (error) {
            console.error("Error deleting car:", error);
            return {
                success: false,
                error: `${error.code || ""} ${error.message || "Unknown error"}${error.details ? ` — ${error.details}` : ""}`.trim(),
            };
        }

        revalidatePath("/admin/inventory");
        revalidatePath("/inventory"); // Wipe the public cache too
        if (car) {
            pingDeletedVehicle(car).catch((err) => console.warn("IndexNow ping failed:", err));
            deleteStreamFromVideoUrl(car.video_url).catch((err) => console.warn("CF Stream cleanup failed:", err));
        }
        return { success: true };
    }

    // Fetch all cars (including reserved/sold for admin view)
    const { data: cars } = await supabase
        .from('cars')
        .select('*, sales(sold_at)')
        .order('created_at', { ascending: false });

    return (
        <div className="px-6 py-12 lg:px-10 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end mb-10 gap-6 flex-wrap">
                <div>
                    <Rule className="mb-5" />
                    <h1 className="text-display-sm font-semibold text-slate-900">Inventory</h1>
                    <p className="text-slate-500 mt-2">Showroom listings and vehicle status.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <SeoBatchButton />
                    <Link href="/admin/sales" className="bg-white border border-hairline hover:border-slate-400 transition-colors px-5 py-2.5 rounded-lg text-sm font-medium text-slate-900 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">sell</span>
                        Off-inventory sale
                    </Link>
                    <Link href="/admin/inventory/add" className="bg-slate-900 hover:bg-slate-800 transition-colors px-5 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Add vehicle
                    </Link>
                </div>
            </div>

            <InventoryTable initialCars={cars || []} deleteCarAction={deleteCar} />
        </div>
    );
}
