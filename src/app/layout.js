import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CookieConsent from "@/components/CookieConsent";
import GoogleAnalyticsGate from "@/components/GoogleAnalyticsGate";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

// Self-hosted brand header font (Microgramma D Extended Bold).
const microgramme = localFont({
  src: "../fonts/MicrogrammaDExtendedBold.otf",
  variable: "--font-microgramme",
  weight: "700",
  display: "swap",
});

// Body typeface. Replaces the previous Arial default, which read as unstyled.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const siteConfig = {
  name: "Everest Motoring",
  description: "Premium Pre-Owned Vehicles in Mpumalanga",
  logo: "/images/logo.png",
  phone: "013 854 0600",
  // International format, digits only. WhatsApp UI stays hidden if this is empty.
  whatsapp: "27788938881", // 078 893 8881
  email: "info@everestmotoring.co.za",
  address: "White River, Mpumalanga",
  companyName: "DeCar Beleggings (Pty) Ltd",
  registrationNumber: "2011/007142/07",
  vatNumber: "4780257772"
};

export const metadata = {
  title: `${siteConfig.name} | Premium Pre-Owned Used Cars`,
  description: siteConfig.description,
  icons: {
    icon: [{ url: "/images/favicon.png", type: "image/png" }],
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
};

export default function RootLayout({ children }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  return (
    <html lang="en">
      <head>
        <meta name="x-deploy-marker" content="EVEREST-DEPLOY-MARKER-2026-04-27-B" />
        {/* Public pages use Lucide (see components/Icon.jsx) and load no icon font.
            The Material Symbols stylesheet is scoped to the admin/affiliate/portal
            layouts, which still use it. */}
        {/* Scroll-reveal sections render at opacity:0 until Motion animates them in.
            Without JS that would hide real content, so force them visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className={`${microgramme.variable} ${inter.variable} bg-background-light text-slate-900 font-body antialiased selection:bg-slate-800 selection:text-white`}>
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
          <Header siteConfig={siteConfig} />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer siteConfig={siteConfig} />
        </div>
        <FloatingWhatsApp
          number={siteConfig.whatsapp}
          message="Hi Everest Motoring, I'd like to find out more about your vehicles."
        />
        <GoogleAnalyticsGate gaId={gaId} />
        <CookieConsent />
      </body>
    </html>
  );
}
