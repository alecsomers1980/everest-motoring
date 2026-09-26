import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { createAdminClient } from "@/utils/supabase/server";

const LOGO_URL = "https://everestmotoring.co.za/images/logo.png";

export async function GET(request, { params }) {
    const { carId } = await params;
    const { searchParams } = new URL(request.url);
    const ref = searchParams.get("ref") || "";

    const supabase = await createAdminClient();
    const { data: car, error } = await supabase
        .from("cars")
        .select("id, make, model, year, price, mileage, transmission, fuel_type, colour, manufacturer_colour, main_image_url, gallery_urls")
        .eq("id", carId)
        .single();

    if (error || !car) {
        return new Response("Car not found", { status: 404 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
    const trackingLink = `${siteUrl}/inventory/${car.id}${ref ? `?ref=${ref}` : ""}`;
    const qrDataUrl = await QRCode.toDataURL(trackingLink, {
        margin: 1,
        width: 220,
        color: { dark: "#000000", light: "#ffff01" },
    });

    const price = `R ${new Intl.NumberFormat("en-ZA").format(car.price)}`;
    const specRows = [
        car.mileage ? { label: "Mileage", value: `${new Intl.NumberFormat("en-ZA").format(car.mileage)} km` } : null,
        car.transmission ? { label: "Transmission", value: car.transmission } : null,
        car.fuel_type ? { label: "Fuel Type", value: car.fuel_type } : null,
        (car.manufacturer_colour || car.colour) ? { label: "Colour", value: car.manufacturer_colour || car.colour } : null,
    ].filter(Boolean);

    const galleryUrls = Array.isArray(car.gallery_urls) ? car.gallery_urls.slice(0, 1) : [];
    const hasGallery = galleryUrls.length > 0;
    const heroHeight = hasGallery ? 235 : 347;
    const thumbHeight = 100;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "1080px",
                    height: "1080px",
                    display: "flex",
                    flexDirection: "column",
                    background: "#000000",
                    fontFamily: "Arial, Helvetica, sans-serif",
                }}
            >
                {/* Header: Everest Motoring logo */}
                <div
                    style={{
                        display: "flex",
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "14px 0",
                        borderBottom: "6px solid #ffff01",
                    }}
                >
                    <img src={LOGO_URL} style={{ width: 190, height: 147, objectFit: "contain" }} />
                </div>

                {/* Car image */}
                <div
                    style={{
                        display: "flex",
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "14px 32px 0 32px",
                    }}
                >
                    <img
                        src={car.main_image_url}
                        style={{ width: 1016, height: heroHeight, objectFit: "contain" }}
                    />
                </div>

                {/* Gallery thumbnails (max 2), original aspect ratio preserved */}
                {hasGallery && (
                    <div style={{ display: "flex", flexShrink: 0, justifyContent: "center", gap: 12, padding: "12px 32px 0 32px" }}>
                        {galleryUrls.map((url, i) => (
                            <img
                                key={i}
                                src={url}
                                style={{ width: 320, height: thumbHeight, objectFit: "contain" }}
                            />
                        ))}
                    </div>
                )}

                {/* Spec block */}
                <div
                    style={{
                        display: "flex",
                        flexShrink: 0,
                        flexDirection: "column",
                        padding: "16px 48px 0 48px",
                    }}
                >
                    <span style={{ color: "#ffffff", fontSize: 42, fontWeight: 700 }}>
                        {car.year} {car.make} {car.model}
                    </span>
                    <span style={{ color: "#ffff01", fontSize: 60, fontWeight: 800, marginTop: 8 }}>
                        {price}
                    </span>

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            marginTop: 16,
                            padding: "14px 24px",
                            border: "2px solid #ffff01",
                            borderRadius: 12,
                        }}
                    >
                        {specRows.map((row, i) => (
                            <div
                                key={row.label}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: "7px 0",
                                    borderBottom: i < specRows.length - 1 ? "1px solid #262626" : "none",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center" }}>
                                    <div style={{ width: 12, height: 12, background: "#ffff01", marginRight: 12 }} />
                                    <span style={{ color: "#a3a3a3", fontSize: 26 }}>{row.label}</span>
                                </div>
                                <span style={{ color: "#ffffff", fontSize: 26, fontWeight: 700 }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer: QR + tracking link */}
                <div
                    style={{
                        display: "flex",
                        flexShrink: 0,
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "auto",
                        padding: "20px 48px",
                        background: "#111111",
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ color: "#ffff01", fontSize: 22, fontWeight: 700 }}>
                            SCAN TO VIEW &amp; ENQUIRE
                        </span>
                        <span style={{ color: "#a3a3a3", fontSize: 18, marginTop: 6 }}>
                            everestmotoring.co.za
                        </span>
                    </div>
                    <img src={qrDataUrl} width={150} height={150} style={{ borderRadius: 8 }} />
                </div>
            </div>
        ),
        { width: 1080, height: 1080 }
    );
}
