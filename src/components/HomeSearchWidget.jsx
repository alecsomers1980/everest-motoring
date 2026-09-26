"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

export default function HomeSearchWidget({
    makes = ["BMW", "Mercedes-Benz", "Audi", "Toyota", "Volkswagen", "Ford", "Porsche"]
}) {
    const router = useRouter();
    const [make, setMake] = useState("");
    const [model, setModel] = useState("");
    const [maxPrice, setMaxPrice] = useState("");

    const handleSearch = (e) => {
        e.preventDefault();

        const params = new URLSearchParams();
        if (make && make !== "Any Make") params.append("make", make);
        if (model) params.append("model", model);
        if (maxPrice && maxPrice !== "No Limit") {
            const numericPrice = maxPrice.replace(/\D/g, "");
            if (numericPrice) params.append("maxPrice", numericPrice);
        }

        const queryString = params.toString();
        router.push(queryString ? `/inventory?${queryString}` : "/inventory");
    };

    return (
        <form onSubmit={handleSearch} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Make</label>
                <select
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-8 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="">Any Make</option>
                    {makes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <div className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400">
                    <Icon name="expand_more" className="text-lg" />
                </div>
            </div>
            <div className="relative">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Model</label>
                <input
                    type="text"
                    placeholder="Any Model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
            </div>
            <div className="relative">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">Max Price</label>
                <select
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 pr-8 text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value="">No Limit</option>
                    <option value="R 200,000">R 200,000</option>
                    <option value="R 500,000">R 500,000</option>
                    <option value="R 800,000">R 800,000</option>
                    <option value="R 1,000,000">R 1,000,000</option>
                    <option value="R 1,500,000">R 1,500,000</option>
                    <option value="R 2,000,000">R 2,000,000</option>
                </select>
                <div className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400">
                    <Icon name="expand_more" className="text-lg" />
                </div>
            </div>
            <div className="flex items-end">
                <button type="submit" className="flex h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-black shadow-lg shadow-primary/25 transition-colors hover:bg-primary-dark">
                    <Icon name="search" /> Search Vehicles
                </button>
            </div>
        </form>
    );
}
