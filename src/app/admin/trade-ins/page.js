import { createClient } from "@/utils/supabase/server";
import TradeInStatusSelector from "./TradeInStatusSelector";
import TradeInsTable from "./TradeInsTable";

export const metadata = {
    title: "Trade-In Requests | Everest Admin",
};

export default async function TradeInsPage() {
    const supabase = await createClient();

    // Fetch all Trade-In Requests
    const { data: requests } = await supabase
        .from('value_my_car_requests')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="p-8 max-w-7xl mx-auto w-full text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-black">Trade-In <span className="italic">Valuations</span></h1>
                    <p className="text-slate-400 mt-1 font-medium">Review customer requests from the "Value My Car" landing page.</p>
                </div>
            </div>

            <TradeInsTable initialRequests={requests || []} />
        </div>
    );
}
