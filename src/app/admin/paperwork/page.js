import { listFinanceHouses } from "./actions";
import PaperworkClient from "./PaperworkClient";

export const metadata = { title: "Paperwork | Everest Motoring" };

export default async function PaperworkPage() {
    // Admin access is enforced by src/app/admin/layout.js. listFinanceHouses guards
    // itself too, so swallow the auth error that races the layout redirect.
    let result = { houses: [], missingTable: false };
    try {
        result = await listFinanceHouses();
    } catch {
        result = { houses: [], missingTable: false };
    }

    return (
        <div className="p-8 max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                    Deal <span className="italic">Paperwork</span>
                </h1>
                <p className="text-slate-500 mt-1 font-medium max-w-2xl">
                    Upload the OTP from the dealer system to fill in the RLV and NCO. The OTP stays on
                    this computer: nothing about the deal is saved or sent anywhere.
                </p>
            </div>
            <PaperworkClient initialHouses={result.houses} missingTable={result.missingTable} />
        </div>
    );
}
