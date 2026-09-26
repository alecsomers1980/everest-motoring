export function slugify(str) {
    return String(str || "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export function getVehicleSlug(car) {
    const shortId = String(car.id).split("-")[0];
    const slug = slugify(`${car.year}-${car.make}-${car.model}`);
    return `${slug}-${shortId}`;
}

export function getVehiclePath(car) {
    return `/inventory/${getVehicleSlug(car)}`;
}

export function getVehicleUrl(car, siteUrl) {
    const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
    return `${base}${getVehiclePath(car)}`;
}
