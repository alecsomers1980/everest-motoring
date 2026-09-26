import ValueMyCarForm from "./ValueMyCarForm";

export const metadata = {
    title: "Value My Car | Instant Trade-in Valuation | Everest Motoring",
    description: "Get an instant, obligation-free valuation for your vehicle. We pay top market rates for premium, accident-free cars in South Africa.",
};

import PageBanner from "@/components/PageBanner";

export default function ValueMyCarPage() {
    return (
        <div className="bg-background-alt min-h-screen">
            <PageBanner
                title="Trade In or Sell Your Car"
                subtitle="We are actively sourcing premium, accident-free stock. Get a highly competitive offer for your vehicle today."
            />

            <section className="py-20 px-4 lg:px-12">
                <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-slate-100 -mt-16 relative z-20">
                    <h2 className="text-2xl font-bold text-slate-900 mb-8 pb-4 border-b border-slate-100">Vehicle Details</h2>

                    <ValueMyCarForm />
                </div>
            </section>
        </div>
    );
}
