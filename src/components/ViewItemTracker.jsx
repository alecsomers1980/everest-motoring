"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

export default function ViewItemTracker({ car }) {
    useEffect(() => {
        if (!car?.id) return;
        trackEvent("view_item", {
            currency: "ZAR",
            value: Number(car.price) || 0,
            items: [
                {
                    item_id: car.id,
                    item_name: `${car.year || ""} ${car.make || ""} ${car.model || ""}`.trim(),
                    item_brand: car.make || undefined,
                    item_category: car.fuel_type || undefined,
                    price: Number(car.price) || 0,
                    quantity: 1,
                },
            ],
        });
    }, [car?.id, car?.price, car?.make, car?.model, car?.year, car?.fuel_type]);

    return null;
}
