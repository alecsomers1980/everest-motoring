import { getVehicleUrl } from "@/utils/url/vehicleUrl";

const DEALER = {
    name: "Everest Motoring",
    telephone: "+27138540600",
    email: "info@everestmotoring.co.za",
    address: {
        "@type": "PostalAddress",
        streetAddress: "9 Chief Mgiyeni Khumalo Drive",
        addressLocality: "White River",
        addressRegion: "Mpumalanga",
        postalCode: "1240",
        addressCountry: "ZA",
    },
};

export function stripUndefined(obj) {
    if (Array.isArray(obj)) {
        return obj
            .map(stripUndefined)
            .filter((v) => v !== undefined && v !== null);
    }
    if (obj && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj)
                .map(([k, v]) => [k, stripUndefined(v)])
                .filter(([, v]) => {
                    if (v === undefined || v === null) return false;
                    if (Array.isArray(v) && v.length === 0) return false;
                    if (typeof v === "string" && v.length === 0) return false;
                    return true;
                })
        );
    }
    return obj;
}

export function buildVehicleJsonLd(car, { siteUrl } = {}) {
    const title = `${car.year} ${car.make} ${car.model}`;
    const canonicalUrl = getVehicleUrl(car, siteUrl);
    const images = [car.main_image_url, ...(Array.isArray(car.images) ? car.images : [])].filter(Boolean);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        name: title,
        url: canonicalUrl,
        description:
            car.description ||
            `Premium pre-owned ${title} for sale at Everest Motoring, White River, Mpumalanga.`,
        image: images,
        brand: { "@type": "Brand", name: car.make },
        model: car.model,
        vehicleModelDate: String(car.year),
        productionDate: String(car.year),
        vehicleIdentificationNumber: car.vin || undefined,
        mileageFromOdometer: car.mileage
            ? {
                  "@type": "QuantitativeValue",
                  value: car.mileage,
                  unitCode: "KMT",
              }
            : undefined,
        vehicleTransmission: car.transmission || undefined,
        fuelType: car.fuel_type || undefined,
        bodyType: car.body_type || undefined,
        color: car.color || undefined,
        vehicleConfiguration:
            Array.isArray(car.features) && car.features.length > 0
                ? car.features.join(", ")
                : undefined,
        itemCondition: "https://schema.org/UsedCondition",
        offers: {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "ZAR",
            price: car.price,
            availability:
                car.status === "available"
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
            itemCondition: "https://schema.org/UsedCondition",
            seller: {
                "@type": "AutoDealer",
                name: DEALER.name,
                url: siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za",
                telephone: DEALER.telephone,
                email: DEALER.email,
                address: DEALER.address,
            },
        },
    };

    return stripUndefined(jsonLd);
}
