import { getOfflineSales } from "../inventory/sale_actions";
import OfflineSalesManager from "./OfflineSalesManager";

export const metadata = { title: "Off-Inventory Sales | Everest Motoring" };

// The handover-video server actions (startSaleVideo/pollSaleVideo) are dispatched
// from this page via SaleVideoPicker and poll Seedance for minutes — they inherit
// this page's timeout, so it must match the inventory page's 300s ceiling.
export const maxDuration = 300;

export default async function OfflineSalesPage() {
    // Admin access is enforced by src/app/admin/layout.js. getOfflineSales guards
    // itself too, so swallow the auth error that races the layout redirect for
    // unauthenticated requests rather than surfacing a 500.
    let sales = [];
    try {
        sales = await getOfflineSales();
    } catch {
        sales = [];
    }

    return (
        <div className="p-8 max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                    Off-Inventory <span className="italic">Sales</span>
                </h1>
                <p className="text-slate-500 mt-1 font-medium max-w-2xl">
                    Record a vehicle that was sold but never listed in the inventory. It runs the same
                    post-sale automation — review email, handover video and (optionally) the social
                    celebration post.
                </p>
            </div>

            <OfflineSalesManager initialSales={sales} />
        </div>
    );
}
