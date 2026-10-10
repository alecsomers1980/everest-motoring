import { parseSaId } from "./saId";

// Reads page 1 of the dealer system's OTP into a Deal: the values the review
// screen shows and buildForms prints. Every value is a Field
// { value, origin, note? }: "otp" (copied verbatim), "derived" (follows from an
// OTP value; note says from what), "blank" (not on the OTP) or "edited" (set by
// staff on the review screen). Nothing is guessed: unreadable means blank.

export class OtpError extends Error {}

// Every label printed on the OTP. A label's value is the next run to its right
// on the same row, unless that run is itself a label (the value is empty).
const LABELS = new Set([
    "Customer :", "Order Details :", "Vehicle :", "Driver :",
    "VAT No.", "Mobile:", "Fax:", "Business:", "Private:", "Email:", "DOB.:", "Driver Licence No.",
    "Deal ID:", "Customer Order:", "Order Date:", "Est. Delivery Date:", "Salesperson:",
    "Rego No:", "VIN No:", "Stock No:", "Odometer:", "Rego Expiry:", "Engine No:", "Compliance Date:", "Build Date:",
    "D.O.B.:", "Drivers Licence", "Full Name:", "Phone:",
]);
const ROW = 1.5; // points: runs within this of each other's baseline share a row
const TITLE = /^(mr|mrs|ms|miss|dr|prof|mnr|mev|me|mej)\.?\s+/i;
const COMPANY = /\b(pty|ltd|limited|cc|inc|trust)\b/i;
const PARTICLES = new Set(["van", "der", "den", "de", "du", "le", "la", "von", "ter"]);
const CITY_LINE = /^(.+?)\s+(?:(?:GP|MP|KZN|WC|EC|NC|NW|FS|LP)\s+)?(\d{4})$/i;

const blank = () => ({ value: "", origin: "blank" });
const fromOtp = (value) => (value ? { value, origin: "otp" } : blank());
const derived = (value, note) => (value ? { value, origin: "derived", note } : blank());

export function parseOtp(items) {
    if (!items.length) {
        throw new OtpError("Upload the original PDF from the dealer system, not a scan or photo.");
    }
    const has = (text) => items.some((item) => item.str.includes(text));
    if (!has("CONTRACT FOR THE SALE OF A USED MOTOR VEHICLE") || !has("DEAL ID")) {
        throw new OtpError("This isn't an OTP from the dealer system.");
    }

    const orderDate = isoDate(valueRightOf(items, "Order Date:"));
    return {
        dealId: fromOtp(valueRightOf(items, "Deal ID:")),
        orderDate: fromOtp(orderDate),
        customer: parseCustomer(items, orderDate),
        vehicle: parseVehicle(items),
    };
}

function valueRightOf(items, label) {
    const at = items.find((item) => item.str.trim() === label);
    if (!at) return "";
    const next = items
        .filter((item) => item !== at && Math.abs(item.y - at.y) < ROW && item.x >= at.x + at.width - 0.5)
        .sort((a, b) => a.x - b.x)[0];
    if (!next || LABELS.has(next.str.trim())) return "";
    const value = next.str.trim();
    return /[a-z0-9]/i.test(value) ? value : ""; // e.g. "/" for an empty date
}

function isoDate(text) {
    const m = text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

function parseCustomer(items, orderDate) {
    const [nameLine = "", ...addressLines] = customerBlock(items);
    const name = splitName(nameLine);
    // The dealer system prints the customer's ID number in the "VAT No." box.
    const id = name.kind === "person" ? parseSaId(valueRightOf(items, "VAT No."), orderDate || undefined) : null;
    const address = splitAddress(addressLines);
    return {
        kind: name.kind,
        surname: fromOtp(name.surname),
        firstNames: fromOtp(name.firstNames),
        initials: fromOtp(name.initials),
        idType: derived(id ? "rsa_id" : "", "from ID number"),
        idNumber: fromOtp(id?.idNumber ?? ""),
        gender: derived(id?.gender ?? "", "from ID number"),
        dob: derived(id?.dob ?? "", "from ID number"),
        email: fromOtp(valueRightOf(items, "Email:")),
        cell: fromOtp(valueRightOf(items, "Mobile:").replace(/\D/g, "")),
        street1: fromOtp(address.lines[0]),
        street2: fromOtp(address.lines[1]),
        street3: fromOtp(address.lines[2]),
        streetSuburb: blank(),
        streetCity: fromOtp(address.city),
        streetCode: fromOtp(address.code),
        postal1: blank(),
        postal2: blank(),
        postal3: blank(),
        postalSuburb: blank(),
        postalCity: blank(),
        postalCode: blank(),
        notices: blank(),
    };
}

// Name and address lines: left of the "VAT No." column, between the
// "Customer :" heading and the DOB/Email row.
function customerBlock(items) {
    const heading = items.find((item) => item.str.trim() === "Customer :");
    const ends = items.filter((item) => ["DOB.:", "Email:"].includes(item.str.trim())).map((item) => item.y);
    if (!heading || !ends.length) return [];
    const bottom = Math.min(...ends);
    return items
        .filter((item) => item.x < 260 && item.y > heading.y + ROW && item.y < bottom - ROW && !LABELS.has(item.str.trim()))
        .sort((a, b) => a.y - b.y)
        .map((item) => item.str.trim());
}

function splitName(line) {
    if (!line) return { kind: "person", surname: "", firstNames: "", initials: "" };
    const title = line.match(TITLE);
    if (!title || COMPANY.test(line)) return { kind: "organisation", surname: line, firstNames: "", initials: "" };

    const words = line.slice(title[0].length).trim().split(/\s+/);
    let start = words.length - 1; // first word of the surname
    while (start > 1 && PARTICLES.has(words[start - 1].toLowerCase())) start--;
    // "Mr van der Merwe": no first name, so the leading particles belong to the surname.
    if (start === 1 && PARTICLES.has(words[0].toLowerCase())) start = 0;
    const first = words.slice(0, start).slice(0, 3);
    return {
        kind: "person",
        surname: words.slice(start).join(" "),
        firstNames: first.join(" "),
        initials: first.map((word) => word[0].toUpperCase()).join(""),
    };
}

function splitAddress(lines) {
    const tidy = lines.map((line) => line.replace(/,\s*$/, "").trim()).filter(Boolean);
    const last = tidy.length ? tidy[tidy.length - 1].match(CITY_LINE) : null;
    const street = last ? tidy.slice(0, -1) : tidy;
    return {
        lines: [street[0] ?? "", street[1] ?? "", street.slice(2).join(", ")],
        city: last ? last[1] : "",
        code: last ? last[2] : "",
    };
}

function parseVehicle(items) {
    const row = items.find((item) => item.str.trim() === "USED VEHICLE");
    const onRow = row ? items.filter((item) => Math.abs(item.y - row.y) < ROW) : [];
    const model = onRow.find((item) => item.x > 100 && item.x < 400)?.str.trim() ?? "";
    const make = onRow.find((item) => item.x >= 400 && item.x < 500)?.str.trim() ?? "";
    const colourRun = row && items.find(
        (item) => item.y > row.y + ROW && item.y < row.y + 25 && item.str.trim().startsWith("Vehicle Colour:"),
    );
    const colour = colourRun ? colourRun.str.trim().slice("Vehicle Colour:".length).trim() : "";
    const series = make && model.toUpperCase().startsWith(`${make.toUpperCase()} `) ? model.slice(make.length + 1).trim() : model;

    return {
        licenceNo: fromOtp(valueRightOf(items, "Rego No:")),
        registerNo: blank(),
        vin: fromOtp(valueRightOf(items, "VIN No:")),
        engineNo: fromOtp(valueRightOf(items, "Engine No:")),
        odometer: fromOtp(valueRightOf(items, "Odometer:").replace(/\D/g, "")),
        make: fromOtp(make),
        series: fromOtp(series),
        colour: fromOtp(colour),
        transmission: derived(transmissionOf(model), "from model name"),
        description: derived(descriptionOf(model), "from model name"),
    };
}

function transmissionOf(model) {
    if (/\bA\/T\b|\bAUTO(MATIC)?\b/i.test(model)) return "automatic";
    if (/\bM\/T\b|\bMANUAL\b/i.test(model)) return "manual";
    return "";
}

function descriptionOf(model) {
    if (/\bP\/U\b|\bBAKKIE\b/i.test(model)) return "pick_up";
    if (/\bH\/B\b|\bHATCH/i.test(model)) return "hatch_back";
    if (/\bSEDAN\b/i.test(model)) return "sedan";
    return "";
}
