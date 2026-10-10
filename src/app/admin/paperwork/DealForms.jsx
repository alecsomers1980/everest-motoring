"use client";

import { useState } from "react";
import { parseOtp, OtpError } from "@/utils/paperwork/parseOtp";
import { buildRlvValues, buildNcoValues } from "@/utils/paperwork/buildForms";
import RLV from "@/utils/paperwork/layouts/rlv";
import NCO from "@/utils/paperwork/layouts/nco";

// Fewest boxes any form gives this value, so the length warning covers both forms.
const boxes = (...fields) => Math.min(...fields.map((f) => f.cells.length));

const ID_TYPES = [
    ["rsa_id", "RSA ID"],
    ["foreign_id", "Foreign ID"],
    ["traffic_register", "Traffic register no."],
    ["business_reg", "Business reg. no."],
];

const CUSTOMER_FIELDS = [
    { key: "surname", label: "Surname", orgLabel: "Organisation name", limit: boxes(RLV["A.surname"], NCO["B.surname"]) },
    { key: "firstNames", label: "First names (up to 3)", person: true, limit: boxes(RLV["A.firstNames"]) },
    { key: "initials", label: "Initials", person: true, limit: boxes(RLV["A.initials"], NCO["B.initials"]) },
    { key: "idType", label: "ID type", options: ID_TYPES },
    { key: "idNumber", label: "ID number", limit: boxes(RLV["A.idNumber"], NCO["B.idNumber"]) },
    { key: "gender", label: "Gender", person: true, options: [["male", "Male"], ["female", "Female"]] },
    { key: "dob", label: "Date of birth", person: true, type: "date" },
    { key: "email", label: "Email", limit: boxes(RLV["A.email"], NCO["B.email"]) },
    { key: "cell", label: "Cellphone (also the NCO day-contact number)", limit: boxes(RLV["A.cell"]) },
    { key: "street1", label: "Street address", limit: boxes(RLV["A.street1"], NCO["B.street1"]) },
    { key: "street2", label: "Street address, line 2", limit: boxes(RLV["A.street2"], NCO["B.street2"]) },
    { key: "street3", label: "Street address, line 3", limit: boxes(RLV["A.street3"], NCO["B.street3"]) },
    { key: "streetSuburb", label: "Street: suburb", limit: boxes(RLV["A.streetSuburb"], NCO["B.streetSuburb"]) },
    { key: "streetCity", label: "Street: city/town", limit: boxes(RLV["A.streetCity"], NCO["B.streetCity"]) },
    { key: "streetCode", label: "Street: postal code", limit: boxes(RLV["A.streetCode"], NCO["B.streetCode"]) },
    { key: "postal1", label: "Postal address", limit: boxes(RLV["A.postal1"], NCO["B.postal1"]) },
    { key: "postal2", label: "Postal address, line 2", limit: boxes(RLV["A.postal2"], NCO["B.postal2"]) },
    { key: "postal3", label: "Postal address, line 3", limit: boxes(RLV["A.postal3"], NCO["B.postal3"]) },
    { key: "postalSuburb", label: "Postal: suburb", limit: boxes(RLV["A.postalSuburb"], NCO["B.postalSuburb"]) },
    { key: "postalCity", label: "Postal: city/town", limit: boxes(RLV["A.postalCity"], NCO["B.postalCity"]) },
    { key: "postalCode", label: "Postal: postal code", limit: boxes(RLV["A.postalCode"], NCO["B.postalCode"]) },
    { key: "notices", label: "Send notices to", options: [["postal", "Postal address"], ["street", "Street address"]] },
];

const VEHICLE_FIELDS = [
    { key: "licenceNo", label: "Licence (registration) number", limit: boxes(RLV["C.licence"], NCO["C.licence"]) },
    { key: "registerNo", label: "Vehicle register number", limit: boxes(RLV["C.registerNo"], NCO["C.registerNo"]) },
    { key: "vin", label: "VIN / chassis number", limit: boxes(RLV["C.vin"], NCO["C.vin"]) },
    { key: "engineNo", label: "Engine number", limit: boxes(RLV["C.engine"]) },
    { key: "make", label: "Make", limit: boxes(RLV["C.make"], NCO["C.make"]) },
    { key: "series", label: "Series name", limit: boxes(RLV["C.series"]) },
    { key: "colour", label: "Main colour (white, red and blue are ticked; others written in)", limit: boxes(RLV["C.colourOther"]) },
    { key: "odometer", label: "Odometer (km)", limit: boxes(RLV["C.odometer"], NCO["C.odometer"]) },
    { key: "transmission", label: "Transmission", options: [["automatic", "Automatic"], ["manual", "Manual"]] },
    { key: "description", label: "Body", options: [["sedan", "Sedan"], ["hatch_back", "Hatch back"], ["pick_up", "Pick-up (bakkie)"]] },
];

const ALWAYS = [
    "RLV: application for registration by title holder (X)",
    "RLV: driven: self-propelled (X)",
    "RLV: reason for registration: ownership (X)",
    "NCO: reason for change: sold (X)",
    "NCO seller: DeCar Beleggings (Pty) Ltd, reg. 2011/007142/07, 013 854 0600",
];

const BY_HAND =
    "Vehicle category, fuel type, kW and cm³, tare and GVM, NaTIS model number, steering position, " +
    "what it's used for, economic sector, nature of ownership, public road, and every signature, place and declaration date.";

const ORIGIN = {
    otp: { tag: "From OTP", input: "border-slate-300" },
    derived: { tag: "Derived", input: "border-amber-400 bg-amber-50" },
    blank: { tag: "Not on OTP", input: "border-dashed border-slate-400" },
    edited: { tag: "Edited", input: "border-slate-500" },
};

function FieldInput({ id, label, field, limit, type = "text", options, onChange }) {
    const look = ORIGIN[field.origin];
    const tag = field.origin === "derived" ? `Derived ${field.note}` : look.tag;
    const over = limit && field.value.length > limit;
    const cls = `w-full px-3 py-2 border rounded-lg text-slate-900 ${look.input}`;
    return (
        <div>
            <label htmlFor={id} className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{tag}</span>
            </label>
            {options ? (
                <select id={id} value={field.value} onChange={(e) => onChange(e.target.value)} className={cls}>
                    <option value="">(leave blank)</option>
                    {options.map(([value, text]) => (
                        <option key={value} value={value}>{text}</option>
                    ))}
                </select>
            ) : (
                <input id={id} type={type} value={field.value} onChange={(e) => onChange(e.target.value)} className={cls} />
            )}
            {over && (
                <p className="text-xs text-red-700 mt-1">
                    {field.value.length} characters, but the form has {limit} boxes. It will print smaller; shorten it if you can.
                </p>
            )}
        </div>
    );
}

function FieldGroup({ title, children }) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        </section>
    );
}

export default function DealForms({ houses, missingTable }) {
    const [deal, setDeal] = useState(null);
    const [houseId, setHouseId] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onFile(e) {
        const input = e.target;
        const file = input.files?.[0];
        if (!file) return;
        setError("");
        setDeal(null);
        setBusy(true);
        try {
            const { extractPageText } = await import("@/utils/paperwork/extractText");
            setDeal(parseOtp(await extractPageText(await file.arrayBuffer())));
        } catch (err) {
            setError(err instanceof OtpError ? err.message : "Couldn't read that PDF. Upload the original OTP from the dealer system.");
        } finally {
            setBusy(false);
            input.value = ""; // so choosing the same file again re-reads it
        }
    }

    function update(group, key, value) {
        setDeal((d) => {
            const edit = (field) => ({ ...field, value, origin: "edited" });
            return group ? { ...d, [group]: { ...d[group], [key]: edit(d[group][key]) } } : { ...d, [key]: edit(d[key]) };
        });
    }

    async function download(kind) {
        setError("");
        try {
            const { fillForm } = await import("@/utils/paperwork/fillForm");
            const [layout, values] = kind === "rlv" ? [RLV, buildRlvValues(deal, house)] : [NCO, buildNcoValues(deal, house)];
            const template = await (await fetch(`/forms/${kind}.pdf`)).arrayBuffer();
            const bytes = await fillForm(template, layout, values);
            const href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            const link = Object.assign(document.createElement("a"), {
                href,
                download: `${kind.toUpperCase()}-deal-${deal.dealId.value || "otp"}.pdf`,
            });
            link.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch {
            setError("Couldn't create the PDF. Your reviewed details are still here; try again.");
        }
    }

    const person = deal?.customer.kind === "person";
    // A finance house deleted on the other tab while selected: fall back to Cash and say so.
    const house = houses.find((h) => h.id === houseId) ?? null;
    const houseMissing = Boolean(houseId) && !house;

    return (
        <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-6 grid gap-6 sm:grid-cols-2">
                <div>
                    <label htmlFor="otp-file" className="block text-sm font-bold text-slate-700 mb-2">OTP from the dealer system (PDF)</label>
                    <input
                        id="otp-file"
                        type="file"
                        accept="application/pdf"
                        onChange={onFile}
                        disabled={busy}
                        className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 disabled:opacity-60"
                    />
                </div>
                <div>
                    <label htmlFor="finance" className="block text-sm font-bold text-slate-700 mb-2">How is it paid?</label>
                    <select
                        id="finance"
                        value={house ? houseId : ""}
                        onChange={(e) => setHouseId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
                    >
                        <option value="">Cash: the customer is the title holder</option>
                        {houses.map((h) => (
                            <option key={h.id} value={h.id}>Financed by {h.name}</option>
                        ))}
                    </select>
                    {missingTable && (
                        <p className="text-xs text-slate-500 mt-1">Finance houses aren&apos;t set up yet, so only Cash is available.</p>
                    )}
                    {houseMissing && (
                        <p className="text-xs text-red-700 mt-1">The finance house you picked was deleted, so this deal is now set to Cash. Pick again if it&apos;s financed.</p>
                    )}
                </div>
            </section>

            {busy && <p className="text-sm text-slate-500">Reading the OTP…</p>}
            {error && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}

            {deal && (
                <>
                    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900">Deal {deal.dealId.value || "(no deal ID)"}</h2>
                            <div className="flex flex-wrap gap-3">
                                <button type="button" onClick={() => download("rlv")} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                                    Download RLV (blue)
                                </button>
                                <button type="button" onClick={() => download("nco")} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                                    Download NCO (yellow)
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">
                            Check the details below. Amber boxes were worked out from the OTP; dashed boxes weren&apos;t on it.
                            Anything left blank stays blank on the forms, ready for a pen.
                        </p>
                    </section>

                    <FieldGroup title="Customer">
                        {CUSTOMER_FIELDS.filter((f) => person || !f.person).map((f) => (
                            <FieldInput
                                key={f.key}
                                id={`customer-${f.key}`}
                                label={!person && f.orgLabel ? f.orgLabel : f.label}
                                field={deal.customer[f.key]}
                                limit={f.limit}
                                type={f.type}
                                options={f.options}
                                onChange={(value) => update("customer", f.key, value)}
                            />
                        ))}
                    </FieldGroup>

                    <FieldGroup title="Vehicle">
                        {VEHICLE_FIELDS.map((f) => (
                            <FieldInput
                                key={f.key}
                                id={`vehicle-${f.key}`}
                                label={f.label}
                                field={deal.vehicle[f.key]}
                                limit={f.limit}
                                options={f.options}
                                onChange={(value) => update("vehicle", f.key, value)}
                            />
                        ))}
                    </FieldGroup>

                    <FieldGroup title="Sale">
                        <FieldInput
                            id="sale-orderDate"
                            label="Date of sale (date of change / date liable)"
                            field={deal.orderDate}
                            type="date"
                            onChange={(value) => update(null, "orderDate", value)}
                        />
                    </FieldGroup>

                    <section className="bg-white border border-slate-200 rounded-2xl p-6 grid gap-6 sm:grid-cols-2 text-sm">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Always on the forms</h3>
                            <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                {ALWAYS.map((line) => <li key={line}>{line}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Fill in by hand</h3>
                            <p className="text-slate-700">{BY_HAND}</p>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
