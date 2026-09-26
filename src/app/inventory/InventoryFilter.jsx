"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";

const CAR_FEATURES = {
    "Safety & Security": ["ABS", "Airbags", "Alarm System", "ISOFIX", "Rear Camera", "Parking Sensors", "Lane Assist", "Blind Spot Monitor"],
    "Comfort & Convenience": ["Air Conditioning", "Climate Control", "Cruise Control", "Keyless Entry", "Power Steering", "Power Windows", "Sunroof", "Leather Seats"],
    "Technology & Entertainment": ["Bluetooth", "Navigation", "Premium Audio", "Touchscreen", "Apple CarPlay", "Android Auto", "USB Ports"],
    "Exterior & Performance": ["Alloy Wheels", "Tow Bar", "Roof Rails", "Daytime Running Lights", "Xenon/LED Lights", "Fog Lights", "4WD/AWD"]
};

export default function InventoryFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // State for inputs
    const [make, setMake] = useState(searchParams.get("make") || "");
    const [model, setModel] = useState(searchParams.get("model") || "");
    const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") || "");
    const [transmission, setTransmission] = useState(searchParams.getAll("transmission") || []);
    const [fuelType, setFuelType] = useState(searchParams.getAll("fuel_type") || []);
    const [features, setFeatures] = useState(searchParams.getAll("features") || []);

    const createQueryString = useCallback(
        (name, value, isArray = false) => {
            const params = new URLSearchParams(searchParams.toString());

            if (isArray) {
                params.delete(name);
                if (Array.isArray(value)) {
                    value.forEach(v => params.append(name, v));
                }
            } else {
                if (value) {
                    params.set(name, value);
                } else {
                    params.delete(name);
                }
            }
            return params.toString();
        },
        [searchParams]
    );

    // Debounce for text inputs
    useEffect(() => {
        const timer = setTimeout(() => {
            const currentMake = searchParams.get("make") || "";
            const currentModel = searchParams.get("model") || "";
            const currentMaxPrice = searchParams.get("maxPrice") || "";

            if (make !== currentMake || model !== currentModel || maxPrice !== currentMaxPrice) {
                const params = new URLSearchParams(searchParams.toString());
                if (make) params.set("make", make); else params.delete("make");
                if (model) params.set("model", model); else params.delete("model");
                if (maxPrice) params.set("maxPrice", maxPrice); else params.delete("maxPrice");
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [make, model, maxPrice, searchParams, pathname, router]);

    const handleCheckboxChange = (name, value, currentState, setState) => {
        const newArray = currentState.includes(value)
            ? currentState.filter(item => item !== value)
            : [...currentState, value];

        setState(newArray);
        router.replace(`${pathname}?${createQueryString(name, newArray, true)}`, { scroll: false });
    };

    const handleClearFilters = () => {
        setMake("");
        setModel("");
        setMaxPrice("");
        setTransmission([]);
        setFuelType([]);
        setFeatures([]);
        router.replace(pathname, { scroll: false });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Icon name="filter_alt" className="text-[22px]" />
                    Filters
                </h2>
                <button
                    onClick={handleClearFilters}
                    className="text-sm font-bold text-primary-ink hover:text-slate-900 transition-colors"
                >
                    Clear All
                </button>
            </div>

            <div className="space-y-6">
                {/* Search Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Make</label>
                        <input
                            type="text"
                            placeholder="e.g. Toyota"
                            value={make}
                            onChange={(e) => setMake(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Model</label>
                        <input
                            type="text"
                            placeholder="e.g. Fortuner"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Max Price (ZAR)</label>
                        <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={maxPrice}
                            onChange={(e) => setMaxPrice(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Transmission */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Transmission</h3>
                    <div className="space-y-3">
                        {['Automatic', 'Manual'].map(t => (
                            <label key={t} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={transmission.includes(t)}
                                        onChange={() => handleCheckboxChange('transmission', t, transmission, setTransmission)}
                                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-primary checked:border-primary transition-colors focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                                    />
                                    <Icon name="check" className="absolute text-black text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Fuel Type */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Fuel Type</h3>
                    <div className="space-y-3">
                        {['Diesel', 'Petrol', 'Electric', 'Hybrid'].map(f => (
                            <label key={f} className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={fuelType.includes(f)}
                                        onChange={() => handleCheckboxChange('fuel_type', f, fuelType, setFuelType)}
                                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-primary checked:border-primary transition-colors focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                                    />
                                    <Icon name="check" className="absolute text-black text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{f}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <hr className="border-slate-100" />

                {/* Features */}
                <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-4">Features</h3>
                    <div className="space-y-6">
                        {Object.entries(CAR_FEATURES).map(([category, categoryFeatures]) => (
                            <div key={category}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h4>
                                <div className="grid grid-cols-1 gap-3">
                                    {categoryFeatures.map(feature => (
                                        <label key={feature} className="flex items-center gap-3 cursor-pointer group">
                                            <div className="relative flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={features.includes(feature)}
                                                    onChange={() => handleCheckboxChange('features', feature, features, setFeatures)}
                                                    className="peer appearance-none w-4 h-4 border-2 border-slate-300 rounded cursor-pointer checked:bg-primary checked:border-primary transition-colors focus:ring-2 focus:ring-primary/20 focus:outline-none bg-white"
                                                />
                                                <Icon name="check" className="absolute text-black text-[14px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{feature}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
