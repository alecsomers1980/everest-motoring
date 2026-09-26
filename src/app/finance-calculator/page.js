import PageBanner from "@/components/PageBanner";
import StandaloneFinanceCalculator from "./StandaloneFinanceCalculator";

export const metadata = {
    title: "Car Finance Calculator South Africa | Everest Motoring",
    description:
        "Free car finance calculator for South Africa. Enter any vehicle price and instantly estimate your monthly instalment, including deposit, term, and balloon payment options.",
};

const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Everest Motoring Car Finance Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    url: "https://everestmotoring.co.za/finance-calculator",
    offers: { "@type": "Offer", price: "0", priceCurrency: "ZAR" },
    description:
        "Free instant car finance calculator for South African buyers. Estimate your monthly vehicle repayment based on price, deposit, term, and balloon payment.",
};

export default function FinanceCalculatorPage() {
    return (
        <div className="bg-background-light min-h-screen">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <PageBanner
                title="Car Finance Calculator"
                subtitle="Free and instant. Enter any vehicle price to estimate your monthly repayment before you even start browsing."
            />

            <section className="py-16 px-4 lg:px-12">
                <div className="max-w-2xl mx-auto">
                    <StandaloneFinanceCalculator />
                </div>
            </section>
        </div>
    );
}
