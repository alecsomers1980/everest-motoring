"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

const CONSENT_KEY = "everest_cookie_consent";
const CONSENT_EVENT = "everest:consent-changed";

export default function GoogleAnalyticsGate({ gaId }) {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        if (!gaId) return;

        const check = () => {
            try {
                setEnabled(window.localStorage.getItem(CONSENT_KEY) === "accepted");
            } catch {
                setEnabled(false);
            }
        };

        check();
        const handler = () => check();
        window.addEventListener(CONSENT_EVENT, handler);
        window.addEventListener("storage", handler);
        return () => {
            window.removeEventListener(CONSENT_EVENT, handler);
            window.removeEventListener("storage", handler);
        };
    }, [gaId]);

    if (!gaId || !enabled) return null;
    return <GoogleAnalytics gaId={gaId} />;
}
