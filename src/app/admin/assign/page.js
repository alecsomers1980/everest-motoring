import { createClient } from "@/utils/supabase/server";
import AssignClientUI from "./AssignClientUI";

export const metadata = {
    title: "Assign Vehicle | Everest Admin",
};

export default async function AssignPage() {
    const supabase = await createClient();

    // Fetch clients
    const { data: clients, error: clientsErr } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, role')
        .eq('role', 'client')
        .order('created_at', { ascending: false });

    // Fetch available vehicles
    const { data: vehicles, error: vehiclesErr } = await supabase
        .from('cars')
        .select('id, make, model, year, price, status')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

    // Fetch current active assigned vehicles (leads)
    const { data: activeLeads, error: leadsErr } = await supabase
        .from('leads')
        .select(`
            id,
            client_name,
            client_phone,
            status,
            created_at,
            cars ( id, make, model, year, price )
        `)
        .neq('status', 'closed_won')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-black">Assign <span className="italic">Vehicle</span></h1>
                    <p className="text-slate-500 mt-1 font-medium">Assign an available vehicle to a registered client to link it to their portal.</p>
                </div>
            </div>

            <AssignClientUI
                clients={clients || []}
                vehicles={vehicles || []}
                activeAssigns={activeLeads || []}
            />
        </div>
    );
}
