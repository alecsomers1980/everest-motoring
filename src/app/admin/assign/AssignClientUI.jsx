"use client"

import { useState } from "react";
import { assignCarAction } from "./actions";

export default function AssignClientUI({ clients, vehicles, activeAssigns }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedCar, setSelectedCar] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const [newClient, setNewClient] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: ""
    });

    const filteredClients = searchQuery.length >= 3
        ? clients.filter(c =>
            `${c.first_name} ${c.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.phone && c.phone.includes(searchQuery))
        )
        : [];

    const handleAssign = async () => {
        setMessage({ text: "", type: "" });
        if (!selectedClient || !selectedCar) {
            setMessage({ text: "Please select both a client and a vehicle.", type: "error" });
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("client_id", selectedClient.id);
        formData.append("client_name", `${selectedClient.first_name || ''} ${selectedClient.last_name || ''}`.trim());
        formData.append("client_phone", selectedClient.phone || '');
        formData.append("car_id", selectedCar);

        const res = await assignCarAction(formData);
        setIsSubmitting(false);

        if (res.error) {
            setMessage({ text: res.error, type: "error" });
        } else {
            setMessage({ text: "Vehicle successfully assigned!", type: "success" });
            setSelectedClient(null);
            setSelectedCar("");
        }
    };

    const handleSendInvite = () => {
        const { firstName, lastName, email, phone } = newClient;
        if (!firstName) {
            alert("Please enter at least a first name to generate the invite.");
            return;
        }

        if (!email && !phone) {
            alert("Please enter either an email address or a phone number to send the invite.");
            return;
        }

        // Generate the URL payload
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://everestmotoring.co.za';
        const params = new URLSearchParams();
        params.append("first_name", firstName);
        if (lastName) params.append("last_name", lastName);
        if (email) params.append("email", email);
        if (phone) params.append("phone", phone);

        const link = `${origin}/auth/register-client?${params.toString()}`;
        const message = `Hi ${firstName}, here is your registration link for Everest Motoring: \n\n${link}`;

        if (phone) {
            const formattedPhone = phone.replace(/\D/g, ''); // Extract just digits
            const waLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
            window.open(waLink, '_blank');
        }

        if (email) {
            const mailtoLink = `mailto:${email}?subject=${encodeURIComponent("Everest Motoring Registration")}&body=${encodeURIComponent(message)}`;
            if (!phone) {
                window.location.href = mailtoLink;
            } else {
                setTimeout(() => {
                    window.location.href = mailtoLink;
                }, 300);
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Select Existing */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Assign to Existing Client</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Search Clients</label>
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="border border-slate-200 rounded max-h-64 overflow-y-auto mb-4">
                    {searchQuery.length < 3 ? (
                        <div className="p-4 text-slate-500 text-center text-sm">Type at least 3 characters to search for a client.</div>
                    ) : filteredClients.length === 0 ? (
                        <div className="p-4 text-slate-500 text-center text-sm">No clients found.</div>
                    ) : (
                        <ul className="divide-y divide-slate-200">
                            {filteredClients.map((client) => (
                                <li
                                    key={client.id}
                                    className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedClient?.id === client.id ? 'bg-amber-50 border-l-4 border-primary' : ''}`}
                                    onClick={() => setSelectedClient(client)}
                                >
                                    <p className="font-semibold text-slate-800">{client.first_name} {client.last_name}</p>
                                    <p className="text-sm text-slate-500">{client.phone}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {selectedClient && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 mb-4">
                        <span className="text-sm font-semibold text-slate-600">Selected Client: </span>
                        <span className="text-slate-900 font-bold">{selectedClient.first_name} {selectedClient.last_name}</span>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Available Vehicle</label>
                    <select
                        className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        value={selectedCar}
                        onChange={(e) => setSelectedCar(e.target.value)}
                    >
                        <option value="">-- Select a Vehicle --</option>
                        {vehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                                {v.year} {v.make} {v.model} - R {v.price ? v.price.toLocaleString('en-US') : 'N/A'}
                            </option>
                        ))}
                    </select>
                </div>

                {message.text && (
                    <div className={`p-4 mb-4 rounded text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {message.text}
                    </div>
                )}

                <button
                    onClick={handleAssign}
                    disabled={isSubmitting}
                    className="w-full py-2 bg-primary text-black font-bold rounded hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Assigning...' : 'Assign Vehicle'}
                </button>
            </div>

            {/* Right Column: Add New */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Invite New Client</h2>
                <p className="text-sm text-slate-600 mb-6">
                    Fill in the details below to generate an invite. Sending the message will prompt the client to sign up on their device via email or WhatsApp. Once they register, they will appear in the existing clients list to be assigned a vehicle.
                </p>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                value={newClient.firstName}
                                onChange={(e) => setNewClient({ ...newClient, firstName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                value={newClient.lastName}
                                onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            value={newClient.email}
                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                        <input
                            type="tel"
                            className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSendInvite}
                        className="w-full py-2 bg-green-500 text-white font-bold rounded flex justify-center items-center gap-2 hover:bg-green-600 transition-colors mt-6"
                    >
                        <span>Send Invite</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row: Active Assignments */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-4">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Currently Assigned Vehicles</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 text-sm font-semibold text-slate-600">Client</th>
                                <th className="p-4 text-sm font-semibold text-slate-600">Vehicle</th>
                                <th className="p-4 text-sm font-semibold text-slate-600">Assigned Date</th>
                                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeAssigns && activeAssigns.length > 0 ? (
                                activeAssigns.map((lead) => (
                                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <p className="font-bold text-slate-900">{lead.client_name}</p>
                                            <p className="text-sm text-slate-500">{lead.client_phone}</p>
                                        </td>
                                        <td className="p-4">
                                            {lead.cars ? (
                                                <p className="text-slate-800 font-medium">
                                                    {lead.cars.year} {lead.cars.make} {lead.cars.model}
                                                </p>
                                            ) : (
                                                <span className="text-slate-400 italic">No vehicle linked</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600" suppressHydrationWarning>
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                                                lead.status === 'finance_pending' ? 'bg-amber-100 text-amber-700' :
                                                    lead.status === 'reviewing' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {lead.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="p-6 text-center text-slate-500">
                                        No active assignments found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
