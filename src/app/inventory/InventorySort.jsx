"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export const SORT_OPTIONS = [
    { value: "newest", label: "Newest arrivals" },
    { value: "price_asc", label: "Price: low to high" },
    { value: "price_desc", label: "Price: high to low" },
    { value: "mileage_asc", label: "Mileage: lowest first" },
    { value: "year_desc", label: "Year: newest first" },
];

export default function InventorySort({ count }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const current = searchParams.get("sort") || "newest";

    function handleChange(e) {
        const params = new URLSearchParams(searchParams.toString());
        if (e.target.value === "newest") params.delete("sort");
        else params.set("sort", e.target.value);
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-900">{count}</span>{" "}
                {count === 1 ? "vehicle" : "vehicles"} available
            </p>
            <div className="flex items-center gap-2">
                <label htmlFor="inventory-sort" className="text-sm font-medium text-slate-500">
                    Sort by
                </label>
                <select
                    id="inventory-sort"
                    value={current}
                    onChange={handleChange}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                    {SORT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
