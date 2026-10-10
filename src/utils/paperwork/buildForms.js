import RLV from "./layouts/rlv";
import NCO from "./layouts/nco";
import { EVEREST } from "./dealer";

// Turns a reviewed Deal (see parseOtp) into the box values for each form.
// A Party is one person or organisation as the forms describe it; its
// enum-like values (idType "rsa_id", nature "male", notices "postal") are the
// layout key suffixes. Routing (spec "Routing"): cash → the customer is the
// title holder; financed → the finance house is, and the customer is the owner.

const val = (field) => String(field?.value ?? "").trim();
const str = (x) => String(x ?? "").trim();
const alnum = (s) => s.replace(/[^0-9a-z]/gi, "");
const digits = (s) => s.replace(/\D/g, "");
const address = (lines, suburb, city, code) => ({ lines: lines.map(str), suburb: str(suburb), city: str(city), code: str(code) });

export function customerParty(deal) {
    const c = deal.customer;
    return {
        idType: val(c.idType),
        idNumber: val(c.idNumber),
        nature: c.kind === "person" ? val(c.gender) : "",
        natureOther: "",
        surname: val(c.surname),
        initials: val(c.initials),
        firstNames: val(c.firstNames),
        dob: val(c.dob),
        email: val(c.email),
        dayCode: "",
        dayNumber: "",
        faxCode: "",
        faxNumber: "",
        cell: val(c.cell),
        postal: address([val(c.postal1), val(c.postal2), val(c.postal3)], val(c.postalSuburb), val(c.postalCity), val(c.postalCode)),
        street: address([val(c.street1), val(c.street2), val(c.street3)], val(c.streetSuburb), val(c.streetCity), val(c.streetCode)),
        notices: val(c.notices),
        proxy: null,
    };
}

export function financeHouseParty(row) {
    return {
        idType: str(row.id_type),
        idNumber: str(row.id_number),
        nature: str(row.nature),
        natureOther: str(row.nature_other),
        surname: str(row.name),
        initials: "",
        firstNames: "",
        dob: "",
        email: str(row.email),
        dayCode: str(row.phone_code),
        dayNumber: str(row.phone_number),
        faxCode: str(row.fax_code),
        faxNumber: str(row.fax_number),
        cell: "",
        postal: address([row.postal_line1, row.postal_line2, row.postal_line3], row.postal_suburb, row.postal_city, row.postal_code),
        street: address([row.street_line1, row.street_line2, row.street_line3], row.street_suburb, row.street_city, row.street_code),
        notices: str(row.notices_to),
        proxy: {
            idType: str(row.proxy_id_type),
            idNumber: str(row.proxy_id_number),
            surname: str(row.proxy_surname),
            initials: str(row.proxy_initials),
        },
    };
}

// The NCO has no cellphone box: its day-contact number takes a 10-digit mobile.
function withMobileAsDayNumber(party) {
    const m = digits(party.cell).match(/^(0\d{2})(\d{7})$/);
    return party.dayNumber || !m ? party : { ...party, dayCode: m[1], dayNumber: m[2] };
}

export function partyValues(prefix, party) {
    const out = {
        [`${prefix}.idNumber`]: alnum(party.idNumber),
        [`${prefix}.natureOther`]: party.nature === "other" ? party.natureOther : "",
        [`${prefix}.surname`]: party.surname,
        [`${prefix}.initials`]: party.initials,
        [`${prefix}.firstNames`]: party.firstNames,
        [`${prefix}.dob`]: party.dob.replace(/-/g, ""),
        [`${prefix}.email`]: party.email,
        [`${prefix}.dayCode`]: digits(party.dayCode),
        [`${prefix}.dayNumber`]: digits(party.dayNumber),
        [`${prefix}.faxCode`]: digits(party.faxCode),
        [`${prefix}.faxNumber`]: digits(party.faxNumber),
        [`${prefix}.cell`]: digits(party.cell),
    };
    for (const kind of ["postal", "street"]) {
        const a = party[kind];
        out[`${prefix}.${kind}1`] = a.lines[0];
        out[`${prefix}.${kind}2`] = a.lines[1];
        out[`${prefix}.${kind}3`] = a.lines[2];
        out[`${prefix}.${kind}Suburb`] = a.suburb;
        out[`${prefix}.${kind}City`] = a.city;
        out[`${prefix}.${kind}Code`] = a.code;
    }
    if (party.idType) out[`${prefix}.idType.${party.idType}`] = "X";
    if (party.nature) out[`${prefix}.nature.${party.nature}`] = "X";
    if (party.notices) out[`${prefix}.notices.${party.notices}`] = "X";
    if (party.proxy) {
        if (party.proxy.idType) out[`${prefix}.proxy.idType.${party.proxy.idType}`] = "X";
        out[`${prefix}.proxy.idNumber`] = alnum(party.proxy.idNumber);
        out[`${prefix}.proxy.surname`] = party.proxy.surname;
        out[`${prefix}.proxy.initials`] = party.proxy.initials;
    }
    return out;
}

function vehicleValues(deal) {
    const v = deal.vehicle;
    const colour = val(v.colour).toLowerCase();
    const basic = ["white", "red", "blue"].includes(colour);
    const out = {
        "C.licence": val(v.licenceNo),
        "C.registerNo": val(v.registerNo),
        "C.vin": val(v.vin),
        "C.make": val(v.make),
        "C.series": val(v.series),
        "C.engine": val(v.engineNo),
        "C.odometer": val(v.odometer),
        "C.colourOther": colour && !basic ? val(v.colour) : "",
    };
    if (colour) out[`C.colour.${basic ? colour : "other"}`] = "X";
    if (val(v.transmission)) out[`C.transmission.${val(v.transmission)}`] = "X";
    if (val(v.description)) out[`C.description.${val(v.description)}`] = "X";
    return out;
}

// Keep the keys this form has, with a value to print.
function onlyIn(layout, values) {
    return Object.fromEntries(Object.entries(values).filter(([key, value]) => key in layout && str(value)));
}

export function buildRlvValues(deal, financeHouse) {
    const customer = customerParty(deal);
    return onlyIn(RLV, {
        "tx.titleHolder": "X",
        ...partyValues("A", financeHouse ? financeHouseParty(financeHouse) : customer),
        ...(financeHouse ? partyValues("B", customer) : {}),
        ...vehicleValues(deal),
        // Where the vehicle is kept: the customer's street address, cash or financed.
        "C.kept1": customer.street.lines[0],
        "C.kept2": customer.street.lines[1],
        "C.kept3": customer.street.lines[2],
        "C.keptSuburb": customer.street.suburb,
        "C.keptCity": customer.street.city,
        "C.keptCode": customer.street.code,
        "C.driven.self_propelled": "X",
        "C.reason.ownership": "X",
        "C.dateLiable": val(deal.orderDate).replace(/-/g, ""),
    });
}

export function buildNcoValues(deal, financeHouse) {
    const buyer = financeHouse ? financeHouseParty(financeHouse) : withMobileAsDayNumber(customerParty(deal));
    return onlyIn(NCO, {
        ...partyValues("A", EVEREST),
        ...partyValues("B", buyer),
        ...vehicleValues(deal),
        "C.reason.sold": "X",
        // The form pre-prints the century "20": only YYMMDD goes in the boxes.
        "C.dateOfChange": val(deal.orderDate).replace(/-/g, "").slice(2),
    });
}
