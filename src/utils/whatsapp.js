// Builds wa.me deep links. Returns null when no number is configured so callers
// can render nothing rather than linking customers to an unknown account.
export function buildWhatsAppLink(number, message) {
    const digits = String(number || "").replace(/\D/g, "");
    if (!digits) return null;
    const query = message ? `?text=${encodeURIComponent(message)}` : "";
    return `https://wa.me/${digits}${query}`;
}

export function vehicleEnquiryMessage(car) {
    const name = [car.year, car.make, car.model].filter(Boolean).join(" ");
    const price = car.price
        ? ` (R ${new Intl.NumberFormat("en-ZA").format(car.price)})`
        : "";
    return `Hi Everest Motoring, I'm interested in the ${name}${price}. Is it still available?`;
}
