import { describe, it, expect } from "vitest";
import { parseOtp, OtpError } from "./parseOtp";
import { OTP_ITEMS } from "./__fixtures__/otpItems";

// The fixture with some runs' text replaced (null removes the run).
function withItems(patch) {
    return OTP_ITEMS
        .map((item) => (item.str in patch ? { ...item, str: patch[item.str] } : item))
        .filter((item) => item.str !== null);
}

// A group's field values, without the plain-string `kind`.
const values = (group) =>
    Object.fromEntries(Object.entries(group).filter(([key]) => key !== "kind").map(([key, field]) => [key, field.value]));

describe("parseOtp", () => {
    it("reads the deal and order date", () => {
        const deal = parseOtp(OTP_ITEMS);
        expect(deal.dealId).toEqual({ value: "999", origin: "otp" });
        expect(deal.orderDate).toEqual({ value: "2026-09-29", origin: "otp" });
    });

    it("reads the customer, deriving gender and DOB from a valid ID number", () => {
        const { customer } = parseOtp(OTP_ITEMS);
        expect(customer.kind).toBe("person");
        expect(values(customer)).toEqual({
            surname: "Botha", firstNames: "Pieter", initials: "P",
            idType: "rsa_id", idNumber: "8001015009087", gender: "male", dob: "1980-01-01",
            email: "pieter@example.com", cell: "0821234567",
            street1: "12 Example Road", street2: "", street3: "",
            streetSuburb: "", streetCity: "NELSPRUIT", streetCode: "1200",
            postal1: "", postal2: "", postal3: "", postalSuburb: "", postalCity: "", postalCode: "",
            notices: "",
        });
        expect(customer.surname.origin).toBe("otp");
        expect(customer.gender).toEqual({ value: "male", origin: "derived", note: "from ID number" });
        expect(customer.dob.origin).toBe("derived");
        expect(customer.idType.origin).toBe("derived");
        expect(customer.streetSuburb).toEqual({ value: "", origin: "blank" });
    });

    it("reads the vehicle, deriving transmission and body from the model name", () => {
        const { vehicle } = parseOtp(OTP_ITEMS);
        expect(values(vehicle)).toEqual({
            licenceNo: "AB12CDGP", registerNo: "", vin: "AHTFR22G406012345", engineNo: "1GD0123456",
            odometer: "45000", make: "TOYOTA", series: "Hilux 2.8 GD-6 Raider 4x4 A/T P/U D/C",
            colour: "Silver", transmission: "automatic", description: "pick_up",
        });
        expect(vehicle.transmission).toEqual({ value: "automatic", origin: "derived", note: "from model name" });
        expect(vehicle.registerNo.origin).toBe("blank");
    });

    it("leaves ID, ID type, gender and DOB blank when the ID number fails its checksum", () => {
        const { customer } = parseOtp(withItems({ "8001015009087": "8001015009088" }));
        expect([customer.idNumber, customer.idType, customer.gender, customer.dob].map((f) => f.origin))
            .toEqual(["blank", "blank", "blank", "blank"]);
    });

    it("keeps surname particles with the surname, in any capitalisation", () => {
        const a = parseOtp(withItems({ "Mr Pieter Botha": "Mr Jan Hendrik van der Merwe" })).customer;
        expect([a.firstNames.value, a.initials.value, a.surname.value]).toEqual(["Jan Hendrik", "JH", "van der Merwe"]);
        const b = parseOtp(withItems({ "Mr Pieter Botha": "Mnr Jan Van Der Merwe" })).customer;
        expect([b.firstNames.value, b.surname.value]).toEqual(["Jan", "Van Der Merwe"]);
    });

    it("keeps a particle surname whole when there is no first name", () => {
        const c = parseOtp(withItems({ "Mr Pieter Botha": "Mr van der Merwe" })).customer;
        expect([c.firstNames.value, c.initials.value, c.surname.value]).toEqual(["", "", "van der Merwe"]);
    });

    it("keeps at most three first names", () => {
        const c = parseOtp(withItems({ "Mr Pieter Botha": "Mr Pieter Johan Willem Jacobus Botha" })).customer;
        expect([c.firstNames.value, c.initials.value]).toEqual(["Pieter Johan Willem", "PJW"]);
    });

    it("treats a company customer as an organisation and doesn't read its VAT number as an ID", () => {
        for (const name of ["Lowveld Logistics (Pty) Ltd", "Acme Trading CC"]) {
            const { customer } = parseOtp(withItems({ "Mr Pieter Botha": name }));
            expect(customer.kind).toBe("organisation");
            expect(customer.surname.value).toBe(name);
            expect([customer.firstNames, customer.initials, customer.idNumber, customer.gender, customer.dob].map((f) => f.value))
                .toEqual(["", "", "", "", ""]);
        }
    });

    it("leaves a field blank when its label or value is missing", () => {
        expect(parseOtp(withItems({ "VIN No:": null })).vehicle.vin).toEqual({ value: "", origin: "blank" });
        expect(parseOtp(withItems({ "AHTFR22G406012345": null })).vehicle.vin).toEqual({ value: "", origin: "blank" });
    });

    it("keeps every address line as street address when the last line has no postal code", () => {
        const { customer } = parseOtp(withItems({ "NELSPRUIT MP 1200": "Riverside Park" }));
        expect([customer.street1.value, customer.street2.value, customer.streetCity.value, customer.streetCode.value])
            .toEqual(["12 Example Road", "Riverside Park", "", ""]);
    });

    it("rejects a PDF that isn't a dealer-system OTP", () => {
        expect(() => parseOtp([{ str: "TAX INVOICE", x: 40, y: 90, width: 50 }])).toThrow(OtpError);
        expect(() => parseOtp([{ str: "TAX INVOICE", x: 40, y: 90, width: 50 }])).toThrow("isn't an OTP");
    });

    it("rejects a PDF with no text (a scan or photo)", () => {
        expect(() => parseOtp([])).toThrow("not a scan or photo");
    });
});
