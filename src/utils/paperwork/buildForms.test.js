import { describe, it, expect } from "vitest";
import { buildRlvValues, buildNcoValues, partyValues, customerParty } from "./buildForms";
import { parseOtp } from "./parseOtp";
import { OTP_ITEMS } from "./__fixtures__/otpItems";
import RLV from "./layouts/rlv";

const deal = () => parseOtp(OTP_ITEMS);

// A deal with one field changed, as the review screen would leave it.
function edited(group, key, value) {
    const d = deal();
    d[group][key] = { value, origin: "edited" };
    return d;
}

const BANK = {
    id: "fh-1", name: "Test Bank", id_type: "business_reg", id_number: "1999/000001/06",
    nature: "other", nature_other: "Public company", email: "natis@example.com",
    phone_code: "011", phone_number: "5550000", fax_code: null, fax_number: null,
    postal_line1: "PO Box 1", postal_line2: null, postal_line3: null, postal_suburb: null,
    postal_city: "Johannesburg", postal_code: "2000",
    street_line1: "1 Bank Street", street_line2: null, street_line3: null, street_suburb: "Sandton",
    street_city: "Johannesburg", street_code: "2196", notices_to: "postal",
    proxy_id_type: "rsa_id", proxy_id_number: "8001015000086", proxy_surname: "Mokoena", proxy_initials: "T",
};

const VEHICLE_RLV = {
    "C.licence": "AB12CDGP",
    "C.vin": "AHTFR22G406012345",
    "C.make": "TOYOTA",
    "C.series": "Hilux 2.8 GD-6 Raider 4x4 A/T P/U D/C",
    "C.engine": "1GD0123456",
    "C.odometer": "45000",
    "C.colour.other": "X",
    "C.colourOther": "Silver",
    "C.transmission.automatic": "X",
    "C.description.pick_up": "X",
    "C.driven.self_propelled": "X",
    "C.reason.ownership": "X",
    "C.dateLiable": "20260929",
};

describe("buildRlvValues", () => {
    it("puts a cash customer in Part A as title holder and leaves Part B blank", () => {
        expect(buildRlvValues(deal(), null)).toEqual({
            "tx.titleHolder": "X",
            "A.idType.rsa_id": "X",
            "A.idNumber": "8001015009087",
            "A.nature.male": "X",
            "A.surname": "Botha",
            "A.initials": "P",
            "A.firstNames": "Pieter",
            "A.dob": "19800101",
            "A.email": "pieter@example.com",
            "A.cell": "0821234567",
            "A.street1": "12 Example Road",
            "A.streetCity": "NELSPRUIT",
            "A.streetCode": "1200",
            ...VEHICLE_RLV,
        });
    });

    it("puts a finance house in Part A and the customer in Part B when financed", () => {
        const values = buildRlvValues(deal(), BANK);
        expect(values).toMatchObject({
            "A.idType.business_reg": "X",
            "A.idNumber": "199900000106",
            "A.nature.other": "X",
            "A.natureOther": "Public company",
            "A.surname": "Test Bank",
            "A.email": "natis@example.com",
            "A.dayCode": "011",
            "A.dayNumber": "5550000",
            "A.postal1": "PO Box 1",
            "A.postalCity": "Johannesburg",
            "A.postalCode": "2000",
            "A.street1": "1 Bank Street",
            "A.streetSuburb": "Sandton",
            "A.notices.postal": "X",
            "A.proxy.idType.rsa_id": "X",
            "A.proxy.idNumber": "8001015000086",
            "A.proxy.surname": "Mokoena",
            "A.proxy.initials": "T",
            "B.idType.rsa_id": "X",
            "B.idNumber": "8001015009087",
            "B.nature.male": "X",
            "B.surname": "Botha",
            "B.firstNames": "Pieter",
            "B.dob": "19800101",
            "B.cell": "0821234567",
            "B.street1": "12 Example Road",
            ...VEHICLE_RLV,
        });
        expect(values["A.firstNames"]).toBeUndefined();
    });

    it("prints phone numbers as digits only", () => {
        const values = buildRlvValues(edited("customer", "cell", "082 123 4567"), { ...BANK, phone_number: "555 0000", fax_code: "(011)", fax_number: "555-0001" });
        expect(values["B.cell"]).toBe("0821234567");
        expect(values["A.dayNumber"]).toBe("5550000");
        expect(values["A.faxCode"]).toBe("011");
        expect(values["A.faxNumber"]).toBe("5550001");
    });

    it("ticks a basic colour instead of writing it in", () => {
        const values = buildRlvValues(edited("vehicle", "colour", "White"), null);
        expect(values["C.colour.white"]).toBe("X");
        expect(values["C.colour.other"]).toBeUndefined();
        expect(values["C.colourOther"]).toBeUndefined();
    });

    it("leaves gender and ID type unmarked for an organisation customer", () => {
        const d = parseOtp(OTP_ITEMS.map((i) => (i.str === "Mr Pieter Botha" ? { ...i, str: "Acme Trading CC" } : i)));
        const values = buildRlvValues(d, null);
        expect(values["A.surname"]).toBe("Acme Trading CC");
        expect(Object.keys(values).filter((k) => k.startsWith("A.nature.") || k.startsWith("A.idType."))).toEqual([]);
    });

    it("only produces keys the RLV has", () => {
        const full = {
            ...customerParty(deal()),
            dayCode: "011", dayNumber: "5550000", faxCode: "011", faxNumber: "5550001",
            postal: { lines: ["a", "b", "c"], suburb: "d", city: "e", code: "1234" },
            street: { lines: ["a", "b", "c"], suburb: "d", city: "e", code: "1234" },
            notices: "street",
            nature: "other", natureOther: "x",
            proxy: { idType: "traffic_register", idNumber: "1", surname: "s", initials: "i" },
        };
        expect(Object.keys(partyValues("A", full)).filter((k) => !(k in RLV))).toEqual([]);
        for (const key of [
            "A.idType.traffic_register", "A.idType.rsa_id", "A.idType.foreign_id", "A.idType.business_reg",
            "A.nature.male", "A.nature.female", "A.nature.one_man", "A.nature.private_company", "A.nature.close_corporation",
            "A.notices.postal", "A.proxy.idType.rsa_id", "A.proxy.idType.foreign_id",
            "C.colour.white", "C.colour.red", "C.colour.blue", "C.transmission.manual",
            "C.description.sedan", "C.description.hatch_back",
        ]) {
            expect(RLV).toHaveProperty([key]);
        }
    });
});

describe("buildNcoValues", () => {
    const VEHICLE_NCO = {
        "C.licence": "AB12CDGP",
        "C.vin": "AHTFR22G406012345",
        "C.make": "TOYOTA",
        "C.odometer": "45000",
        "C.reason.sold": "X",
        "C.dateOfChange": "260929",
    };
    const SELLER = {
        "A.idType.business_reg": "X",
        "A.idNumber": "201100714207",
        "A.surname": "DeCar Beleggings (Pty) Ltd",
        "A.dayCode": "013",
        "A.dayNumber": "8540600",
    };

    it("sells from Everest to a cash customer, using the mobile as day contact number", () => {
        expect(buildNcoValues(deal(), null)).toEqual({
            ...SELLER,
            "B.idType.rsa_id": "X",
            "B.idNumber": "8001015009087",
            "B.surname": "Botha",
            "B.initials": "P",
            "B.email": "pieter@example.com",
            "B.street1": "12 Example Road",
            "B.streetCity": "NELSPRUIT",
            "B.streetCode": "1200",
            "B.dayCode": "082",
            "B.dayNumber": "1234567",
            ...VEHICLE_NCO,
        });
    });

    it("still splits an edited mobile with spaces into the day-contact boxes", () => {
        const values = buildNcoValues(edited("customer", "cell", "082 123 4567"), null);
        expect([values["B.dayCode"], values["B.dayNumber"]]).toEqual(["082", "1234567"]);
    });

    it("sells to the finance house when financed and carries no customer details", () => {
        const values = buildNcoValues(deal(), BANK);
        expect(values).toMatchObject({
            ...SELLER,
            "B.idType.business_reg": "X",
            "B.idNumber": "199900000106",
            "B.surname": "Test Bank",
            "B.dayCode": "011",
            "B.dayNumber": "5550000",
            "B.postal1": "PO Box 1",
            "B.notices.postal": "X",
            "B.proxy.surname": "Mokoena",
            ...VEHICLE_NCO,
        });
        expect(Object.values(values)).not.toContain("Botha");
        expect(Object.values(values)).not.toContain("8001015009087");
    });
});
