import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();

    const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false });

    return Response.json({
        cars: { data: carsData, error: carsError },
        errorDetails: carsError ? JSON.stringify(carsError) : null
    });
}
