import { describe, it, expect } from "vitest";
import { parseSaId } from "./saId";

const REF = "2026-09-29";

describe("parseSaId", () => {
    it("accepts a valid ID and derives date of birth and gender", () => {
        expect(parseSaId("8001015009087", REF)).toEqual({ idNumber: "8001015009087", dob: "1980-01-01", gender: "male" });
    });

    it("ignores spaces", () => {
        expect(parseSaId("800101 5009 087", REF)?.idNumber).toBe("8001015009087");
    });

    it("rejects a bad checksum", () => {
        expect(parseSaId("8001015009088", REF)).toBeNull();
    });

    it("rejects the wrong length, letters and empty values", () => {
        expect(parseSaId("800101500908", REF)).toBeNull();
        expect(parseSaId("80010150090A7", REF)).toBeNull();
        expect(parseSaId("", REF)).toBeNull();
        expect(parseSaId(undefined, REF)).toBeNull();
    });

    it("rejects impossible dates even when the checksum passes", () => {
        expect(parseSaId("8013015009082", REF)).toBeNull(); // month 13
        expect(parseSaId("8002305009084", REF)).toBeNull(); // 30 February
    });

    it("splits gender at sequence 5000", () => {
        expect(parseSaId("8001014999080", REF).gender).toBe("female");
        expect(parseSaId("8001015000086", REF).gender).toBe("male");
    });

    it("reads the century relative to the reference date", () => {
        expect(parseSaId("0501015009084", REF).dob).toBe("2005-01-01");
        expect(parseSaId("3001015009082", REF).dob).toBe("1930-01-01");
    });
});
