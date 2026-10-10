"use client";

import { useState } from "react";
import { saveFinanceHouse, deleteFinanceHouse } from "./actions";
import { FINANCE_HOUSE_COLUMNS } from "@/utils/paperwork/financeHouseFields";

const BLANK = Object.fromEntries(FINANCE_HOUSE_COLUMNS.map((column) => [column, ""]));

// [column, label, options?] per field, grouped like the forms' Part A.
const SECTIONS = [
    {
        title: "Organisation",
        fields: [
            ["name", "Name, as it must appear on the forms"],
            ["id_type", "ID type", [["business_reg", "Business reg. no."], ["traffic_register", "Traffic register no."]]],
            ["id_number", "ID number"],
            ["nature", "Nature of organisation", [["private_company", "Private company"], ["close_corporation", "Close corporation"], ["other", "Other (specify below)"]]],
            ["nature_other", "Other: specify"],
        ],
    },
    {
        title: "Contact",
        fields: [
            ["email", "Email"],
            ["phone_code", "Day phone: area code"],
            ["phone_number", "Day phone: number"],
            ["fax_code", "Fax: area code"],
            ["fax_number", "Fax: number"],
        ],
    },
    {
        title: "Postal address",
        fields: [
            ["postal_line1", "Line 1"], ["postal_line2", "Line 2"], ["postal_line3", "Line 3"],
            ["postal_suburb", "Suburb"], ["postal_city", "City/town"], ["postal_code", "Postal code"],
        ],
    },
    {
        title: "Street address",
        fields: [
            ["street_line1", "Line 1"], ["street_line2", "Line 2"], ["street_line3", "Line 3"],
            ["street_suburb", "Suburb"], ["street_city", "City/town"], ["street_code", "Postal code"],
        ],
    },
    {
        title: "Notices and proxy",
        fields: [
            ["notices_to", "Send notices to", [["postal", "Postal address"], ["street", "Street address"]]],
            ["proxy_id_type", "Proxy ID type", [["rsa_id", "RSA ID"], ["foreign_id", "Foreign ID"], ["traffic_register", "Traffic register no."]]],
            ["proxy_id_number", "Proxy ID number"],
            ["proxy_surname", "Proxy surname"],
            ["proxy_initials", "Proxy initials"],
        ],
    },
];

const INPUT = "w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900";

export default function FinanceHouses({ houses, onChange, missingTable }) {
    const [form, setForm] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    if (missingTable) {
        return (
            <p className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-700">
                Finance houses need a one-off database setup. Run{" "}
                <code className="font-mono text-sm">supabase/migrations/20261010_finance_houses.sql</code> in the Supabase
                SQL editor, then reload this page.
            </p>
        );
    }

    function open(house) {
        setError("");
        setForm(house ? { ...BLANK, ...Object.fromEntries(Object.entries(house).map(([k, v]) => [k, v ?? ""])) } : { ...BLANK });
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const result = await saveFinanceHouse(form);
            if (result.error) {
                setError(result.error);
                return;
            }
            const others = houses.filter((h) => h.id !== result.house.id);
            onChange([...others, result.house].sort((a, b) => a.name.localeCompare(b.name)));
            setForm(null);
        } catch {
            setError("Couldn't save. Try again.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(house) {
        if (!window.confirm(`Delete ${house.name}? Forms already downloaded aren't affected.`)) return;
        setError("");
        try {
            await deleteFinanceHouse(house.id);
            onChange(houses.filter((h) => h.id !== house.id));
        } catch {
            setError("Couldn't delete. Try again.");
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}

            {form ? (
                <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-8">
                    <h2 className="text-xl font-bold text-slate-900">{form.id ? `Edit ${form.name}` : "Add a finance house"}</h2>
                    {SECTIONS.map((section) => (
                        <fieldset key={section.title}>
                            <legend className="text-sm font-black uppercase tracking-wide text-slate-500 mb-3">{section.title}</legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {section.fields.map(([key, label, options]) => (
                                    <div key={key}>
                                        <label htmlFor={`fh-${key}`} className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
                                        {options ? (
                                            <select id={`fh-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={INPUT}>
                                                <option value="">(not set)</option>
                                                {options.map(([value, text]) => (
                                                    <option key={value} value={value}>{text}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                id={`fh-${key}`}
                                                value={form[key]}
                                                required={key === "name"}
                                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                                className={INPUT}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    <div className="flex gap-3">
                        <button type="submit" disabled={saving} className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold rounded-lg">
                            {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setForm(null)} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-slate-500 max-w-xl">
                            Banks that can be the title holder on a financed sale. Their details fill RLV Part A and NCO Part B.
                        </p>
                        <button type="button" onClick={() => open(null)} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                            Add a finance house
                        </button>
                    </div>
                    {houses.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No finance houses yet.</p>
                    ) : (
                        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
                            {houses.map((h) => (
                                <li key={h.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-900">{h.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {h.id_number || "No ID number yet"}
                                            {h.proxy_surname ? ` · proxy ${h.proxy_surname}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => open(h)} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => remove(h)} className="px-4 py-2 border border-red-200 rounded-lg font-bold text-red-700 hover:bg-red-50">
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
