// South African ID number: YYMMDD, a 4-digit sequence (0000-4999 female,
// 5000-9999 male), citizenship digit, one more digit, then a Luhn check digit.
// Returns null unless all 13 digits are present, the checksum passes and
// YYMMDD is a real date, so callers can leave the ID blank when unsure.
export function parseSaId(raw, refIso = new Date().toISOString().slice(0, 10)) {
    const id = String(raw ?? "").replace(/\s/g, "");
    if (!/^\d{13}$/.test(id) || !luhnValid(id)) return null;

    const mm = id.slice(2, 4);
    const dd = id.slice(4, 6);
    // Two-digit year: this century unless that date would be after the reference date.
    let year = 2000 + Number(id.slice(0, 2));
    if (`${year}-${mm}-${dd}` > refIso) year -= 100;

    const date = new Date(Date.UTC(year, Number(mm) - 1, Number(dd)));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== Number(mm) - 1 || date.getUTCDate() !== Number(dd)) {
        return null;
    }

    return {
        idNumber: id,
        dob: `${year}-${mm}-${dd}`,
        gender: Number(id.slice(6, 10)) >= 5000 ? "male" : "female",
    };
}

function luhnValid(digits) {
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
        let d = Number(digits[digits.length - 1 - i]);
        if (i % 2 === 1) {
            d *= 2;
            if (d > 9) d -= 9;
        }
        sum += d;
    }
    return sum % 10 === 0;
}
