import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createAdminClient } from "@/utils/supabase/server";

const LOGO_URL = "https://everestmotoring.co.za/images/logo.png";
const WIDTH = 1000;
const HEIGHT = 1414; // A4 portrait ratio (210mm x 297mm)

// Dealership sales contacts printed on the flyer (name in yellow, number in white).
const CONTACTS = [
  { name: "Anton", number: "078 893 8881" },
  { name: "George", number: "082 478 7676" },
];

export async function GET(request, { params }) {
  const { carId } = await params;

  const supabase = await createAdminClient();
  const { data: car, error } = await supabase
    .from("cars")
    .select(
      "id, make, model, year, price, mileage, transmission, fuel_type, colour, manufacturer_colour, main_image_url, gallery_urls, features, status"
    )
    .eq("id", carId)
    .single();

  if (error || !car) {
    return new Response("Car not found", { status: 404 });
  }

  // Load the Microgramma brand font (the typeface the website uses for titles).
  // This route runs in the Node runtime (Supabase + qrcode), where fetch() can't
  // read file:// URLs, so read the traced asset synchronously and hand Satori a
  // clean ArrayBuffer. If it can't be loaded, fall back to the default font so
  // the flyer still renders rather than 500-ing.
  let fontsOption;
  try {
    const buf = readFileSync(
      fileURLToPath(new URL("../../../../../fonts/MicrogrammaDExtendedBold.otf", import.meta.url))
    );
    const microgramma = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    fontsOption = [{ name: "Microgramma", data: microgramma, weight: 700, style: "normal" }];
  } catch (e) {
    console.warn("Flyer: Microgramma font load failed, using default:", e.message);
    fontsOption = undefined;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
  const listingLink = `${siteUrl}/inventory/${car.id}`;
  const qrDataUrl = await QRCode.toDataURL(listingLink, {
    margin: 1,
    width: 240,
    color: { dark: "#000000", light: "#ffff01" },
  });

  // en-ZA groups thousands with a non-breaking / narrow space (U+00A0 / U+202F)
  // which renders as tofu once a custom font is loaded — normalise to a plain space.
  const nf = (n) => new Intl.NumberFormat("en-ZA").format(n).replace(/\s/g, " ");
  const price = `R ${nf(car.price)}`;
  const specRows = [
    car.mileage
      ? { label: "Mileage", value: `${nf(car.mileage)} km` }
      : null,
    car.transmission ? { label: "Transmission", value: car.transmission } : null,
    car.fuel_type ? { label: "Fuel Type", value: car.fuel_type } : null,
    car.manufacturer_colour || car.colour
      ? { label: "Colour", value: car.manufacturer_colour || car.colour }
      : null,
  ].filter(Boolean);

  const features = Array.isArray(car.features) ? car.features.slice(0, 9) : [];
  const isAvailable = car.status === "available";

  const heroHeight = 400;
  const footerHeight = 360;
  const footerBarHeight = 40;
  const footerWedgeTopOffset = 24;
  const footerWedgeTopWidth = 360;
  const footerWedgeBottomWidth = 530;
  const ctaSectionMargin = 36;
  const ctaCardPadding = 24;
  const ctaCardWidth = WIDTH - ctaSectionMargin * 2;
  const ctaQrSize = 100;
  const ctaGap = 24;
  const ctaTextWidth = ctaCardWidth - ctaCardPadding * 2 - ctaQrSize - ctaGap - 2;

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          position: "relative",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        {/* Watermark */}
        <img
          src={LOGO_URL}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 1000,
            opacity: 0.05,
          }}
        />

        {/* 1. Hero */}
        <div style={{ display: "flex", flexShrink: 0, height: heroHeight, background: "#000000" }}>
          <img
            src={car.main_image_url}
            style={{ width: WIDTH, height: heroHeight, objectFit: "cover" }}
          />
        </div>

        {/* 2. Title / Price */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "32px 40px 28px 40px",
            borderBottom: "1px solid #eef2f7",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: isAvailable ? "#16a34a" : "#d97706",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 2.5,
                  color: isAvailable ? "#16a34a" : "#d97706",
                }}
              >
                {isAvailable ? "Available Now" : "Reserved"}
              </div>
            </div>
            {/* Title using the brand font */}
            <div
              style={{
                display: "flex",
                fontFamily: "Microgramma",
                textTransform: "uppercase",
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1.18,
                color: "#0f172a",
                maxWidth: 600,
              }}
            >
              {car.year} {car.make} {car.model}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flexShrink: 0,
              marginLeft: 24,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 3,
                color: "#94a3b8",
                marginBottom: 9,
              }}
            >
              Retail Price
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#0f172a",
                borderRadius: 12,
                padding: "13px 26px 13px 22px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 5,
                  background: "#ffff01",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: 37,
                  fontWeight: 800,
                  color: "#ffffff",
                  letterSpacing: 0.5,
                  paddingLeft: 8,
                }}
              >
                {price}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Specifications */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, padding: "26px 36px 0 36px" }}>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: 12,
              marginBottom: 16,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Vehicle Specifications
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {specRows.map((row) => (
              <div
                key={row.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                  borderRadius: 12,
                  padding: "14px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 13,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 5,
                  }}
                >
                  {row.label}
                </div>
                <div style={{ display: "flex", fontSize: 18, color: "#0f172a", fontWeight: 700 }}>
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Premium Features */}
        {features.length > 0 && (
          <div
            style={{ display: "flex", flexDirection: "column", flexShrink: 0, padding: "26px 36px 0 36px" }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 800,
                color: "#0f172a",
                borderBottom: "1px solid #f1f5f9",
                paddingBottom: 12,
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Premium Features
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 0" }}>
              {features.map((feature, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 11, width: "33.33%" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      background: "#0f172a",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffff01"
                      strokeWidth={3.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", fontSize: 16, color: "#334155", fontWeight: 600 }}>
                    {feature}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4b. Interested + QR, full width */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            gap: ctaGap,
            width: ctaCardWidth,
            margin: `20px ${ctaSectionMargin}px 0 ${ctaSectionMargin}px`,
            background: "#f8fafc",
            border: "1px solid #f1f5f9",
            borderRadius: 16,
            padding: ctaCardPadding,
          }}
        >
          <img
            src={qrDataUrl}
            style={{ width: ctaQrSize, height: ctaQrSize, borderRadius: 10, border: "3px solid #ffff01", flexShrink: 0 }}
          />
          <div style={{ display: "flex", flexDirection: "column", width: ctaTextWidth }}>
            <div style={{ display: "flex", fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
              INTERESTED IN THIS CAR?
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "#64748b", lineHeight: 1.4 }}>
              Scan the code to view the full listing, or call our team directly.
            </div>
          </div>
        </div>

        {/* 5. Bottom Panel — angled black wedge + full-width base bar */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            marginTop: "auto",
            width: "100%",
            height: footerHeight,
            position: "relative",
          }}
        >
          {/* Black wedge (narrows going down) + full-width bar at the very bottom + yellow top border */}
          <svg
            width={WIDTH}
            height={footerHeight}
            viewBox={`0 0 ${WIDTH} ${footerHeight}`}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <polygon
              points={`0,${footerWedgeTopOffset} ${footerWedgeTopWidth},${footerWedgeTopOffset} ${footerWedgeBottomWidth},${footerHeight - footerBarHeight} ${WIDTH},${footerHeight - footerBarHeight} ${WIDTH},${footerHeight} 0,${footerHeight}`}
              fill="#000000"
            />
            <rect x="0" y={footerWedgeTopOffset} width={footerWedgeTopWidth} height="5" fill="#ffff01" />
          </svg>

          {/* Black-area content — logo, socials, address, phone */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 52,
              left: 50,
              width: 260,
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <img src={LOGO_URL} style={{ width: 100, height: 78, objectFit: "contain" }} />
            <div style={{ display: "flex", width: "60%", height: 1, background: "rgba(255,255,255,0.15)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffff01" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>everestmotoring.co.za</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffff01">
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
              </svg>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>/everestmotoring</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffff01" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>@everestmotoring</div>
            </div>
            <div style={{ display: "flex", width: "60%", height: 1, background: "rgba(255,255,255,0.15)" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", color: "#ffffff", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                9 Chief Mgiyeni Khumalo Drive
              </div>
              <div style={{ display: "flex", color: "#ffffff", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
                White River, Mpumalanga, 1240
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffff01" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <div style={{ display: "flex", color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>013 854 0600</div>
            </div>
          </div>

          {/* White-area content — sales contacts, sitting on the plain white page above the base bar */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 545,
              width: WIDTH - 545 - 40,
              height: footerHeight - footerBarHeight,
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: "#94a3b8", marginBottom: 14, textTransform: "uppercase" }}>
              SPEAK TO OUR SALES TEAM
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              {CONTACTS.map((contact, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ display: "flex", background: "#0f172a", borderRadius: 24, padding: "8px 22px", marginBottom: 10 }}>
                    <div style={{ display: "flex", color: "#ffff01", fontSize: 24, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>
                      {contact.name}
                    </div>
                  </div>
                  <div style={{ display: "flex", fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: 0.5 }}>
                    {contact.number}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: fontsOption,
      headers: {
        "Content-Disposition": `attachment; filename="${`${car.year}-${car.make}-${car.model}-Flyer`.replace(/\s+/g, "-")}.png"`,
      },
    }
  );
}