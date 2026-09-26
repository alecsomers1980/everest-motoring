"use client";

import { usePathname } from "next/navigation";
import WhatsAppButton from "./WhatsAppButton";

// The floating button lives in the root layout, which also wraps the staff areas.
// Those are not customer surfaces, so it is hidden there.
const INTERNAL_PREFIXES = ["/admin", "/portal", "/affiliate", "/dashboard", "/login", "/register", "/auth"];

export default function FloatingWhatsApp({ number, message }) {
    const pathname = usePathname() || "";
    if (INTERNAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return null;
    }
    return <WhatsAppButton number={number} message={message} variant="floating" />;
}
