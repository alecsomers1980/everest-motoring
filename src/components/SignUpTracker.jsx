"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

export default function SignUpTracker({ method, when }) {
    useEffect(() => {
        if (!when) return;
        trackEvent("sign_up", { method });
    }, [method, when]);

    return null;
}
