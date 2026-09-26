import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import InventoryFilter from "./InventoryFilter";
import InventorySort from "./InventorySort";
import { altForImage } from "@/utils/ai/seoGenerator";
import { getVehiclePath } from "@/utils/url/vehicleUrl";
import { calculateMonthly, formatRand } from "@/utils/finance/calculator";
import Icon from "@/components/Icon";

export const metadata = {
    title: "Inventory | Everest Motoring",
    description: "Browse our exclusive collection of premium pre-owned, accident-free vehicles.",
};

export default async function InventoryPage({ searchParams }) {
    const supabase = await createClient();

    // Await searchParams for Next.js 15+ compatibility
    const params = await searchParams || {};
    const { make, model, maxPrice, transmission, fuel_type, features } = params;

    let query = supabase
        .from("cars")
        .select("*, sales(sold_at)");
        
    // We cannot easily do complex OR conditions with joined tables in Supabase JS, 
    // so we fetch available and sold, then filter in memory for the 1-week rule.
    query = query.in("status", ["available", "sold"]);

    if (make) query = query.ilike('make', `%${make}%`);
    if (model) query = query.ilike('model', `%${model}%`);
    if (maxPrice) query = query.lte('price', Number(maxPrice));

    if (transmission) {
        const transArr = Array.isArray(transmission) ? transmission : [transmission];
        query = query.in('transmission', transArr);
    }
    if (fuel_type) {
        const fuelArr = Array.isArray(fuel_type) ? fuel_type : [fuel_type];
        query = query.in('fuel_type', fuelArr);
    }
    if (features) {
        const featArr = Array.isArray(features) ? features : [features];
        query = query.contains('features', featArr);
    }

    const { data: allCars, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching vehicles:", error.message || error, JSON.stringify(error));
    }

    // Keep sold cars visible (with the SOLD banner) for 2 weeks, then drop them.
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const filteredCars = (allCars || []).filter(car => {
        if (car.status === "available") return true;
        if (car.status === "sold") {
            const soldAtStr = car.sales?.[0]?.sold_at;
            if (!soldAtStr) return false; // If marked sold but no sale record, hide it as a fallback
            const soldAtDate = new Date(soldAtStr);
            return soldAtDate >= twoWeeksAgo;
        }
        return false;
    });

    // Available stock always ranks above the recently-sold cars we keep on show.
    const SORTERS = {
        price_asc: (a, b) => (a.price || 0) - (b.price || 0),
        price_desc: (a, b) => (b.price || 0) - (a.price || 0),
        mileage_asc: (a, b) => (a.mileage || 0) - (b.mileage || 0),
        year_desc: (a, b) => (b.year || 0) - (a.year || 0),
    };
    const sorter = SORTERS[params.sort];
    const cars = sorter
        ? [...filteredCars].sort((a, b) => {
            if (a.status !== b.status) return a.status === "available" ? -1 : 1;
            return sorter(a, b);
        })
        : filteredCars;

    return (
        <div className="bg-background-alt min-h-screen">
            <PageBanner
                title="Our Premium Fleet"
                subtitle="Browse our exclusive collection of 100-point checked vehicles."
            />
            <div className="py-16 px-4 lg:px-12">
                <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-8">

                    {/* Filter Sidebar */}
                    <div className="w-full lg:w-[300px] flex-shrink-0 z-10">
                        <InventoryFilter />
                    </div>

                    {/* Main Content Grid */}
                    <div className="w-full flex-1 flex flex-col min-w-0">
                        <InventorySort count={cars.length} />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">

                            {cars && cars.map((car) => (
                                <Link
                                    key={car.id}
                                    href={getVehiclePath(car)}
                                    className="group bg-white rounded-2xl overflow-hidden border border-hairline hover:border-slate-300 transition-colors duration-300 flex flex-col"
                                >
                                    {/* Thumbnail Area */}
                                    <div className="relative aspect-[4/3] bg-black overflow-hidden">
                                        {car.main_image_url ? (
                                            <Image
                                                src={car.main_image_url}
                                                alt={altForImage(car, car.main_image_url, 0, 1)}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-700">
                                                <Icon name="directions_car" className="text-4xl" />
                                            </div>
                                        )}

                                        {/* Status Badge / Sold band */}
                                        {car.status === 'sold' ? (
                                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] py-3 bg-black/70 shadow-lg rotate-[-34deg] text-center">
                                                    <span className="text-primary font-black text-2xl tracking-[0.3em] uppercase">Sold</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="absolute top-4 left-4">
                                                <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm text-slate-700 text-label font-semibold uppercase rounded-md">
                                                    {car.status === 'available' ? 'Available' : 'Reserved'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Area */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="mb-5">
                                            <p className="text-label font-semibold uppercase text-slate-400 mb-1.5">
                                                {car.year} {car.make}
                                            </p>
                                            <h2 className="text-lg font-semibold leading-snug text-slate-900">
                                                {car.model}
                                            </h2>
                                        </div>

                                        <div className="mt-auto">
                                            {/* Three facts, plain text. Drivetrain, colour and
                                                warranty live on the detail page. */}
                                            <p className="text-sm text-slate-500 mb-5 pb-5 border-b border-hairline">
                                                {[
                                                    `${new Intl.NumberFormat('en-ZA').format(car.mileage)} km`,
                                                    car.transmission === 'Automatic' ? 'Auto' : 'Manual',
                                                    car.fuel_type,
                                                ].filter(Boolean).join(' · ')}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold text-2xl text-slate-900 tracking-display whitespace-nowrap">
                                                        R {new Intl.NumberFormat('en-ZA').format(car.price)}
                                                    </div>
                                                    {car.status === 'available' && (
                                                        <div className="mt-1 text-sm text-slate-500">
                                                            from {formatRand(calculateMonthly({ price: Number(car.price) || 0 }).monthly)} p/m
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors text-slate-400">
                                                    <Icon name="arrow_forward" className="text-[20px]" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}

                            {(!cars || cars.length === 0) && (
                                <div className="col-span-full py-24 text-center">
                                    <Icon name="inventory_2" className="text-6xl text-slate-300 mb-4 block" />
                                    <p className="text-slate-500 text-lg">Our showroom is currently being updated with new premium stock.</p>
                                    <p className="text-slate-400">Please check back again soon.</p>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
