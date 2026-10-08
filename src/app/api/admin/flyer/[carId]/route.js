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

// Short labels for the flyer table, plus the phrase used in the description.
const SERVICE_HISTORY = {
  full_franchise: { short: "Full (franchise)", phrase: "a full franchise service history" },
  full: { short: "Full", phrase: "a full service history" },
  full_non_franchise: { short: "Full (non-franchise)", phrase: "a full service history" },
  full_partial_franchise: { short: "Full (part franchise)", phrase: "a full service history" },
  partial: { short: "Partial", phrase: "a partial service history" },
  none: { short: "None" },
};

// SA listings say 4x2, the admin form stores 2x4.
const DRIVETRAIN = { "2x4": "4x2", "4x4": "4x4", AWD: "AWD" };

export async function GET(request, { params }) {
  const { carId } = await params;

  const supabase = await createAdminClient();
  const { data: car, error } = await supabase
    .from("cars")
    .select(
      "id, make, model, year, price, mileage, transmission, fuel_type, colour, manufacturer_colour, main_image_url, gallery_urls, features, condition, drivetrain, previous_owners, service_history, has_warranty"
    )
    .eq("id", carId)
    .single();

  if (error || !car) {
    return new Response("Car not found", { status: 404 });
  }
  // Some models are stored with stray/double spaces, which doubled gaps in the title.
  car.model = car.model?.replace(/\s+/g, " ").trim();

  // Load the brand fonts: Microgramma for headings (the website's title face) and
  // Inter for body copy (the website's body face). This route runs in the Node
  // runtime (Supabase + qrcode), where fetch() can't read file:// URLs, so read the
  // traced assets synchronously and hand Satori clean ArrayBuffers. If they can't
  // be loaded, fall back to the default font so the flyer still renders rather
  // than 500-ing.
  let fontsOption;
  try {
    const load = (buf) => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    fontsOption = [
      {
        name: "Microgramma",
        data: load(readFileSync(fileURLToPath(new URL("../../../../../fonts/MicrogrammaDExtendedBold.otf", import.meta.url)))),
        weight: 700,
        style: "normal",
      },
      {
        name: "Inter",
        data: load(readFileSync(fileURLToPath(new URL("../../../../../fonts/Inter-Regular.ttf", import.meta.url)))),
        weight: 400,
        style: "normal",
      },
      {
        name: "Inter",
        data: load(readFileSync(fileURLToPath(new URL("../../../../../fonts/Inter-SemiBold.ttf", import.meta.url)))),
        weight: 600,
        style: "normal",
      },
    ];
  } catch (e) {
    console.warn("Flyer: font load failed, using default:", e.message);
    fontsOption = undefined;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
  const listingLink = `${siteUrl}/inventory/${car.id}`;
  const qrDataUrl = await QRCode.toDataURL(listingLink, {
    margin: 1,
    width: 400,
    color: { dark: "#000000", light: "#ffff01" },
  });

  // en-ZA groups thousands with a non-breaking / narrow space (U+00A0 / U+202F)
  // which renders as tofu once a custom font is loaded — normalise to a plain space.
  const nf = (n) => new Intl.NumberFormat("en-ZA").format(n).replace(/\s/g, " ");
  const price = `R ${nf(car.price)}`;
  const colour = car.manufacturer_colour || car.colour;
  const serviceHistory = SERVICE_HISTORY[car.service_history];
  const isNew = car.condition === "new";

  // Two-column details table (like a dealer listing sheet); empty values are skipped.
  const row = (label, value) => (value || value === 0 ? { label, value: String(value) } : null);
  const detailColumns = [
    [
      row("Make", car.make),
      row("Model", car.model),
      row("Year", car.year),
      row("New/Used", car.condition ? (isNew ? "New" : "Used") : null),
      row("Fuel Type", car.fuel_type),
      row("Transmission", car.transmission),
    ],
    [
      row("Colour", colour),
      row("Mileage", car.mileage != null ? `${nf(car.mileage)} km` : null),
      row("Drive", DRIVETRAIN[car.drivetrain] || car.drivetrain),
      row("Previous Owners", car.previous_owners),
      row("Service History", serviceHistory?.short),
      row("Warranty", car.has_warranty == null ? null : car.has_warranty ? "Yes" : "No"),
    ],
  ].map((col) => col.filter(Boolean));

  // Short factual description built from the car's own data. The stored
  // description is ~4 000 characters of SEO copy, far too long for a window flyer.
  const features = Array.isArray(car.features) ? car.features.slice(0, 6) : [];
  const extras = [
    serviceHistory?.phrase,
    car.previous_owners ? `${car.previous_owners} previous owner${car.previous_owners > 1 ? "s" : ""}` : null,
    car.has_warranty ? "an active warranty" : null,
  ].filter(Boolean);
  const description = [
    `This ${car.year} ${car.make} ${car.model}${colour ? ` in ${colour.toLowerCase()}` : ""} is a ${isNew ? "new" : "pre-owned"}` +
      `${car.fuel_type ? ` ${car.fuel_type.toLowerCase()}` : ""}${car.transmission ? ` ${car.transmission.toLowerCase()}` : ""}` +
      `${car.drivetrain === "4x4" || car.drivetrain === "AWD" ? ` ${car.drivetrain}` : ""}` +
      `${car.mileage ? ` with ${nf(car.mileage)} km on the clock` : ""}.`,
    extras.length ? `It comes with ${extras.length > 1 ? `${extras.slice(0, -1).join(", ")} and ${extras.at(-1)}` : extras[0]}.` : null,
    features.length ? `Features include ${features.join(", ")}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const heroHeight = 330;
  const footerHeight = 360;
  const footerBarHeight = 40;
  const footerWedgeTopOffset = 24;
  const footerWedgeTopWidth = 360;
  const footerWedgeBottomWidth = 530;
  const qrSize = 170;
  const sectionBar = {
    display: "flex",
    fontFamily: "Microgramma",
    fontSize: 17,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#ffffff",
    background: "#0f172a",
    borderLeft: "5px solid #ffff01",
    padding: "10px 18px",
  };

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
          fontFamily: "Inter",
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
        {/* Photos are ~4:3 but the hero is 2.5:1, so "cover" alone cropped the car.
            Show the whole photo ("contain") over a blurred, dimmed fill of itself. */}
        <div style={{ display: "flex", flexShrink: 0, height: heroHeight, background: "#000000", position: "relative" }}>
          <img
            src={car.main_image_url}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: WIDTH,
              height: heroHeight,
              objectFit: "cover",
              filter: "blur(24px)",
              opacity: 0.45,
            }}
          />
          <img
            src={car.main_image_url}
            style={{ position: "absolute", top: 0, left: 0, width: WIDTH, height: heroHeight, objectFit: "contain" }}
          />
        </div>

        {/* 2. Title / Price */}
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 40px 24px 40px",
          }}
        >
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
                fontWeight: 600,
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
                  fontFamily: "Microgramma",
                  fontSize: 37,
                  fontWeight: 700,
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

        {/* 3. Vehicle details — two-column label/value table */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, padding: "0 36px" }}>
          <div style={sectionBar}>Vehicle Details</div>
          <div style={{ display: "flex", gap: 28, padding: "4px 4px 0 4px" }}>
            {detailColumns.map((col, ci) => (
              <div key={ci} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {col.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      padding: "6px 0",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <div style={{ display: "flex", width: 170, flexShrink: 0, fontSize: 20, fontWeight: 600, color: "#0f172a" }}>
                      {item.label}
                    </div>
                    <div style={{ display: "flex", flex: 1, fontSize: 20, fontWeight: 400, color: "#1e293b", lineHeight: 1.3 }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 4. Description + QR */}
        <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, padding: "18px 36px 0 36px" }}>
          <div style={sectionBar}>Description</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 32, padding: "14px 4px 0 4px" }}>
            <div style={{ display: "flex", flex: 1, fontSize: 20, fontWeight: 400, color: "#1e293b", lineHeight: 1.5 }}>
              {description}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <img
                src={qrDataUrl}
                style={{ width: qrSize, height: qrSize, borderRadius: 12, border: "4px solid #ffff01" }}
              />
              <div style={{ display: "flex", fontSize: 15, fontWeight: 600, color: "#0f172a", marginTop: 8 }}>
                Scan for the full listing
              </div>
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
            fontFamily: "Microgramma",
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