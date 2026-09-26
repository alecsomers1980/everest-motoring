"use client";
import { useState } from "react";

const BRIDGE = process.env.NEXT_PUBLIC_SYNDICATE_BRIDGE_URL || "http://localhost:8799";

export default function SyndicateButtons({ car }) {
  const [running, setRunning] = useState(null); // "carscoza" | "autotrader" | null

  async function syndicate(portal) {
    setRunning(portal);
    try {
      const res = await fetch(`${BRIDGE}/create/${portal}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: car.id }),
      });
      let data = null;
      try { data = await res.json(); } catch {}
      if (res.status === 409) {
        alert("A syndication run is already in progress. Wait for it to finish, then try again.");
        return;
      }
      if (data && data.ok) {
        alert(
          `✓ ${portal === "carscoza" ? "cars.co.za" : "AutoTrader"} form filled for ${[car.year, car.make, car.model]
            .filter(Boolean)
            .join(" ")}.\n\nReview the browser tab and submit manually if correct — nothing was submitted.`
        );
      } else {
        alert(
          `Run failed for ${portal}.\n\n` +
            ((data && (data.error || (data.log || "").slice(-600))) || `HTTP ${res.status}`)
        );
      }
    } catch (err) {
      alert(
        `Could not reach the local syndication bridge at ${BRIDGE}.\n\nMake sure it is running:\n  cd everest-stock-sync\n  npm run chrome   (log in)\n  npm run bridge\n\n(${err?.message || err})`
      );
    } finally {
      setRunning(null);
    }
  }

  return (
    <span className="flex gap-1">
      <button
        type="button"
        title="Fill this vehicle on cars.co.za (no submit)"
        className="text-xs font-semibold px-2 py-1 rounded border border-slate-300 text-slate-600 hover:border-primary hover:text-primary-ink disabled:opacity-50 transition-colors whitespace-nowrap"
        disabled={running !== null}
        onClick={() => syndicate("carscoza")}
      >
        {running === "carscoza" ? "cars.co.za …" : "cars.co.za"}
      </button>
      <button
        type="button"
        title="Fill this vehicle on AutoTrader (no submit)"
        className="text-xs font-semibold px-2 py-1 rounded border border-slate-300 text-slate-600 hover:border-primary hover:text-primary-ink disabled:opacity-50 transition-colors whitespace-nowrap"
        disabled={running !== null}
        onClick={() => syndicate("autotrader")}
      >
        {running === "autotrader" ? "AutoTrader …" : "AutoTrader"}
      </button>
    </span>
  );
}
