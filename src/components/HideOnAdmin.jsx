"use client";

import { usePathname } from "next/navigation";

// The root layout also wraps /admin, which has its own sidebar and header.
// Showing the public header and footer there stacked two nav bars on top.
export default function HideOnAdmin({ children }) {
    const pathname = usePathname() || "";
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
        return null;
    }
    return children;
}
