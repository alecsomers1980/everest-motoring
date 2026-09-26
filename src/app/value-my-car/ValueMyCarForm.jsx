"use client";

import { useState } from "react";
import { submitValueMyCar } from "./actions";
import { trackEvent } from "@/lib/gtag";
import Icon from "@/components/Icon";

export default function ValueMyCarForm() {
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState("idle");

    // Form data state
    const [formData, setFormData] = useState({
        category: "Vehicle", // Hardcoded to Vehicle for the backend
        make: "",
        model: "",
        year: "",
        fuel_type: "",
        transmission: "",
        condition: "",
        additional_notes: "",
        client_name: "",
        client_phone: "",
        client_email: "",
        client_suburb: "",
        client_province: "",
        mileage: ""
    });

    const [files, setFiles] = useState({
        image_front: null,
        image_left: null,
        image_right: null,
        image_back: null,
        image_roof: null,
        image_interior_front: null,
        image_interior_back: null
    });

    const [progress, setProgress] = useState(0);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const { name, files: fileList } = e.target;
        if (fileList && fileList.length > 0) {
            setFiles(prev => ({ ...prev, [name]: fileList[0] }));
        }
    };

    const [invalid, setInvalid] = useState([]);

    // Returns true if all required pairs are filled; otherwise records the
    // missing fields, scrolls to the first one and highlights them.
    const requireFields = (pairs) => {
        const missing = pairs.filter(([, v]) => !v).map(([k]) => k);
        setInvalid(missing);
        if (missing.length > 0) {
            const el = document.getElementById("vmc-" + missing[0]);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            return false;
        }
        return true;
    };

    const errRing = (name) => (invalid.includes(name) ? " ring-2 ring-red-400 border-red-400" : "");

    const nextStep = (e) => {
        if (e) e.preventDefault();

        if (step === 1) {
            if (!requireFields([
                ["make", formData.make], ["model", formData.model], ["year", formData.year],
                ["mileage", formData.mileage], ["fuel_type", formData.fuel_type],
                ["transmission", formData.transmission], ["condition", formData.condition],
            ])) return;
        }

        if (step === 2) {
            if (!requireFields([
                ["image_front", files.image_front], ["image_left", files.image_left],
                ["image_right", files.image_right], ["image_back", files.image_back],
            ])) return;
        }

        setStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const prevStep = () => {
        setStep(prev => prev - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    async function handleAction(e) {
        e.preventDefault();

        // Final validation
        if (!requireFields([
            ["client_name", formData.client_name],
            ["client_phone", formData.client_phone],
            ["client_email", formData.client_email],
        ])) return;

        setStatus("submitting");
        setProgress(6);
        // Animate toward ~92% while the upload + save round-trips, then snap to
        // 100% on success so the user sees real movement rather than a frozen button.
        const progressTimer = setInterval(() => {
            setProgress((p) => (p < 92 ? Math.min(92, p + Math.random() * 9 + 2) : p));
        }, 450);

        // Convert state to FormData to reuse the server action structure easily
        const submissionData = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            submissionData.append(key, value);
        });

        // Append files
        Object.entries(files).forEach(([key, file]) => {
            if (file) {
                submissionData.append(key, file);
            }
        });

        const result = await submitValueMyCar(submissionData);
        clearInterval(progressTimer);

        if (result?.error) {
            setStatus("error");
            setProgress(0);
            alert("Failed to submit inquiry. Please try again or call us directly.");
        } else {
            setProgress(100);
            trackEvent("generate_lead", {
                form: "value_my_car",
                make: formData.make || null,
                model: formData.model || null,
            });
            setStatus("success");
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    if (status === "success") {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-12 text-center my-8">
                <Icon name="task_alt" className="text-green-500 text-6xl mb-4" />
                <h2 className="text-3xl font-bold text-slate-900 mb-4">Request Received!</h2>
                <p className="text-slate-600 text-lg max-w-lg mx-auto mb-8">
                    Thank you for submitting your details. Our procurement team will review your information and contact you shortly with an indicative offer.
                </p>
                <button
                    onClick={() => {
                        window.location.reload();
                    }}
                    className="text-primary-ink font-bold hover:text-slate-900 transition-colors"
                >
                    Submit another vehicle
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleAction} className="space-y-8">
            {/* Step Progress Indicator */}
            <div className="mb-10">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-primary text-black' : 'bg-slate-100 text-slate-400'}`}>1</div>
                        <div className={`h-1 w-8 rounded ${step >= 2 ? 'bg-primary' : 'bg-slate-100'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-primary text-black' : 'bg-slate-100 text-slate-400'}`}>2</div>
                        <div className={`h-1 w-8 rounded ${step >= 3 ? 'bg-primary' : 'bg-slate-100'}`}></div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-primary text-black' : 'bg-slate-100 text-slate-400'}`}>3</div>
                    </div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Step {step} of 3
                    </div>
                </div>

                {/* Step Descriptions to set expectations */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left md:text-center">
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${step === 1 ? 'border-primary bg-primary/5 shadow-sm' : step > 1 ? 'border-green-500/30 bg-green-500/5' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                        <div className="font-bold text-slate-900 mb-1 flex items-center md:justify-center gap-2">
                            {step > 1 && <Icon name="check_circle" className="text-green-500 text-sm" />}
                            1. Vehicle Details
                        </div>
                        <div className="text-xs text-slate-500">Make, model, year, and condition.</div>
                    </div>
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${step === 2 ? 'border-primary bg-primary/5 shadow-sm' : step > 2 ? 'border-green-500/30 bg-green-500/5' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                        <div className="font-bold text-slate-900 mb-1 flex items-center md:justify-center gap-2">
                            {step > 2 && <Icon name="check_circle" className="text-green-500 text-sm" />}
                            2. Upload Photos
                        </div>
                        <div className="text-xs text-slate-500">Exterior &amp; interior photos of your car.</div>
                    </div>
                    <div className={`p-4 rounded-xl border transition-all duration-300 ${step === 3 ? 'border-primary bg-primary/5 shadow-sm' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                        <div className="font-bold text-slate-900 mb-1 flex items-center md:justify-center gap-2">
                            3. Contact Info
                        </div>
                        <div className="text-xs text-slate-500">Where we can send your valuation.</div>
                    </div>
                </div>
            </div>

            {/* STEP 1: VEHICLE DETAILS */}
            {step === 1 && (
                <div className="animate-fade-in-up space-y-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">Tell us about your vehicle</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Make *</label>
                            <input id="vmc-make" type="text" name="make" value={formData.make} onChange={handleChange} placeholder="e.g. Toyota" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('make')}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Model *</label>
                            <input id="vmc-model" type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Fortuner" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('model')}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Year *</label>
                            <select id="vmc-year" name="year" value={formData.year} onChange={handleChange} required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white${errRing('year')}`}>
                                <option value="">Select Year</option>
                                {Array.from({ length: 30 }, (_, i) => 2025 - i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                                <option value="Older">Older</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Mileage (km) *</label>
                            <input id="vmc-mileage" type="number" name="mileage" value={formData.mileage} onChange={handleChange} placeholder="e.g. 45000" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('mileage')}`} />
                        </div>
                    </div>

                    <div className="space-y-8 pt-4">
                        {/* Fuel Type */}
                        <div id="vmc-fuel_type">
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Fuel Type *</label>
                            <div className={`grid grid-cols-2 gap-3 rounded-xl${errRing('fuel_type')}`}>
                                {['Petrol', 'Diesel', 'Electric', 'Hybrid'].map(type => (
                                    <button
                                        key={type} type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, fuel_type: type }))}
                                        className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${formData.fuel_type === type ? 'bg-primary border-primary text-black shadow-md shadow-primary/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Transmission */}
                        <div id="vmc-transmission">
                            <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Transmission *</label>
                            <div className={`grid grid-cols-2 gap-3 rounded-xl${errRing('transmission')}`}>
                                {['Automatic', 'Manual'].map(type => (
                                    <button
                                        key={type} type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, transmission: type }))}
                                        className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${formData.transmission === type ? 'bg-primary border-primary text-black shadow-md shadow-primary/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Condition */}
                    <div id="vmc-condition" className="pt-4">
                        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Overall Condition *</label>
                        <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 rounded-xl${errRing('condition')}`}>
                            {['Excellent', 'Good', 'Average', 'Poor', 'Non-runner'].map(cond => (
                                <button
                                    key={cond} type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, condition: cond }))}
                                    className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all ${formData.condition === cond ? 'bg-primary border-primary text-black shadow-md shadow-primary/20' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {cond}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Additional Notes (Optional)</label>
                        <textarea
                            name="additional_notes"
                            value={formData.additional_notes}
                            onChange={handleChange}
                            placeholder="Anything else we should know? e.g. Full service history, accident damage, modifications..."
                            rows="4"
                            className="w-full px-5 py-4 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button type="button" onClick={nextStep} className="flex-1 bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-lg shadow-lg shadow-primary/30 transition-all flex justify-center items-center gap-2">
                            Continue <Icon name="arrow_forward" className="text-sm" />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: UPLOAD PHOTOS */}
            {step === 2 && (
                <div className="animate-fade-in-up space-y-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">Upload Photos</h2>

                    <p className="text-slate-600">Please provide clear photos of your vehicle. Ensure the vehicle is fully visible in good lighting.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Front */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Front View *</label>
                            <input id="vmc-image_front" type="file" name="image_front" accept="image/*" onChange={handleFileChange} required className={`block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50${errRing('image_front')}`} />
                            {files.image_front && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Left Side */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Left Side *</label>
                            <input id="vmc-image_left" type="file" name="image_left" accept="image/*" onChange={handleFileChange} required className={`block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50${errRing('image_left')}`} />
                            {files.image_left && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Right Side */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Right Side *</label>
                            <input id="vmc-image_right" type="file" name="image_right" accept="image/*" onChange={handleFileChange} required className={`block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50${errRing('image_right')}`} />
                            {files.image_right && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Back View */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Back View *</label>
                            <input id="vmc-image_back" type="file" name="image_back" accept="image/*" onChange={handleFileChange} required className={`block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50${errRing('image_back')}`} />
                            {files.image_back && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Roof */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Roof (Optional)</label>
                            <input type="file" name="image_roof" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50" />
                            {files.image_roof && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Front Interior */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Front Interior (Optional)</label>
                            <input type="file" name="image_interior_front" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50" />
                            {files.image_interior_front && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>

                        {/* Back Interior */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Back Interior (Optional)</label>
                            <input type="file" name="image_interior_back" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-900 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 outline-none p-2 border border-slate-200 rounded-lg bg-slate-50" />
                            {files.image_interior_back && <div className="text-xs text-green-600 mt-2 font-bold"><Icon name="check_circle" className="text-[14px] align-middle pb-[2px]" /> Attached</div>}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100">
                        <button type="button" onClick={prevStep} className="px-8 py-4 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Back</button>
                        <button type="button" onClick={nextStep} className="flex-1 bg-primary hover:bg-primary-dark text-black font-bold py-4 px-8 rounded-lg shadow-lg shadow-primary/30 transition-all flex justify-center items-center gap-2">
                            Continue <Icon name="arrow_forward" className="text-sm" />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: CONTACT DETAILS */}
            {step === 3 && (
                <div className="animate-fade-in-up space-y-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 pb-2 border-b border-slate-100">About You</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Full Name *</label>
                            <input id="vmc-client_name" type="text" name="client_name" value={formData.client_name} onChange={handleChange} placeholder="John Doe" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('client_name')}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address *</label>
                            <input id="vmc-client_email" type="email" name="client_email" value={formData.client_email} onChange={handleChange} placeholder="john@example.com" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('client_email')}`} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Phone Number *</label>
                            <input id="vmc-client_phone" type="tel" name="client_phone" value={formData.client_phone} onChange={handleChange} placeholder="082 123 4567" required className={`w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all${errRing('client_phone')}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Province</label>
                            <select name="client_province" value={formData.client_province} onChange={handleChange} className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white">
                                <option value="">Select Province</option>
                                <option value="Gauteng">Gauteng</option>
                                <option value="Western Cape">Western Cape</option>
                                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                                <option value="Eastern Cape">Eastern Cape</option>
                                <option value="Free State">Free State</option>
                                <option value="Mpumalanga">Mpumalanga</option>
                                <option value="Limpopo">Limpopo</option>
                                <option value="North West">North West</option>
                                <option value="Northern Cape">Northern Cape</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Suburb / Town</label>
                            <input type="text" name="client_suburb" value={formData.client_suburb} onChange={handleChange} placeholder="e.g. Sandton" className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t border-slate-100">
                        <button type="button" disabled={status === "submitting"} onClick={prevStep} className="px-8 py-4 rounded-lg font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50">Back</button>
                        <button
                            type="submit"
                            disabled={status === "submitting"}
                            className="flex-1 bg-secondary hover:bg-slate-800 text-white font-bold py-4 px-8 rounded-lg shadow-lg shadow-secondary/30 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {status === "submitting" ? (
                                <>
                                    <Icon name="refresh" className="animate-spin" />
                                    Submitting… {Math.round(progress)}%
                                </>
                            ) : (
                                <>Submit for Free Valuation <Icon name="check_circle" className="text-sm" /></>
                            )}
                        </button>
                    </div>

                    {status === "submitting" && (
                        <div className="pt-2">
                            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${Math.round(progress)}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 text-center font-medium">
                                Uploading your photos and submitting — {Math.round(progress)}%
                            </p>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
}
