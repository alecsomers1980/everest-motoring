"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/gtag";

export default function TrackedLink({ event, params, children, ...props }) {
    function handleClick(e) {
        if (event) trackEvent(event, params || {});
        if (props.onClick) props.onClick(e);
    }
    return (
        <Link {...props} onClick={handleClick}>
            {children}
        </Link>
    );
}
