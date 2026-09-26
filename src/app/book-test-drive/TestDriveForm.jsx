"use client";

import { useState } from "react";
import { submitContactForm } from "./actions";
import { trackEvent } from "@/lib/gtag";
import Icon from "@/components/Icon";

export default function TestDriveForm({ availableCars }) {
    const [status, setStatus] = useState("idle");

    async function handleSubmit(formData) {
        setStatus("submitting");
        const result = await submitContactForm(formData);

        if (result?.error) {
            setStatus("error");
            alert("Failed to send message. Please try again.");
        } else {
            trackEvent("generate_lead", {
                form: "book_test_drive",
                car_id: formData.get("car_id") || null,
            });
            setStatus("success");
        }
    }

    if (status === "success") {
        return (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center h-full flex flex-col justify-center items-center">
                <Icon name="check_circle" className="text-green-500 text-6xl mb-4" />
                <h4 className="text-green-600 text-xl font-bold mb-2">Message Sent!</h4>
                <p className="text-green-700/80">Thank you for getting in touch. One of our sales executives will contact you shortly.</p>
                <button
                    type="button"
                    onClick={() => setStatus("idle")}
                    className="mt-8 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
                >
                    Send another message
                </button>
            </div>
        );
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Interested In</label>
                <div className="relative">
                    <select
                        name="car_id"
                        defaultValue="none"
                        className="w-full appearance-none px-5 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-10 text-slate-900"
                    >
                        <option value="none">General Inquiry</option>
                        <optgroup label="Available Vehicles for Test Drive">
                            {availableCars.map(car => (
                                <option key={car.id} value={car.id}>
                                    {car.year} {car.make} {car.model} — R {new Intl.NumberFormat('en-ZA').format(car.price)}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="expand_more" className="text-lg" />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Full Name</label>
                <input
                    type="text"
                    name="full_name"
                    required
                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        required
                        className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        required
                        className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                    />
                </div>
            </div>

            <div className="space-y-4 border-t border-slate-100 pt-6 mt-6">
                <h3 className="font-bold text-slate-800 text-lg">Preferred Test Drive Times</h3>
                <p className="text-sm text-slate-500 mb-4">Please provide up to 3 preferred dates and times for your test drive. At least one is required.</p>

                {[1, 2, 3].map((num) => (
                    <div key={num} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                Option {num} Date {num === 1 && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="date"
                                name={`preferred_date_${num}`}
                                required={num === 1}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                                Option {num} Time {num === 1 && <span className="text-red-500">*</span>}
                            </label>
                            <select
                                name={`preferred_time_${num}`}
                                required={num === 1}
                                className="w-full px-4 py-3 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-slate-900"
                            >
                                <option value="">Select a time</option>
                                <option value="09:00 AM">09:00 AM</option>
                                <option value="10:00 AM">10:00 AM</option>
                                <option value="11:00 AM">11:00 AM</option>
                                <option value="12:00 PM">12:00 PM</option>
                                <option value="01:00 PM">01:00 PM</option>
                                <option value="02:00 PM">02:00 PM</option>
                                <option value="03:00 PM">03:00 PM</option>
                                <option value="04:00 PM">04:00 PM</option>
                                <option value="05:00 PM">05:00 PM</option>
                            </select>
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-4">
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Message (Optional)</label>
                <textarea
                    name="message"
                    rows="4"
                    className="w-full px-5 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900"
                ></textarea>
            </div>

            <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full bg-secondary hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-4 px-8 rounded-lg transition-all shadow-md flex items-center justify-center gap-2"
            >
                {status === "submitting" ? (
                    <>
                        <Icon name="refresh" className="animate-spin" />
                        Sending...
                    </>
                ) : (
                    'Send Message'
                )}
            </button>
        </form>
    );
}
