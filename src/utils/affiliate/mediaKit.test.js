import { describe, it, expect } from "vitest";
import { buildAffiliateVehiclePayload } from "./mediaKit";

const baseCar = {
    id: "car-1",
    make: "Toyota",
    model: "Hilux 2.8GD-6 Legend",
    year: 2024,
    price: 749900,
    mileage: 12500,
    transmission: "Automatic",
    fuel_type: "Diesel",
    colour: "Glacier White",
    features: ["Leather seats", "Reverse camera"],
    main_image_url: "https://example.com/hilux.jpg",
    video_url: null,
};

describe("buildAffiliateVehiclePayload", () => {
    it("formats price and mileage as en-ZA strings", () => {
        // en-ZA's Intl.NumberFormat uses U+00A0 (non-breaking space) as the
        // thousands separator, not a comma — matches the rest of this
        // codebase's existing en-ZA formatting (e.g. the OG flyer generator).
        const result = buildAffiliateVehiclePayload(baseCar, "AFF123", "https://everestmotoring.co.za");
        expect(result.price).toBe("R 749 900");
        expect(result.mileage).toBe("12 500 km");
    });

    it("builds tracking/flyer/media-kit links keyed to the affiliate's ref", () => {
        const result = buildAffiliateVehiclePayload(baseCar, "AFF123", "https://everestmotoring.co.za");
        expect(result.trackingLink).toBe("https://everestmotoring.co.za/inventory/car-1?ref=AFF123");
        expect(result.flyerUrl).toBe("https://everestmotoring.co.za/api/affiliate/flyer/car-1?ref=AFF123");
        expect(result.mediaKitUrl).toBe("https://everestmotoring.co.za/affiliate/media/car-1");
    });

    it("omits videoUrl when the car has no Cloudflare Stream video", () => {
        const result = buildAffiliateVehiclePayload(baseCar, "AFF123", "https://everestmotoring.co.za");
        expect(result.videoUrl).toBeNull();
    });

    it("builds a video download link when the car has a cf: video", () => {
        const carWithVideo = { ...baseCar, video_url: "cf:abc123" };
        const result = buildAffiliateVehiclePayload(carWithVideo, "AFF123", "https://everestmotoring.co.za");
        expect(result.videoUrl).toBe(
            "https://everestmotoring.co.za/api/affiliate/video-download/car-1?ref=AFF123&redirect=1"
        );
    });

    it("leaves mileage null when the car has none", () => {
        const carNoMileage = { ...baseCar, mileage: null };
        const result = buildAffiliateVehiclePayload(carNoMileage, "AFF123", "https://everestmotoring.co.za");
        expect(result.mileage).toBeNull();
    });
});
