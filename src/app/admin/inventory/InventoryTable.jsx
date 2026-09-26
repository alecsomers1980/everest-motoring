"use client";

import { useState } from "react";
import Link from "next/link";
import { Car, FileImage, Pencil, Search, Share2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import AiVideoStatus from "./AiVideoStatus";
import VideoApprovalBadge from "./VideoApprovalBadge";
import SocialPostButton from "./SocialPostButton";
import MarkSoldButton from "./MarkSoldButton";
import SeoFixButton from "./SeoFixButton";
import DeleteVehicleButton from "./DeleteVehicleButton";
import { Surface } from "@/components/ui/Surface";

export default function InventoryTable({ initialCars, deleteCarAction }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [makeFilter, setMakeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("active_only");
    const [featureFilter, setFeatureFilter] = useState("");

    // Extract unique makes and features for dropdowns
    const uniqueMakes = [...new Set(initialCars.map(c => c.make))].filter(Boolean).sort();

    // Extract all unique features for the dropdown
    const allFeatures = initialCars.reduce((acc, car) => {
        if (car.features && Array.isArray(car.features)) {
            car.features.forEach(f => acc.add(f));
        }
        return acc;
    }, new Set());
    const uniqueFeatures = [...allFeatures].sort();

    // Filter logic
    const filteredCars = initialCars.filter(car => {
        // Text Search (Model, Year, Description)
        const searchString = `${car.year} ${car.make} ${car.model} ${car.description || ""}`.toLowerCase();
        const matchesSearch = searchString.includes(searchTerm.toLowerCase());

        // Make Filter
        const matchesMake = makeFilter ? car.make === makeFilter : true;

        // Status Filter
        let matchesStatus = true;
        if (statusFilter === "active_only") {
            // Hide old sold cars if not actively searching
            if (!searchTerm && car.status === "sold") {
                const soldAtStr = car.sales?.[0]?.sold_at;
                if (soldAtStr) {
                    const soldAtDate = new Date(soldAtStr);
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    if (soldAtDate < thirtyDaysAgo) {
                        matchesStatus = false;
                    }
                } else {
                    matchesStatus = false; // If no date, hide it to be safe
                }
            }
        } else if (statusFilter) {
            matchesStatus = car.status === statusFilter;
        }

        // Feature Filter
        const matchesFeature = featureFilter ? (car.features && car.features.includes(featureFilter)) : true;

        return matchesSearch && matchesMake && matchesStatus && matchesFeature;
    });

    const selectClass =
        "w-full px-3.5 py-2.5 bg-white border border-hairline rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 appearance-none cursor-pointer transition-colors";

    return (
        <div className="space-y-6">
            {/* Search and filters */}
            <Surface className="p-5 flex flex-col lg:flex-row gap-3 relative z-10">
                <div className="flex-1 relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by model, year, or keyword"
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-hairline rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[540px]">
                    <select className={selectClass} value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)}>
                        <option value="">All makes</option>
                        {uniqueMakes.map(make => (
                            <option key={make} value={make}>{make}</option>
                        ))}
                    </select>

                    <select className={selectClass} value={featureFilter} onChange={(e) => setFeatureFilter(e.target.value)}>
                        <option value="">All features</option>
                        {uniqueFeatures.map(feature => (
                            <option key={feature} value={feature}>{feature}</option>
                        ))}
                    </select>

                    <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="active_only">Active &amp; recent</option>
                        <option value="">Show all</option>
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="sold">Sold</option>
                    </select>
                </div>
            </Surface>

            <p className="text-sm text-slate-500">
                <span className="font-medium text-slate-900">{filteredCars.length}</span>{" "}
                {filteredCars.length === 1 ? "vehicle" : "vehicles"}
            </p>

            {/* Table. Wrapped so it scrolls rather than breaking the layout on narrow screens. */}
            <Surface className="overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[860px]">
                    <thead>
                        <tr className="border-b border-hairline text-label font-semibold uppercase text-slate-500">
                            <th className="py-4 px-6 w-[188px] font-semibold">Image</th>
                            <th className="py-4 px-6 w-[32%] font-semibold">Vehicle</th>
                            <th className="py-4 px-6 w-[150px] whitespace-nowrap font-semibold">Price</th>
                            <th className="py-4 px-6 w-[170px] font-semibold">Status</th>
                            <th className="py-4 px-6 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-hairline">
                        {(() => {
                            const renderRow = (car) => (
                                <tr key={car.id} className="group/row hover:bg-slate-50/70 transition-colors align-top">
                                    <td className="py-5 px-6">
                                        {car.main_image_url ? (
                                            <div className="w-40 h-28 overflow-hidden rounded-xl border border-hairline">
                                                <img
                                                    src={car.main_image_url}
                                                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/row:scale-105"
                                                    alt={`${car.make} ${car.model}`}
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-40 h-28 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300">
                                                <Car className="h-8 w-8" />
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-5 px-6">
                                        <p className="text-label font-semibold uppercase text-slate-400">{car.year} {car.make}</p>
                                        <p className="font-semibold text-slate-900 mt-1">{car.model}</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {new Intl.NumberFormat('en-ZA').format(car.mileage)} km · {car.transmission}
                                        </p>
                                    </td>
                                    <td className="py-5 px-6 font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                                        R {new Intl.NumberFormat('en-ZA').format(car.price)}
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col items-start gap-1.5">
                                            <span className={`inline-flex items-center px-2.5 py-1 text-label font-semibold uppercase rounded-md ${car.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                                                car.status === 'reserved' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                {car.status}
                                            </span>
                                            <AiVideoStatus carId={car.id} videoUrl={car.video_url} />
                                            <VideoApprovalBadge carId={car.id} status={car.video_approval_status} />
                                            {car.social_shared_at && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-label font-semibold uppercase rounded-md">
                                                    <Share2 className="h-3 w-3" />
                                                    Shared
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    {/* Six icon actions in a 3x2 grid rather than one long row. */}
                                    <td className="py-5 px-6">
                                        <div className="grid grid-cols-3 gap-1 justify-items-center ml-auto w-fit">
                                            <SeoFixButton car={car} />
                                            <SocialPostButton car={car} />
                                            <MarkSoldButton car={car} />
                                            <IconButton as="a" href={`/api/admin/flyer/${car.id}`} download aria-label="Download A4 flyer" title="Download A4 Flyer">
                                                <FileImage className="h-5 w-5" />
                                            </IconButton>
                                            <IconButton as={Link} href={`/admin/inventory/edit/${car.id}`} aria-label="Edit vehicle" title="Edit Vehicle">
                                                <Pencil className="h-5 w-5" />
                                            </IconButton>
                                            <DeleteVehicleButton car={car} deleteCarAction={deleteCarAction} />
                                        </div>
                                    </td>
                                </tr>
                            );
                            const activeCars = filteredCars.filter(c => c.status !== 'sold');
                            const soldCars = filteredCars.filter(c => c.status === 'sold');
                            return (
                                <>
                                    {activeCars.map(renderRow)}
                                    {soldCars.length > 0 && (
                                        <tr key="sold-heading">
                                            <td colSpan="5" className="bg-slate-50 text-label font-semibold uppercase text-slate-500 py-3 px-6">Sold</td>
                                        </tr>
                                    )}
                                    {soldCars.map(renderRow)}
                                </>
                            );
                        })()}

                        {filteredCars.length === 0 && (
                            <tr>
                                <td colSpan="5" className="py-16 px-6 text-center text-slate-500">
                                    No vehicles match your search filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>
            </Surface>
        </div>
    );
}
