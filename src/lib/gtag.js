"use client";

const CONSENT_KEY = "everest_cookie_consent";

export function hasConsent() {
    if (typeof window === "undefined") return false;
    try {
        return window.localStorage.getItem(CONSENT_KEY) === "accepted";
    } catch {
        return false;
    }
}

export function trackEvent(name, params = {}) {
    if (typeof window === "undefined") return;
    if (!hasConsent()) return;
    if (typeof window.gtag !== "function") return;
    try {
        window.gtag("event", name, params);
    } catch (err) {
        console.warn("gtag event failed:", err);
    }
}
