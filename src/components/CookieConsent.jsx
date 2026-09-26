"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const CONSENT_KEY = "everest_cookie_consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if no prior decision is stored
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      // Small delay so the page renders first — feels less jarring
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function emitConsent(value) {
    try {
      window.dispatchEvent(new CustomEvent("everest:consent-changed", { detail: value }));
    } catch {}
  }

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    emitConsent("accepted");
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    emitConsent("declined");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-lg shadow-2xl"
        >
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-6 sm:flex-row sm:gap-8 lg:px-12">
            
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-white font-bold text-sm mb-1 font-display uppercase tracking-wider">Cookie Notice</h4>
              <p className="text-sm leading-relaxed text-slate-300">
                We use cookies to enhance your experience and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.{" "}
                <Link
                  href="/privacy"
                  className="text-primary font-bold hover:underline underline-offset-4"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
              <button
                onClick={handleDecline}
                className="flex-1 sm:flex-none border border-white/20 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-white/10 rounded-lg"
              >
                Decline
              </button>

              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none bg-primary px-8 py-2.5 text-sm font-bold text-black shadow-xl shadow-primary/20 transition-all hover:bg-primary-dark rounded-lg active:scale-95"
              >
                Accept All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
