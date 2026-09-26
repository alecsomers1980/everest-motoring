"use client";

import { useState } from "react";

export default function MediaKitListClient({ cars }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCars = cars.filter(car =>
        `${car.make} ${car.model}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Media Kits</h1>
                <p className="text-slate-500 mt-1">Select a vehicle below to get your tracking link, video, and branded share image.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">perm_media</span>
                        Available Inventory
                    </h2>
                    <div className="w-full sm:w-72 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                        <input
                            type="text"
                            placeholder="Search Make or Model..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    {filteredCars.map((car) => (
                        <div key={car.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shadow-sm shrink-0 relative">
                                    {car.main_image_url ? (
                                        <img src={car.main_image_url} alt={car.model} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-400">directions_car</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg leading-tight">
                                        {car.year} {car.make} {car.model}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-sm font-medium text-slate-500">
                                        <span className="text-slate-800 font-bold tracking-tight">R {new Intl.NumberFormat('en-ZA').format(car.price)}</span>
                                        {car.mileage != null && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <span>{new Intl.NumberFormat('en-ZA').format(car.mileage)} km</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <a
                                href={`/affiliate/media/${car.id}`}
                                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all shadow-sm bg-white text-slate-700 border border-slate-200 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50"
                            >
                                <span className="material-symbols-outlined text-lg">perm_media</span>
                                View Media Kit
                            </a>
                        </div>
                    ))}

                    {filteredCars.length === 0 && (
                        <div className="p-12 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">search_off</span>
                            <p className="text-slate-500 font-medium">No vehicles found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
