import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import LeadForm from "./LeadForm";
import VehicleGallery from "./VehicleGallery";
import FinanceCalculator from "@/components/FinanceCalculator";
import WhatsAppButton from "@/components/WhatsAppButton";
import { vehicleEnquiryMessage } from "@/utils/whatsapp";
import { siteConfig } from "@/app/layout";
import ViewItemTracker from "@/components/ViewItemTracker";
import { buildVehicleJsonLd } from "@/utils/seo/vehicleSchema";
import { getVehicleUrl } from "@/utils/url/vehicleUrl";
import {
    computeFallbackMetaTitle,
    computeFallbackMetaDescription,
} from "@/utils/ai/seoGenerator";
import Icon from "@/components/Icon";
import { Label } from "@/components/ui/Surface";
import { calculateMonthly, formatRand } from "@/utils/finance/calculator";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SERVICE_HISTORY_LABELS = {
    full_franchise: "Full Franchise Service History",
    full: "Full Service History",
    full_non_franchise: "Full Service History (Non-Franchise)",
    full_partial_franchise: "Full History, Partially Franchise",
    partial: "Partial Service History",
    none: "No Service History",
};

function formatWarranty(car) {
    if (car.has_warranty == null) return null;
    if (!car.has_warranty) return "No";
    const parts = [];
    if (car.warranty_end_date) {
        const d = new Date(car.warranty_end_date);
        if (!isNaN(d)) {
            parts.push(`until ${d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}`);
        }
    }
    if (car.warranty_mileage) {
        parts.push(`${new Intl.NumberFormat('en-ZA').format(car.warranty_mileage)} km`);
    }
    return parts.length > 0 ? `Yes — ${parts.join(' / ')}` : "Yes";
}

async function resolveCar(supabase, param, columns) {
    if (UUID_REGEX.test(param)) {
        return await supabase.from("cars").select(columns).eq("id", param).single();
    }
    // Slug format: "...-{8char-hex}" — match by uuid range on the leading 8 hex chars.
    // Plain ilike on a uuid column fails at Postgres (type mismatch), so we use gte/lte
    // bounds that cover every uuid starting with shortId.
    const shortId = param.split("-").pop();
    if (/^[0-9a-f]{8}$/i.test(shortId)) {
        const lo = `${shortId}-0000-0000-0000-000000000000`;
        const hi = `${shortId}-ffff-ffff-ffff-ffffffffffff`;
        return await supabase
            .from("cars")
            .select(columns)
            .gte("id", lo)
            .lte("id", hi)
            .limit(1)
            .single();
    }
    return { data: null, error: new Error("Invalid identifier") };
}

export async function generateMetadata({ params }) {
    const { id } = await params;
    const supabase = await createClient();
    const { data: car } = await resolveCar(
        supabase,
        id,
        "id, make, model, year, price, mileage, transmission, fuel_type, main_image_url, seo_meta_title, seo_meta_description"
    );

    if (!car) return { title: "Vehicle Not Found" };

    const title = car.seo_meta_title || computeFallbackMetaTitle(car);
    const description = car.seo_meta_description || computeFallbackMetaDescription(car);
    const canonicalUrl = getVehicleUrl(car, SITE_URL);

    return {
        title,
        description,
        alternates: { canonical: canonicalUrl },
        openGraph: {
            title,
            description,
            url: canonicalUrl,
            type: "website",
            images: car.main_image_url ? [{ url: car.main_image_url }] : [],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: car.main_image_url ? [car.main_image_url] : [],
        },
    };
}

export default async function CarDetailsPage({ params }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: car, error } = await resolveCar(supabase, id, "*");

    if (error || !car) {
        notFound();
    }

    const jsonLd = buildVehicleJsonLd(car, { siteUrl: SITE_URL });

    return (
        <>
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ViewItemTracker car={car} />
        <div className="bg-background-alt min-h-screen py-10 px-4 lg:px-10">
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-2xl border border-hairline overflow-hidden">

                    <VehicleGallery car={car} />

                    {/* Details Content */}
                    <div className="px-6 py-12 md:px-14 md:py-16">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-14 pb-10 border-b border-hairline">
                            <div>
                                <Label className="mb-3">
                                    {car.status === 'available' ? 'Available now' : 'Reserved'}
                                </Label>
                                <p className="text-lg text-slate-500">{car.year} {car.make}</p>
                                <h1 className="text-display-md font-semibold text-slate-900 mt-1">
                                    {car.model}
                                </h1>
                            </div>
                            <div className="md:text-right shrink-0">
                                <Label className="mb-2">Retail price</Label>
                                <div className="text-display-md font-semibold text-slate-900 whitespace-nowrap">
                                    R {new Intl.NumberFormat('en-ZA').format(car.price)}
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    from {formatRand(calculateMonthly({ price: Number(car.price) || 0 }).monthly)} p/m
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                            <div className="lg:col-span-2">
                                <Label as="h2" className="mb-5">Specification</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-14">
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Make</p>
                                        <p className="font-semibold text-slate-900">{car.make}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Model</p>
                                        <p className="font-semibold text-slate-900">{car.model}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Year</p>
                                        <p className="font-semibold text-slate-900">{car.year}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Mileage</p>
                                        <p className="font-semibold text-slate-900">{new Intl.NumberFormat('en-ZA').format(car.mileage)} km</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Transmission</p>
                                        <p className="font-semibold text-slate-900">{car.transmission || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                        <p className="text-sm text-slate-500 mb-1">Fuel Type</p>
                                        <p className="font-semibold text-slate-900">{car.fuel_type || 'N/A'}</p>
                                    </div>
                                    {car.drivetrain && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                            <p className="text-sm text-slate-500 mb-1">Drivetrain</p>
                                            <p className="font-semibold text-slate-900">{car.drivetrain}</p>
                                        </div>
                                    )}
                                    {car.condition_rating && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                            <p className="text-sm text-slate-500 mb-1">Condition</p>
                                            <p className="font-semibold text-slate-900">{car.condition_rating}</p>
                                        </div>
                                    )}
                                    {(car.colour || car.manufacturer_colour) && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                            <p className="text-sm text-slate-500 mb-1">Colour</p>
                                            <p className="font-semibold text-slate-900">
                                                {car.manufacturer_colour || car.colour}
                                                {car.manufacturer_colour && car.colour && car.manufacturer_colour !== car.colour && (
                                                    <span className="block text-xs font-medium text-slate-500 mt-0.5">{car.colour}</span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                    {car.service_history && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-hairline">
                                            <p className="text-sm text-slate-500 mb-1">Service History</p>
                                            <p className="font-semibold text-slate-900">{SERVICE_HISTORY_LABELS[car.service_history] || car.service_history}</p>
                                        </div>
                                    )}
                                    {formatWarranty(car) && (
                                        <div className={`p-4 rounded-xl border ${car.has_warranty ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-hairline'}`}>
                                            <p className="text-sm text-slate-500 mb-1 flex items-center gap-1">
                                                {car.has_warranty && <Icon name="verified" className="text-green-600 text-[16px]" />}
                                                Warranty
                                            </p>
                                            <p className={`font-semibold ${car.has_warranty ? 'text-green-800' : 'text-slate-900'}`}>{formatWarranty(car)}</p>
                                        </div>
                                    )}
                                </div>

                                {car.features && car.features.length > 0 && (
                                    <>
                                        <Label as="h2" className="mb-5">Features</Label>
                                        <ul className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 mb-14">
                                            {car.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-700">
                                                    <Icon name="check" className="text-primary-ink text-[16px] mt-0.5" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}

                                {car.description && (
                                    <>
                                        <Label as="h2" className="mb-5">About this vehicle</Label>
                                        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-line mb-4">
                                            {car.description}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* CRM Lead Generation Sidebar */}
                            <div className="h-fit space-y-6">
                            <div className="bg-black rounded-2xl p-8 text-white">
                                <h2 className="text-xl font-semibold mb-3">Interested in this car?</h2>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                    Leave your details and a sales executive will contact you to arrange a viewing or discuss finance.
                                </p>

                                <LeadForm carId={car.id} />

                                <div className="mt-6 space-y-3">
                                    <WhatsAppButton
                                        number={siteConfig.whatsapp}
                                        message={vehicleEnquiryMessage(car)}
                                        label="WhatsApp about this car"
                                    />
                                    <a
                                        href={`tel:${siteConfig.phone.replace(/\s/g, "")}`}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-base font-bold text-black transition-colors hover:bg-primary-dark"
                                    >
                                        <Icon name="call" className="text-[20px]" />
                                        Call {siteConfig.phone}
                                    </a>
                                </div>

                                <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <Icon name="lock" className="text-[14px]" />
                                    Your details are kept private
                                </p>
                            </div>

                            <FinanceCalculator price={Number(car.price) || 0} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}
