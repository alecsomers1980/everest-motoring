"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { queueAiWalkaround, optimizeDescriptionAction, requestVideoApprovalAction } from "./ai_actions";
import { scheduleNewCarFeedPost } from "./socialAction";
import { pingVehicleUrls, autoFixSeoForCar } from "./seo_actions";
import { postCarToGbpAction } from "./gbp_actions";

// Spelling aligned to cars.co.za option labels so features carry over directly
// during syndication. Everest-only extras (Lane Assist, Bluetooth, etc.) kept.
const CAR_FEATURES = {
    "Safety & Security": ["ABS", "Air bags", "Alarm", "ISOFIX", "Rear-view camera", "Park distance control", "Lane Assist", "Blind Spot Monitor"],
    "Comfort & Convenience": ["Aircon", "Climate control", "Cruise control", "Keyless Entry", "Power Steering", "Electric Windows", "Sunroof", "Leather seats", "Heated seats"],
    "Technology & Entertainment": ["Bluetooth", "Sat nav", "Radio", "Touchscreen", "Apple CarPlay & Android Auto", "USB Ports", "Wireless charging pad"],
    "Exterior & Performance": ["Alloy Wheels", "Towbar", "Roof Rails", "Daytime Running Lights", "Xenon lights", "LED lights", "Fog Lights", "4WD/AWD"],
    "Warranty & Service": ["Motorplan", "Full service record"]
};

const COLOURS = ["Beige", "Black", "Blue", "Bronze", "Brown", "Burgundy", "Gold", "Green", "Grey", "Indigo", "Magenta", "Maroon", "Navy", "Orange", "Pink", "Purple", "Red", "Silver", "Turquoise", "White", "Yellow"];

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Bi Fuel", "Bio-Diesel", "Compressed Natural Gas", "Dual Fuel", "Hydrogen", "Liquefied Natural Gas", "Liquefied Petroleum Gas", "Other"];

const SERVICE_HISTORY = [
    { value: "full_franchise", label: "Full Franchise Service History" },
    { value: "full", label: "Full Service History" },
    { value: "full_non_franchise", label: "Full Service History by Non-Franchise" },
    { value: "full_partial_franchise", label: "Full Service History Partially by Franchise" },
    { value: "partial", label: "Partial Service History" },
    { value: "none", label: "No Service History" },
    { value: "not_applicable", label: "Not Applicable" },
];

const CONDITION_RATINGS = ["New", "Excellent", "Good", "Average", "Poor", "Non-runner"];

const IMAGE_CATEGORIES = [
    { value: "front", label: "Front" },
    { value: "rear", label: "Rear" },
    { value: "interior", label: "Interior" },
    { value: "dashboard", label: "Dashboard" },
    { value: "steering_wheel", label: "Steering Wheel" },
    { value: "wheels", label: "Wheels / Rims" },
    { value: "front_left", label: "Front Left" },
    { value: "front_right", label: "Front Right" },
    { value: "rear_left", label: "Rear Left" },
    { value: "rear_right", label: "Rear Right" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
];

export default function VehicleForm({ initialData = null }) {
    const router = useRouter();
    const supabase = createClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const isEditing = !!initialData;

    // Gallery management (edit mode)
    const [keepGallery, setKeepGallery] = useState(initialData?.gallery_urls || []);
    const [imageMeta, setImageMeta] = useState(() => {
        const map = {};
        (initialData?.gallery_meta || []).forEach((m) => {
            if (m && m.url) map[m.url] = m.category;
        });
        return map;
    });
    const [inspectionReportUrl, setInspectionReportUrl] = useState(initialData?.inspection_report_url || null);

    const setCategoryFor = (url, value) => {
        setImageMeta((prev) => ({ ...prev, [url]: value }));
    };
    const removeGalleryImage = (url) => {
        setKeepGallery((prev) => prev.filter((u) => u !== url));
        setImageMeta((prev) => {
            const next = { ...prev };
            delete next[url];
            return next;
        });
    };

    // Helper to check if an existing feature was selected
    const hasFeature = (feature) => {
        if (!initialData || !initialData.features) return false;
        return initialData.features.includes(feature);
    };

    async function handleSubmit(e) {
        e.preventDefault();
        setIsUploading(true);
        setUploadProgress(10);

        try {
            const formData = new FormData(e.target);
            const scene1File = formData.get("scene1_image");
            const scene2File = formData.get("scene2_image");
            const scene3File = formData.get("scene3_image");
            const galleryFiles = formData.getAll("gallery_images");

            let mainImageUrl = formData.get("main_image_url") || (isEditing ? initialData.main_image_url : null);
            let galleryUrls = isEditing ? [...keepGallery] : [];
            let nextInspectionReportUrl = inspectionReportUrl;

            // Helper to upload a single file
            const uploadFile = async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `vehicles/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('vehicles')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('vehicles')
                    .getPublicUrl(filePath);

                return publicUrlData.publicUrl;
            };

            // 1. Upload to Supabase Storage if new files were selected
            try {
                // Determine total files to track progress
                const validGalleryFiles = galleryFiles.filter(file => file.size > 0);
                const allFilesToUpload = [];
                if (scene1File && scene1File.size > 0) allFilesToUpload.push({ type: 'main', file: scene1File });
                if (scene2File && scene2File.size > 0) allFilesToUpload.push({ type: 'scene2', file: scene2File });
                if (scene3File && scene3File.size > 0) allFilesToUpload.push({ type: 'scene3', file: scene3File });

                validGalleryFiles.forEach(file => {
                    allFilesToUpload.push({ type: 'gallery', file });
                });

                if (allFilesToUpload.length > 0) {
                    setUploadProgress(30);

                    let i = 0;
                    // Note: We need to make sure scene2 is gallery[0] and scene3 is gallery[1]
                    // If building a new car and all images are provided:
                    // newGalleryUrls = [scene2Url, scene3Url, ...galleryUrls]
                    const newGalleryAssets = [];
                    let scene2Url = null;
                    let scene3Url = null;

                    for (const item of allFilesToUpload) {
                        const url = await uploadFile(item.file);
                        if (item.type === 'main') mainImageUrl = url;
                        else if (item.type === 'scene2') scene2Url = url;
                        else if (item.type === 'scene3') scene3Url = url;
                        else if (item.type === 'gallery') newGalleryAssets.push(url);

                        i++;
                        setUploadProgress(30 + Math.floor((40 / allFilesToUpload.length) * i));
                    }

                    // Construct galleryUrls:
                    // Scene 2 and Scene 3 are the first two elements of the gallery.
                    if (scene2Url || scene3Url || newGalleryAssets.length > 0) {
                        const compiledGallery = [];
                        // keep existing gallery unless we are overwriting specific slots?
                        // The simplest approach is to push the new ones.
                        // For AI video, the script generator pulls galleryUrls[0] and galleryUrls[1].
                        if (scene2Url) compiledGallery.push(scene2Url);
                        else if (isEditing && galleryUrls[0]) compiledGallery.push(galleryUrls[0]);

                        if (scene3Url) compiledGallery.push(scene3Url);
                        else if (isEditing && galleryUrls[1]) compiledGallery.push(galleryUrls[1]);

                        // Append the rest of existing that aren't the first two
                        if (isEditing && galleryUrls.length > 2) {
                            compiledGallery.push(...galleryUrls.slice(2));
                        }

                        compiledGallery.push(...newGalleryAssets);
                        galleryUrls = compiledGallery;
                    }
                }
            } catch (err) {
                console.error("Storage upload error:", err);
                alert(`Failed to upload images.`);
                setIsUploading(false);
                return;
            }

            // Inspection report PDF upload (optional)
            const inspectionFile = formData.get("inspection_report");
            if (inspectionFile && inspectionFile.size > 0) {
                try {
                    const fileName = `inspection-reports/${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
                    const { error: uploadError } = await supabase.storage
                        .from('vehicles')
                        .upload(fileName, inspectionFile, { contentType: 'application/pdf' });
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = supabase.storage.from('vehicles').getPublicUrl(fileName);
                    nextInspectionReportUrl = publicUrlData.publicUrl;
                } catch (err) {
                    console.error("Inspection report upload error:", err);
                    alert("Failed to upload inspection report PDF.");
                    setIsUploading(false);
                    return;
                }
            }

            setUploadProgress(70);

            setUploadProgress(90);

            // Helpers for optional numeric/boolean fields
            const intOrNull = (v) => (v === "" || v == null ? null : parseInt(v));
            const floatOrNull = (v) => (v === "" || v == null ? null : parseFloat(v));
            const triState = (v) => (v === "" || v == null ? null : v === "yes");

            // 2. Prepare the Car Record payload
            const carPayload = {
                make: formData.get("make"),
                model: formData.get("model"),
                year: parseInt(formData.get("year")),
                price: parseFloat(formData.get("price")),
                mileage: parseInt(formData.get("mileage")),
                transmission: formData.get("transmission"),
                fuel_type: formData.get("fuel_type"),
                drivetrain: formData.get("drivetrain") || null,
                status: formData.get("status"),
                main_image_url: mainImageUrl,
                gallery_urls: galleryUrls,
                video_url: formData.get("video_url") || (isEditing ? initialData.video_url : null),
                description: formData.get("description") || null,
                features: formData.getAll("features"),
                is_featured: formData.get("is_featured") === "on",

                // Identification
                stock_number: formData.get("stock_number") || null,
                vin: formData.get("vin") || null,
                registration_number: formData.get("registration_number") || null,

                // Condition & History
                registration_year: intOrNull(formData.get("registration_year")),
                condition: formData.get("condition") || null,
                condition_rating: formData.get("condition_rating") || null,
                colour: formData.get("colour") || null,
                manufacturer_colour: formData.get("manufacturer_colour") || null,
                previous_owners: intOrNull(formData.get("previous_owners")),
                service_history: formData.get("service_history") || null,
                accident_involved: triState(formData.get("accident_involved")),
                demo_vehicle: formData.get("demo_vehicle") === "on",
                code_3: formData.get("code_3") === "on",
                accessible_vehicle: formData.get("accessible_vehicle") === "on",
                armoured_vehicle: formData.get("armoured_vehicle") === "on",

                // Warranty
                has_warranty: triState(formData.get("has_warranty")),
                warranty_end_date: formData.get("warranty_end_date") || null,
                warranty_mileage: intOrNull(formData.get("warranty_mileage")),

                // Compliance & Disclosure
                sold_roadworthy: triState(formData.get("sold_roadworthy")),
                eligible_for_finance: triState(formData.get("eligible_for_finance")),

                // Pricing
                trade_in_price: floatOrNull(formData.get("trade_in_price")),
                reconditioning_cost: floatOrNull(formData.get("reconditioning_cost")),
                price_on_application: formData.get("price_on_application") === "on",

                // Image metadata + inspection report
                gallery_meta: galleryUrls
                    .filter((url) => imageMeta[url])
                    .map((url) => ({ url, category: imageMeta[url] })),
                inspection_report_url: nextInspectionReportUrl,
            };

            // AI Optimization
            setUploadProgress(92);
            carPayload.description = await optimizeDescriptionAction(carPayload, carPayload.description);

            // 3. Insert or Update
            let savedCarId = isEditing ? initialData.id : null;
            if (isEditing) {
                const { error: dbError } = await supabase
                    .from('cars')
                    .update(carPayload)
                    .eq('id', initialData.id);
                if (dbError) throw dbError;
            } else {
                // For new vehicles, we select the inserted data back so we have the new ID
                const { data: insertedData, error: dbError } = await supabase
                    .from('cars')
                    .insert([carPayload])
                    .select()
                    .single();
                if (dbError) throw dbError;
                savedCarId = insertedData.id;

                // Step 4: Autonomous AI Video Generation!
                // If they didn't provide a manual YouTube link, we queue it
                if (!carPayload.video_url) {
                    setUploadProgress(95);
                    await queueAiWalkaround(insertedData.id);
                }

                // The photo + specs post goes out on its own; the reel and the
                // full walkthrough wait for approval. A manual video link never
                // enters the render pipeline, so ask for its approval here.
                scheduleNewCarFeedPost({ ...carPayload, id: insertedData.id })
                    .catch((err) => console.warn("Feed post scheduling failed:", err));
                if (carPayload.video_url) {
                    requestVideoApprovalAction(insertedData.id)
                        .catch((err) => console.warn("Video approval request failed:", err));
                }
            }

            // Best-effort IndexNow ping — never block the save UX
            if (savedCarId) {
                pingVehicleUrls([savedCarId]).catch((err) => console.warn("IndexNow ping failed:", err));
                // Auto-generate SEO metadata + image alts in the background.
                // Fire-and-forget; admin doesn't wait for Gemini.
                autoFixSeoForCar(savedCarId).catch((err) => console.warn("Auto SEO failed:", err));
                // Auto-post to Google Business Profile
                postCarToGbpAction({ ...carPayload, id: savedCarId }).catch((err) => console.warn("GBP post failed:", err));
            } else if (isEditing) {
                // For edits, post the updated car data
                postCarToGbpAction({ ...carPayload, id: initialData.id }).catch((err) => console.warn("GBP post failed:", err));
            }

            setUploadProgress(100);
            router.push("/admin/inventory");

        } catch (err) {
            console.error(err);
            const detail = err?.message || err?.error_description || err?.hint || JSON.stringify(err);
            alert(`An error occurred while saving the vehicle:\n\n${detail}`);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Make</label>
                    <input type="text" name="make" defaultValue={initialData?.make} placeholder="e.g. Toyota" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Model</label>
                    <input type="text" name="model" defaultValue={initialData?.model} placeholder="e.g. Fortuner 2.8 GD-6" required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Year</label>
                    <input type="number" name="year" defaultValue={initialData?.year} placeholder="2023" required min="1990" max={new Date().getFullYear() + 1} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Price (ZAR)</label>
                    <input type="number" name="price" defaultValue={initialData?.price} placeholder="799900" required min="0" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Mileage (km)</label>
                    <input type="number" name="mileage" defaultValue={initialData?.mileage} placeholder="45000" required min="0" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Transmission</label>
                    <select name="transmission" defaultValue={initialData?.transmission || "Automatic"} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Fuel Type</label>
                    <select name="fuel_type" defaultValue={initialData?.fuel_type || "Diesel"} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                        {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Drivetrain</label>
                    <select name="drivetrain" defaultValue={initialData?.drivetrain || "2x4"} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                        <option value="2x4">2x4 (Two-Wheel Drive)</option>
                        <option value="4x4">4x4 (Four-Wheel Drive)</option>
                        <option value="AWD">AWD (All-Wheel Drive)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                    <select name="status" defaultValue={initialData?.status || "available"} required className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                        <option value="available">Available</option>
                        <option value="reserved">Reserved</option>
                        <option value="sold">Sold</option>
                        <option value="temporarily_withdrawn">Temporarily Withdrawn</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Featured Vehicle</label>
                    <label className="flex items-center gap-3 cursor-pointer group mt-4">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                name="is_featured"
                                defaultChecked={initialData?.is_featured || false}
                                className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded cursor-pointer checked:bg-black checked:border-black transition-colors"
                            />
                            <span className="material-symbols-outlined absolute text-white text-[18px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">star</span>
                        </div>
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Show on Home Page</span>
                    </label>
                </div>
            </div>

            {/* ======== Vehicle Identification ======== */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="block text-sm font-bold text-slate-700 mb-4">Vehicle Identification</h3>
                <p className="text-xs text-slate-500 -mt-2 mb-2">Required for AutoTrader / Cars.co.za export. Inaccurate VINs may cause listing removal.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Stock Number</label>
                        <input type="text" name="stock_number" defaultValue={initialData?.stock_number || ""} placeholder="e.g. EM-2024-001" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">VIN Number</label>
                        <input type="text" name="vin" defaultValue={initialData?.vin || ""} maxLength={17} placeholder="17 characters" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none uppercase" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Registration Number</label>
                        <input type="text" name="registration_number" defaultValue={initialData?.registration_number || ""} maxLength={10} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none uppercase" />
                    </div>
                </div>
            </div>

            {/* ======== Condition & History ======== */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="block text-sm font-bold text-slate-700 mb-4">Condition & History</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">New / Used</label>
                        <select name="condition" defaultValue={initialData?.condition || "used"} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="used">Used</option>
                            <option value="new">New</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Previous Owners</label>
                        <select name="previous_owners" defaultValue={initialData?.previous_owners || ""} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Select —</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Condition Rating <span className="text-red-500">*</span></label>
                        <select name="condition_rating" defaultValue={initialData?.condition_rating || ""} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Please select —</option>
                            {CONDITION_RATINGS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Colour</label>
                        <select name="colour" defaultValue={initialData?.colour || ""} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Select —</option>
                            {COLOURS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Service History</label>
                        <select name="service_history" defaultValue={initialData?.service_history || ""} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Select —</option>
                            {SERVICE_HISTORY.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Accident History</label>
                        <select name="accident_involved" defaultValue={initialData?.accident_involved == null ? "" : initialData.accident_involved ? "yes" : "no"} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Select —</option>
                            <option value="no">No accidents</option>
                            <option value="yes">Has been in an accident</option>
                        </select>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-7">
                        {[
                            { name: "demo_vehicle", label: "Demo Vehicle" },
                            { name: "code_3", label: "Code 3" },
                            { name: "accessible_vehicle", label: "Accessible Vehicle" },
                            { name: "armoured_vehicle", label: "Armoured" },
                        ].map(opt => (
                            <label key={opt.name} className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    name={opt.name}
                                    defaultChecked={initialData?.[opt.name] || false}
                                    className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-black checked:border-black transition-colors relative"
                                />
                                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======== Warranty ======== */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="block text-sm font-bold text-slate-700 mb-4">Warranty</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Has Warranty</label>
                        <select name="has_warranty" defaultValue={initialData?.has_warranty == null ? "" : initialData.has_warranty ? "yes" : "no"} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                            <option value="">— Select —</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Warranty End Date</label>
                        <input type="date" name="warranty_end_date" defaultValue={initialData?.warranty_end_date || ""} className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Warranty Mileage (km)</label>
                        <input type="number" name="warranty_mileage" defaultValue={initialData?.warranty_mileage || ""} min="0" placeholder="e.g. 100000" className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                </div>
            </div>

            {/* ======== Compliance & Disclosure (admin only) ======== */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="block text-sm font-bold text-slate-700 mb-1">Compliance & Disclosure</h3>
                <p className="text-xs text-slate-500 -mt-1 mb-2">Internal / legal fields. Required for export feeds. Not shown on the public listing.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Sold in roadworthy condition <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                            Will this vehicle, at no extra cost to the customer, be sold with a valid roadworthy certificate from an accredited service provider according to regulations laid out in the National Road Traffic Act and SANS 10047/SANS 10216, certifying the condition of the vehicle?
                        </p>
                        <select
                            name="sold_roadworthy"
                            required
                            defaultValue={initialData?.sold_roadworthy == null ? "yes" : initialData.sold_roadworthy ? "yes" : "no"}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                        >
                            <option value="">— Please select —</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Eligible for finance <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500 mb-2">
                            Does this vehicle qualify for vehicle asset finance with an accredited institution?
                        </p>
                        <select
                            name="eligible_for_finance"
                            required
                            defaultValue={initialData?.eligible_for_finance == null ? "yes" : initialData.eligible_for_finance ? "yes" : "no"}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                        >
                            <option value="">— Please select —</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-4 pb-4">
                <h3 className="block text-sm font-bold text-slate-700 mb-4">Vehicle Features & Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                    {Object.entries(CAR_FEATURES).map(([category, features]) => (
                        <div key={category} className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{category}</h4>
                            <div className="space-y-2">
                                {features.map((feature) => (
                                    <label key={feature} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                name="features"
                                                value={feature}
                                                defaultChecked={hasFeature(feature)}
                                                className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-black checked:border-black transition-colors"
                                            />
                                            <span className="material-symbols-outlined absolute text-white text-[16px] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{feature}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-6">

                {isEditing && initialData?.main_image_url && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Current Main Image</label>
                        <div className="relative h-48 w-64 rounded-xl overflow-hidden border border-slate-200">
                            <Image src={initialData.main_image_url} alt="Current vehicle" fill className="object-cover" />
                        </div>
                        <p className="text-xs text-slate-500 mt-2">Uploading a new file below will overwrite this image.</p>
                    </div>
                )}

                {isEditing && keepGallery.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Manage Existing Gallery Photos</label>
                        <p className="text-xs text-slate-500 mb-4">Classify each image (used by AutoTrader / Cars.co.za exports) or remove images you no longer want shown.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {keepGallery.map((url) => (
                                <div key={url} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                                    <div className="relative h-32 w-full bg-slate-100">
                                        <Image src={url} alt="Gallery" fill className="object-cover" sizes="200px" />
                                        <button
                                            type="button"
                                            onClick={() => removeGalleryImage(url)}
                                            className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow"
                                            title="Remove image"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                    <div className="p-2">
                                        <select
                                            value={imageMeta[url] || ""}
                                            onChange={(e) => setCategoryFor(url, e.target.value)}
                                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                                        >
                                            <option value="">— Unclassified —</option>
                                            {IMAGE_CATEGORIES.map((c) => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* File Upload Section */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-4">Video Cinematic Scenes {"&"} Photos</label>
                    <p className="text-sm text-slate-500 mb-6">These first three images are used by the AI engine to generate the 3 distinct video scenes. The rest form the image gallery.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        {/* Scene 1 */}
                        <label htmlFor="scene1_image" className="bg-slate-50 border border-slate-300 rounded-xl p-6 text-center hover:bg-slate-100 transition-colors cursor-pointer relative block">
                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">directions_car</span>
                            <span className="block text-sm font-bold text-slate-700 mb-1">Scene 1: Front / Side</span>
                            <p className="text-xs text-slate-500 mb-4">Hero exterior shot.</p>
                            <input
                                id="scene1_image"
                                type="file"
                                name="scene1_image"
                                accept="image/png, image/jpeg, image/webp"
                                className="text-xs text-slate-500 w-full file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 block cursor-pointer"
                            />
                        </label>

                        {/* Scene 2 */}
                        <label htmlFor="scene2_image" className="bg-slate-50 border border-slate-300 rounded-xl p-6 text-center hover:bg-slate-100 transition-colors cursor-pointer relative block">
                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">dashboard</span>
                            <span className="block text-sm font-bold text-slate-700 mb-1">Scene 2: Dashboard View</span>
                            <p className="text-xs text-slate-500 mb-4">Interior cockpit layout.</p>
                            <input
                                id="scene2_image"
                                type="file"
                                name="scene2_image"
                                accept="image/png, image/jpeg, image/webp"
                                className="text-xs text-slate-500 w-full file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 block cursor-pointer"
                            />
                        </label>

                        {/* Scene 3 */}
                        <label htmlFor="scene3_image" className="bg-slate-50 border border-slate-300 rounded-xl p-6 text-center hover:bg-slate-100 transition-colors cursor-pointer relative block">
                            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">airline_seat_recline_extra</span>
                            <span className="block text-sm font-bold text-slate-700 mb-1">Scene 3: Backseat Area</span>
                            <p className="text-xs text-slate-500 mb-4">Passenger comfort / space.</p>
                            <input
                                id="scene3_image"
                                type="file"
                                name="scene3_image"
                                accept="image/png, image/jpeg, image/webp"
                                className="text-xs text-slate-500 w-full file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 block cursor-pointer"
                            />
                        </label>
                    </div>

                    {/* Bulk Gallery */}
                    <label htmlFor="gallery_images" className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-100 transition-colors cursor-pointer relative block">
                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">collections</span>
                        <span className="block text-sm font-bold text-slate-700 mb-1">Gallery Images</span>
                        <p className="text-xs text-slate-500 mb-4">Hold Ctrl/Cmd to select multiple extra photos (engines, boot space, specific angles).</p>
                        <input
                            id="gallery_images"
                            type="file"
                            name="gallery_images"
                            multiple
                            accept="image/png, image/jpeg, image/webp"
                            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 mx-auto block cursor-pointer"
                        />
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Extra or unique feature</label>
                    <textarea name="description" defaultValue={initialData?.description} rows="5" placeholder="List key specific features and condition..." className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 outline-none resize-none"></textarea>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Inspection Report (PDF)</label>
                    <p className="text-xs text-slate-500 mb-3">Optional. Verified third-party report — improves listing quality on AutoTrader.</p>
                    {inspectionReportUrl && (
                        <div className="flex items-center gap-3 mb-3 text-sm">
                            <a href={inspectionReportUrl} target="_blank" rel="noopener noreferrer" className="text-primary-ink font-bold underline flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                                View current report
                            </a>
                            <button
                                type="button"
                                onClick={() => setInspectionReportUrl(null)}
                                className="text-red-600 hover:text-red-700 text-xs font-bold uppercase tracking-wider"
                            >
                                Remove
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        name="inspection_report"
                        accept="application/pdf"
                        className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 block"
                    />
                </div>
            </div>

            <div className="pt-6 relative">
                <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold py-4 rounded-lg shadow-md transition-all text-lg flex items-center justify-center gap-2 relative overflow-hidden"
                >
                    {/* Progress Bar Background */}
                    {isUploading && (
                        <div
                            className="absolute left-0 top-0 bottom-0 bg-black/20 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    )}

                    <span className="material-symbols-outlined relative z-10">
                        {isUploading ? 'sync' : 'save'}
                    </span>
                    <span className="relative z-10">
                        {isUploading ? (uploadProgress >= 90 ? 'AI is working...' : `Uploading Photo... ${uploadProgress}%`) : (isEditing ? 'Save Changes' : 'Publish Vehicle to Showroom')}
                    </span>
                </button>
            </div>
        </form>
    );
}
