# OTP → RLV / NCO Paperwork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everest staff upload the dealer-system OTP on `/admin/paperwork`, review the extracted details, and download the RLV and NCO NaTIS forms pre-filled. Anything not certain stays blank.

**Architecture:** Everything about a deal happens in the browser. `unpdf` reads the OTP's page-1 text with positions; a pure parser turns that into an editable `Deal`; a pure builder routes the customer, finance house and Everest into form parts. `pdf-lib` stamps characters into box positions measured once from the blank forms. The server only stores the finance-house list (Supabase, admin-only server actions).

**Tech Stack:** Next.js 16 (App Router, JS), React 19, Tailwind 3, Supabase (service-role admin client), vitest 4, `unpdf@1.8.1`, `pdf-lib@1.17.1`.

**Spec:** `docs/superpowers/specs/2026-10-10-otp-natis-forms-design.md`

## Global Constraints

- Work in `C:/tmp/everest-split` on branch `feat/otp-natis-forms`. Run `git branch --show-current` immediately before every commit; if it isn't `feat/otp-natis-forms`, stop and ask.
- **The repo is PUBLIC.** Never commit the real OTP (the OTP PDF in `C:\Users\info\OneDrive\Documents\Ember Automations\Clients\Everest Motoring\Forms\`) or any real customer value. Fixtures use fake data only.
- No deal or customer data is stored or sent to the server. The only network requests during upload/review/download are `GET /forms/rlv.pdf` and `GET /forms/nco.pdf`.
- Blank if unsure: never invent a value. Fields not on the OTP stay blank unless the spec lists a derivation.
- New dependencies: exactly `unpdf@1.8.1` and `pdf-lib@1.17.1` (both MIT). Nothing else.
- Every server action calls `requireAdmin()` first. `"use server"` files export only async functions (a non-function export breaks `next build`).
- Never run `next build` while a dev server is running (it corrupts `.next`). Print `pwd` alongside every npm/npx command.
- Code style: 4-space indent, double quotes, semicolons, `@/` alias for `src/`. Admin UI reuses the existing admin classes (inputs `w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900`, labels `block text-sm font-bold text-slate-700 mb-2`, primary button `bg-primary hover:bg-primary-dark text-black font-bold rounded-lg`). `text-primary` is never used as text colour (Everest Yellow fails contrast).
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Run one test file with `npx vitest run <path>`; the whole suite with `npm test`.

## Layout data contract (from Task 1, already committed)

`src/utils/paperwork/layouts/rlv.js` (97 fields) and `nco.js` (47 fields) each `export default` an object:

```js
// key → { page: 0-based page index, top, bottom: box top/bottom in PDF points from the TOP of the page,
//         cells: [[x0, x1], ...] one entry per character box, left to right }
"A.surname": { page: 0, top: 365.7, bottom: 379.8, cells: [[95.16, 108.06], ...] }
```

- A tick box is a field with exactly one cell; it is filled with `"X"`.
- A date field's cells are digit slots: RLV dates (`A.dob`, `B.dob`, `C.dateLiable`) have 8 (`YYYYMMDD`). NCO `C.dateOfChange` has 6 (`YYMMDD`) because the form pre-prints the "20".
- Key names:
  - Party keys (`A.` / `B.` prefix): `idType.{traffic_register|rsa_id|foreign_id|business_reg}`, `idNumber`, `nature.{male|female|one_man|private_company|close_corporation|other}`, `natureOther`, `surname`, `initials`, `firstNames`, `dob`, `email`, `dayCode`, `dayNumber`, `faxCode`, `faxNumber`, `cell`, `postal1..3`, `postalSuburb`, `postalCity`, `postalCode`, `street1..3`, `streetSuburb`, `streetCity`, `streetCode`, `notices.{postal|street}`, `proxy.idType.{traffic_register|rsa_id|foreign_id}`, `proxy.idNumber`, `proxy.surname`, `proxy.initials`.
  - Vehicle and sale keys: `tx.titleHolder`, `C.licence`, `C.registerNo`, `C.vin`, `C.make`, `C.series`, `C.engine`, `C.odometer`, `C.colour.{white|red|blue|other}`, `C.colourOther`, `C.transmission.{manual|automatic}`, `C.description.{sedan|hatch_back|pick_up}`, `C.driven.self_propelled`, `C.reason.ownership`, `C.dateLiable`, `C.reason.sold`, `C.dateOfChange`.
- RLV Part A has every party key. The other parts have a subset: the NCO has no nature, first names, DOB, cellphone or fax, and only NCO `B` has a proxy block. `buildForms` filters each form's values to the keys its layout has.

---

### Task 1: Blank templates and measured layouts ✅ DONE (commit `eb172ee`)

Already committed during planning, after being verified by stamping every cell and inspecting all 7 rendered pages:
- `public/forms/rlv.pdf`, `public/forms/nco.pdf`: blank NaTIS forms, with their metadata stripped.
- `scripts/measure-natis-forms.py`: regenerates the layouts (`python scripts/measure-natis-forms.py`, needs PyMuPDF).
- `src/utils/paperwork/layouts/rlv.js`, `nco.js`: the generated layout data described above.

Nothing to do. Do not edit the layout files by hand.

---

### Task 2: Dependencies + `extractPageText`

**Files:**
- Modify: `package.json`, `package-lock.json` (via npm)
- Create: `src/utils/paperwork/extractText.js`
- Test: `src/utils/paperwork/extractText.test.js`

**Interfaces:**
- Produces: `extractPageText(bytes: ArrayBuffer | Uint8Array, pageNumber = 1) → Promise<Array<{ str: string, x: number, y: number, width: number }>>`. `x` is from the left edge and `y` is the text baseline measured from the top edge, both in PDF points. Whitespace-only runs are dropped.

- [ ] **Step 1: Install the two dependencies**

```bash
cd /c/tmp/everest-split && pwd && npm install unpdf@1.8.1 pdf-lib@1.17.1
```
Expected: `package.json` dependencies gain `"pdf-lib": "^1.17.1"` and `"unpdf": "^1.8.1"`.

- [ ] **Step 2: Write the failing test** at `src/utils/paperwork/extractText.test.js`

```js
import { describe, it, expect } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractPageText } from "./extractText";

// A one-page A4 PDF with each text run drawn at (x, y-from-top).
async function pdfWith(runs) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const { str, x, y } of runs) page.drawText(str, { x, y: 842 - y, size: 8, font });
    return pdf.save();
}

describe("extractPageText", () => {
    it("returns each text run with x from the left and baseline y from the top", async () => {
        const items = await extractPageText(await pdfWith([
            { str: "VIN No:", x: 40, y: 206.5 },
            { str: "AHTFR22G406012345", x: 96.7, y: 206.5 },
        ]));
        const label = items.find((i) => i.str === "VIN No:");
        expect(label.x).toBeCloseTo(40, 1);
        expect(label.y).toBeCloseTo(206.5, 1);
        expect(label.width).toBeGreaterThan(0);
        expect(items.find((i) => i.str === "AHTFR22G406012345").x).toBeCloseTo(96.7, 1);
    });

    it("returns nothing for a page without text (a scan)", async () => {
        expect(await extractPageText(await pdfWith([]))).toEqual([]);
    });
});
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/extractText.test.js`
Expected: FAIL, cannot resolve `./extractText`.

- [ ] **Step 4: Implement** `src/utils/paperwork/extractText.js`

```js
import { getDocumentProxy } from "unpdf";

// Text runs on one page of a PDF with their positions in PDF points:
// x from the left edge, y (the baseline) from the top edge. parseOtp reads these.
export async function extractPageText(bytes, pageNumber = 1) {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const page = await pdf.getPage(pageNumber);
    const { height } = page.getViewport({ scale: 1 });
    const { items } = await page.getTextContent();
    return items
        .filter((item) => item.str && item.str.trim())
        .map((item) => ({ str: item.str, x: item.transform[4], y: height - item.transform[5], width: item.width }));
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/extractText.test.js`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add package.json package-lock.json src/utils/paperwork/extractText.js src/utils/paperwork/extractText.test.js
git commit -m "feat(everest): read positioned text from PDFs with unpdf

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: SA ID number validation (`parseSaId`)

**Files:**
- Create: `src/utils/paperwork/saId.js`
- Test: `src/utils/paperwork/saId.test.js`

**Interfaces:**
- Produces: `parseSaId(raw: string, refIso?: "YYYY-MM-DD") → { idNumber: string, dob: "YYYY-MM-DD", gender: "male" | "female" } | null`. Returns null unless the value is 13 digits (spaces ignored), passes the Luhn check and YYMMDD is a real date. The century is 20xx unless that date would fall after `refIso` (default: today), in which case it's 19xx.

- [ ] **Step 1: Write the failing test** at `src/utils/paperwork/saId.test.js`

```js
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/saId.test.js`
Expected: FAIL, cannot resolve `./saId`.

- [ ] **Step 3: Implement** `src/utils/paperwork/saId.js`

```js
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/saId.test.js`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add src/utils/paperwork/saId.js src/utils/paperwork/saId.test.js
git commit -m "feat(everest): validate SA ID numbers and derive DOB and gender

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: OTP parser (`parseOtp`)

**Files:**
- Create: `src/utils/paperwork/__fixtures__/otpItems.js`
- Create: `src/utils/paperwork/parseOtp.js`
- Test: `src/utils/paperwork/parseOtp.test.js`

**Interfaces:**
- Consumes: `parseSaId` (Task 3). Its input is the `extractPageText` item shape (Task 2).
- Produces:
  - `class OtpError extends Error`: thrown for user-facing rejections. Its message is shown to staff as-is.
  - `parseOtp(items) → Deal`, where:

```js
// Field = { value: string, origin: "otp" | "derived" | "blank" | "edited", note?: string }
Deal = {
    dealId: Field, orderDate: Field /* "YYYY-MM-DD" */,
    customer: {
        kind: "person" | "organisation",            // plain string, not a Field
        surname, firstNames, initials, idType /* "rsa_id" | "" */, idNumber,
        gender /* "male"|"female"|"" */, dob /* "YYYY-MM-DD" */, email, cell,
        street1, street2, street3, streetSuburb, streetCity, streetCode,
        postal1, postal2, postal3, postalSuburb, postalCity, postalCode,
        notices /* "postal"|"street"|"" */,                    // all Fields
    },
    vehicle: {
        licenceNo, registerNo, vin, engineNo, odometer, make, series, colour,
        transmission /* "automatic"|"manual"|"" */, description /* "sedan"|"hatch_back"|"pick_up"|"" */,
    },
}
```

- [ ] **Step 1: Create the fixture** `src/utils/paperwork/__fixtures__/otpItems.js`

This is page 1 of a real dealer-system OTP, as `extractPageText` returns it, with every customer, staff and vehicle value replaced by fake data. Copy it exactly.

```js
// Page-1 text runs of the dealer system's OTP ("CONTRACT FOR THE SALE OF A USED
// MOTOR VEHICLE", ActiveReports layout) as extractPageText returns them, with
// every customer, staff and vehicle value replaced by fake data. The real OTP
// must never be committed: this repo is public.
export const OTP_ITEMS = [
    { str: "Order Details :", x: 430.1, y: 110.8, width: 48.2 },
    { str: "Driver :", x: 430.1, y: 185.3, width: 22.5 },
    { str: "Customer :", x: 54.5, y: 110.8, width: 36.9 },
    { str: "Deal ID:", x: 415.6, y: 121.5, width: 25.3 },
    { str: "Customer Order:", x: 415.6, y: 132.1, width: 52.1 },
    { str: "Order Date:", x: 415.6, y: 142.7, width: 36.5 },
    { str: "Est. Delivery Date:", x: 415.6, y: 153.4, width: 57.9 },
    { str: "Salesperson:", x: 415.6, y: 167.5, width: 40.8 },
    { str: "Private:", x: 266.8, y: 167.5, width: 23.7 },
    { str: "VAT No.", x: 266.8, y: 121.5, width: 26.4 },
    { str: "Mobile:", x: 266.8, y: 132.1, width: 22.6 },
    { str: "Fax:", x: 266.8, y: 142.7, width: 13.6 },
    { str: "Business:", x: 266.8, y: 153.4, width: 30.3 },
    { str: "Email:", x: 40, y: 167.5, width: 19.4 },
    { str: "DOB.:", x: 40, y: 156.9, width: 19 },
    { str: "Driver Licence No.", x: 125, y: 156.9, width: 57.5 },
    { str: "D.O.B.:", x: 415.6, y: 195.9, width: 22.9 },
    { str: "Drivers Licence", x: 415.6, y: 206.5, width: 48.2 },
    { str: "Full Name:", x: 415.6, y: 217.1, width: 33.8 },
    { str: "Phone:", x: 415.6, y: 227.8, width: 22.2 },
    { str: "Build Date:", x: 220.7, y: 227.8, width: 34.2 },
    { str: "Engine No:", x: 220.7, y: 206.5, width: 34.6 },
    { str: "Compliance Date:", x: 220.7, y: 217.1, width: 55.6 },
    { str: "Rego Expiry:", x: 220.7, y: 195.9, width: 40 },
    { str: "Odometer:", x: 40, y: 227.8, width: 33 },
    { str: "VIN No:", x: 40, y: 206.5, width: 24.5 },
    { str: "Stock No:", x: 40, y: 217.1, width: 30.3 },
    { str: "Rego No:", x: 40, y: 195.9, width: 29.6 },
    { str: "12 Example Road,", x: 40, y: 132.1, width: 70.4 },
    { str: "NELSPRUIT MP 1200", x: 40, y: 140.2, width: 74.8 },
    { str: "8001015009087", x: 319.9, y: 121.5, width: 57.2 },
    { str: "pieter@example.com", x: 68.3, y: 167.5, width: 79.2 },
    { str: "0821234567", x: 319.9, y: 132.1, width: 44 },
    { str: "AHTFR22G406012345", x: 96.7, y: 206.5, width: 74.8 },
    { str: "AB12CDGP", x: 96.7, y: 195.9, width: 35.2 },
    { str: "2021/03/01", x: 319.9, y: 227.8, width: 44 },
    { str: "/", x: 344.7, y: 217.1, width: 1.9 },
    { str: "1GD0123456", x: 319.9, y: 206.5, width: 44 },
    { str: "100", x: 96.7, y: 217.1, width: 13.2 },
    { str: "45000", x: 96.7, y: 227.8, width: 22 },
    { str: "999", x: 511.2, y: 121.5, width: 13.2 },
    { str: "2026/09/30", x: 511.2, y: 153.4, width: 35 },
    { str: "Test Seller", x: 479.4, y: 167.5, width: 48.4 },
    { str: "2026/09/29", x: 511.2, y: 142.7, width: 35 },
    { str: "Vehicle :", x: 54.5, y: 185.3, width: 26.8 },
    { str: "Mr Pieter Botha", x: 40, y: 121.5, width: 66 },
    { str: "2027/01/31", x: 319.9, y: 195.9, width: 44 },
    { str: "The Customer/Purchaser agrees to buy from the Dealer and the Dealer agrees to sell the Customer/Purchaser the motor vehicle and accessories described in", x: 36.4, y: 245.5, width: 523.1 },
    { str: "Pages below and the terms and conditions on the adjacent pages.", x: 36.4, y: 253.5, width: 219.1 },
    { str: "USED VEHICLE", x: 36.4, y: 266.8, width: 51.7 },
    { str: "DEALER DELIVERY:", x: 36.4, y: 416.8, width: 68 },
    { str: "R0.00", x: 550.8, y: 431, width: 18.7 },
    { str: "OPTIONS:", x: 36.4, y: 295.3, width: 33.8 },
    { str: "VAT EXCLUSIVE ITEMS:", x: 36.4, y: 487.7, width: 81.2 },
    { str: "LESS TRADE(S):", x: 36.4, y: 566, width: 55.9 },
    { str: "GENUINE ACCESSORY:", x: 36.4, y: 309.6, width: 80.4 },
    { str: "LESS ALLOWANCE:", x: 36.4, y: 431, width: 68 },
    { str: "LESS DEPOSIT:", x: 36.4, y: 590.8, width: 53.2 },
    { str: "NON GENUINE ACCESSORY:", x: 36.4, y: 324, width: 97.9 },
    { str: "AFTERMARKET ACCESSORY:", x: 36.4, y: 338.1, width: 101.8 },
    { str: "Vehicle Sub-Total Excluding VAT", x: 302.2, y: 448.7, width: 109.9 },
    { str: "R81,834.78", x: 533.1, y: 459.3, width: 36.2 },
    { str: "VAT Payable @", x: 302.2, y: 459.3, width: 49.9 },
    { str: "R629,900.00", x: 529.2, y: 469.9, width: 40.1 },
    { str: "Vehicle Sub-Total Inclusive of VAT", x: 302.2, y: 469.9, width: 115 },
    { str: "R548,065.22", x: 529.2, y: 448.7, width: 40.1 },
    { str: "R629,900.00", x: 529.2, y: 540.9, width: 40.1 },
    { str: "VEHICLE TOTAL INCLUSIVE OF VAT @", x: 302.2, y: 540.9, width: 131.1 },
    { str: "OTHER INSURANCE:", x: 36.4, y: 523.5, width: 70.3 },
    { str: "15.00%", x: 355.3, y: 459.3, width: 23.7 },
    { str: "15.00%", x: 436.8, y: 540.9, width: 23.7 },
    { str: "VEHICLE SURCHARGE:", x: 36.4, y: 362.9, width: 79.7 },
    { str: "TOYOTA Hilux 2.8 GD-6 Raider 4x4 A/T P/U D/C", x: 139.2, y: 266.8, width: 193.6 },
    { str: "R452,086.96", x: 529.4, y: 266.8, width: 40.1 },
    { str: "TOYOTA", x: 433.3, y: 266.8, width: 26.4 },
    { str: "Vehicle Colour: Silver", x: 139.2, y: 281.2, width: 96.8 },
    { str: "R6,521.74", x: 537.2, y: 362.9, width: 32.3 },
    { str: "Admin", x: 139.2, y: 362.9, width: 19.8 },
    { str: "R2,500.00", x: 537.2, y: 373.6, width: 32.3 },
    { str: "Lic & Reg", x: 139.2, y: 373.6, width: 30.3 },
    { str: "R43,478.26", x: 533.3, y: 384.2, width: 36.2 },
    { str: "Armadillo", x: 139.2, y: 384.2, width: 29.2 },
    { str: "R26,086.96", x: 533.3, y: 394.8, width: 36.2 },
    { str: "Mags", x: 139.2, y: 394.8, width: 17.1 },
    { str: "R17,391.30", x: 533.3, y: 405.5, width: 36.2 },
    { str: "Leather", x: 139.2, y: 405.5, width: 23.7 },
    { str: "BALANCE PAYABLE ON DELIVERY", x: 302.2, y: 608.6, width: 118.9 },
    { str: "R629,900.00", x: 529.5, y: 608.6, width: 40.1 },
    { str: "Both Parties to sign:", x: 32.9, y: 652.6, width: 78.1 },
    { str: "(Date)", x: 536, y: 666.8, width: 22.2 },
    { str: "Dealer Signature (Name)", x: 117.9, y: 666.8, width: 88.9 },
    { str: "Customer Signature (Name)", x: 358.9, y: 666.8, width: 100 },
    { str: "(Date)", x: 302.2, y: 666.8, width: 22.2 },
    { str: "CONTRACT FOR THE SALE OF A USED MOTOR VEHICLE", x: 36.4, y: 95.4, width: 275.3 },
    { str: "DEAL ID:", x: 412, y: 95.4, width: 43.3 },
    { str: "999", x: 461.6, y: 95.4, width: 13.2 },
    { str: "Created On", x: 32.9, y: 816.2, width: 41.3 },
    { str: "6", x: 550.2, y: 816.2, width: 4.4 },
    { str: "At", x: 135.6, y: 816.2, width: 7.5 },
    { str: "Page", x: 493.5, y: 816.2, width: 18.7 },
    { str: "of", x: 539.6, y: 816.2, width: 6.7 },
    { str: "11:31 AM", x: 153.4, y: 816.2, width: 34.2 },
    { str: "9/29/2026", x: 82.5, y: 816.2, width: 35.6 },
    { str: "1", x: 529.6, y: 816.2, width: 4.4 },
    { str: "Continued Overleaf > > >", x: 393.5, y: 816.2, width: 94.4 },
    { str: "Dealer Initial", x: 210.1, y: 816.2, width: 44.4 },
    { str: "Customer Initial", x: 295.1, y: 816.2, width: 55.5 },
];
```

- [ ] **Step 2: Write the failing test** at `src/utils/paperwork/parseOtp.test.js`

```js
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
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/parseOtp.test.js`
Expected: FAIL, cannot resolve `./parseOtp`.

- [ ] **Step 4: Implement** `src/utils/paperwork/parseOtp.js`

```js
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
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/parseOtp.test.js`
Expected: 11 passed.

- [ ] **Step 6: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add src/utils/paperwork/parseOtp.js src/utils/paperwork/parseOtp.test.js src/utils/paperwork/__fixtures__/otpItems.js
git commit -m "feat(everest): parse the dealer-system OTP into an editable deal

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Form values (`buildForms`) and Everest's details

**Files:**
- Create: `src/utils/paperwork/dealer.js`
- Create: `src/utils/paperwork/buildForms.js`
- Test: `src/utils/paperwork/buildForms.test.js`

**Interfaces:**
- Consumes: the `Deal` from Task 4 and the layouts from Task 1. A finance house is a `finance_houses` row (Task 7 columns: `name, id_type, id_number, nature, nature_other, email, phone_code, phone_number, fax_code, fax_number, postal_line1..3, postal_suburb, postal_city, postal_code, street_line1..3, street_suburb, street_city, street_code, notices_to, proxy_id_type, proxy_id_number, proxy_surname, proxy_initials`, any of which may be null).
- Produces:
  - `buildRlvValues(deal, financeHouse | null) → Record<layoutKey, string>`
  - `buildNcoValues(deal, financeHouse | null) → Record<layoutKey, string>`

    Both return only keys that exist in that form's layout and have a non-empty value. Tick boxes get `"X"`, dates are digits only, and ID numbers are alphanumeric only.
  - `partyValues(prefix, party)`, `customerParty(deal)`, `financeHouseParty(row)`: exported for tests.
  - `EVEREST` (dealer.js): Everest's party.

- [ ] **Step 1: Create** `src/utils/paperwork/dealer.js`

```js
// Everest Motoring's legal entity: the seller on every NCO. Taken from the OTP
// letterhead. Its email and NaTIS proxy aren't on any document, so they stay
// blank until Everest supplies them.
export const EVEREST = {
    idType: "business_reg",
    idNumber: "2011/007142/07",
    nature: "private_company",
    natureOther: "",
    surname: "DeCar Beleggings (Pty) Ltd",
    initials: "",
    firstNames: "",
    dob: "",
    email: "",
    dayCode: "013",
    dayNumber: "8540600",
    faxCode: "",
    faxNumber: "",
    cell: "",
    postal: { lines: ["", "", ""], suburb: "", city: "", code: "" },
    street: { lines: ["", "", ""], suburb: "", city: "", code: "" },
    notices: "",
    proxy: null,
};
```

- [ ] **Step 2: Write the failing test** at `src/utils/paperwork/buildForms.test.js`

```js
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
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/buildForms.test.js`
Expected: FAIL, cannot resolve `./buildForms`.

- [ ] **Step 4: Implement** `src/utils/paperwork/buildForms.js`

```js
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
    const m = party.cell.match(/^(0\d{2})(\d{7})$/);
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
        [`${prefix}.dayCode`]: party.dayCode,
        [`${prefix}.dayNumber`]: party.dayNumber,
        [`${prefix}.faxCode`]: party.faxCode,
        [`${prefix}.faxNumber`]: party.faxNumber,
        [`${prefix}.cell`]: party.cell,
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
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/buildForms.test.js`
Expected: 7 passed.

- [ ] **Step 6: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add src/utils/paperwork/dealer.js src/utils/paperwork/buildForms.js src/utils/paperwork/buildForms.test.js
git commit -m "feat(everest): route customer, bank and Everest into RLV/NCO values

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: PDF filler (`fillForm`) + local real-OTP check

**Files:**
- Create: `src/utils/paperwork/fillForm.js`
- Test: `src/utils/paperwork/fillForm.test.js`
- Create: `src/utils/paperwork/realOtp.test.js` (skipped unless `REAL_OTP` is set)

**Interfaces:**
- Consumes: layouts (Task 1), `extractPageText` (Task 2, tests only), `parseOtp` / `buildRlvValues` / `buildNcoValues` (real-OTP check only).
- Produces: `fillForm(templateBytes: ArrayBuffer | Uint8Array, layout, values) → Promise<Uint8Array>` (the filled PDF). It throws `Error("Unknown form field: <key>")` for a key the layout lacks.

- [ ] **Step 1: Write the failing test** at `src/utils/paperwork/fillForm.test.js`

```js
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { fillForm } from "./fillForm";
import { extractPageText } from "./extractText";
import RLV from "./layouts/rlv";
import NCO from "./layouts/nco";

const rlvTemplate = await readFile("public/forms/rlv.pdf");
const ncoTemplate = await readFile("public/forms/nco.pdf");

// Text runs inside one field's boxes, left to right.
async function inField(pdfBytes, field) {
    const items = await extractPageText(pdfBytes, field.page + 1);
    const left = field.cells[0][0];
    const right = field.cells[field.cells.length - 1][1];
    return items
        .filter((i) => i.y > field.top && i.y < field.bottom && i.x >= left && i.x < right)
        .sort((a, b) => a.x - b.x);
}

describe("fillForm", () => {
    it("prints each character, uppercased, inside its own box", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.surname": "Botha" });
        const field = RLV["A.surname"];
        const items = await inField(out, field);
        expect(items.map((i) => i.str).join("")).toBe("BOTHA");
        items.forEach((item, n) => {
            const [x0, x1] = field.cells[n];
            expect(item.x).toBeGreaterThan(x0);
            expect(item.x + item.width).toBeLessThan(x1);
        });
    });

    it("prints date digits into the date slots", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.dob": "19800101" });
        expect((await inField(out, RLV["A.dob"])).map((i) => i.str).join("")).toBe("19800101");
    });

    it("marks a tick box with an X inside it", async () => {
        const out = await fillForm(ncoTemplate, NCO, { "C.reason.sold": "X" });
        expect((await inField(out, NCO["C.reason.sold"])).filter((i) => i.str === "X")).toHaveLength(1);
    });

    it("prints text longer than its boxes smaller, within the run", async () => {
        const series = "Hilux 2.8 GD-6 Raider 4x4 A/T P/U D/C";
        const field = RLV["C.series"];
        const out = await fillForm(rlvTemplate, RLV, { "C.series": series });
        const [item] = await inField(out, field);
        expect(item.str).toBe(series.toUpperCase());
        expect(item.x + item.width).toBeLessThanOrEqual(field.cells[field.cells.length - 1][1]);
    });

    it("skips empty values", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.surname": "  " });
        expect(await inField(out, RLV["A.surname"])).toEqual([]);
    });

    it("rejects a key the form doesn't have", async () => {
        await expect(fillForm(rlvTemplate, RLV, { "A.nope": "x" })).rejects.toThrow("Unknown form field: A.nope");
    });

    it("keeps every page of the template", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.surname": "Botha" });
        expect((await PDFDocument.load(out)).getPageCount()).toBe(4);
    });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/fillForm.test.js`
Expected: FAIL, cannot resolve `./fillForm`.

- [ ] **Step 3: Implement** `src/utils/paperwork/fillForm.js`

```js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const INK = rgb(0, 0, 0);

// Stamps values onto a blank NaTIS form. `layout` maps field keys to their boxes
// (layouts/*.js); `values` maps the same keys to strings. Each character goes
// centred in its own box, so a tick box (one cell) takes "X". Text longer than
// its run of boxes is printed smaller across the run rather than cut off.
export async function fillForm(templateBytes, layout, values) {
    const pdf = await PDFDocument.load(templateBytes);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const pages = pdf.getPages();

    for (const [key, raw] of Object.entries(values)) {
        const text = String(raw ?? "").trim().toUpperCase();
        if (!text) continue;
        const field = layout[key];
        if (!field) throw new Error(`Unknown form field: ${key}`);

        const page = pages[field.page];
        const boxHeight = field.bottom - field.top;
        const size = Math.min(10, boxHeight * 0.68);
        // Layout y runs down from the top; pdf-lib's runs up from the bottom.
        // Centre the capital height (about 0.72 of the font size) in the box.
        const baseline = (s) => page.getHeight() - field.bottom + (boxHeight - s * 0.72) / 2;

        if (text.length <= field.cells.length) {
            [...text].forEach((ch, i) => {
                const [x0, x1] = field.cells[i];
                const width = font.widthOfTextAtSize(ch, size);
                page.drawText(ch, { x: (x0 + x1) / 2 - width / 2, y: baseline(size), size, font, color: INK });
            });
        } else {
            const x0 = field.cells[0][0] + 1;
            const x1 = field.cells[field.cells.length - 1][1] - 1;
            const fit = Math.min(size, (size * (x1 - x0)) / font.widthOfTextAtSize(text, size));
            page.drawText(text, { x: x0, y: baseline(fit), size: fit, font, color: INK });
        }
    }
    return pdf.save();
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/utils/paperwork/fillForm.test.js`
Expected: 7 passed.

- [ ] **Step 5: Create the local real-OTP check** `src/utils/paperwork/realOtp.test.js`

```js
import { describe, it, expect } from "vitest";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { extractPageText } from "./extractText";
import { parseOtp } from "./parseOtp";
import { buildRlvValues, buildNcoValues } from "./buildForms";
import { fillForm } from "./fillForm";
import RLV from "./layouts/rlv";
import NCO from "./layouts/nco";

// Manual check against a real OTP, which must never be committed (public repo).
// Skipped unless REAL_OTP is set:
//   REAL_OTP="C:/path/otp.pdf" REAL_OTP_OUT="C:/scratch/out" npx vitest run src/utils/paperwork/realOtp.test.js
// Writes deal.json plus cash and financed RLV/NCO PDFs to REAL_OTP_OUT for inspection.
const TEST_BANK = {
    name: "Test Bank", id_type: "business_reg", id_number: "1999/000001/06", nature: "other",
    nature_other: "Public company", phone_code: "011", phone_number: "5550000",
    postal_line1: "PO Box 1", postal_city: "Johannesburg", postal_code: "2000", notices_to: "postal",
    proxy_id_type: "rsa_id", proxy_id_number: "8001015000086", proxy_surname: "Mokoena", proxy_initials: "T",
};

describe.skipIf(!process.env.REAL_OTP)("real OTP (local only)", () => {
    it("parses the OTP and fills both forms, cash and financed", async () => {
        const out = process.env.REAL_OTP_OUT;
        await mkdir(out, { recursive: true });
        const deal = parseOtp(await extractPageText(await readFile(process.env.REAL_OTP)));
        await writeFile(path.join(out, "deal.json"), JSON.stringify(deal, null, 2));
        const rlv = await readFile("public/forms/rlv.pdf");
        const nco = await readFile("public/forms/nco.pdf");
        for (const [suffix, house] of [["cash", null], ["financed", TEST_BANK]]) {
            await writeFile(path.join(out, `rlv-${suffix}.pdf`), await fillForm(rlv, RLV, buildRlvValues(deal, house)));
            await writeFile(path.join(out, `nco-${suffix}.pdf`), await fillForm(nco, NCO, buildNcoValues(deal, house)));
        }
        expect(deal.dealId.value).not.toBe("");
    });
});
```

- [ ] **Step 6: Run the real-OTP check against the client's sample (local only)**

```bash
cd /c/tmp/everest-split && pwd && REAL_OTP="<path to the OTP PDF in the client Forms folder>" REAL_OTP_OUT="C:/tmp/everest-otp-check" npx vitest run src/utils/paperwork/realOtp.test.js
```
Expected: 1 passed, and `C:/tmp/everest-otp-check` holds `deal.json`, `rlv-cash.pdf`, `nco-cash.pdf`, `rlv-financed.pdf`, `nco-financed.pdf`. Open `deal.json` and confirm every value against the OTP itself: surname, first names, deal number, order date, VIN, series, colour, street city and code. The output folder is outside the repo, so it is never committed.

- [ ] **Step 7: Commit** (the real-OTP test file has no customer data; it skips by default)

```bash
cd /c/tmp/everest-split && git branch --show-current
git status --short   # must NOT list any .pdf outside public/forms, or deal.json
git add src/utils/paperwork/fillForm.js src/utils/paperwork/fillForm.test.js src/utils/paperwork/realOtp.test.js
git commit -m "feat(everest): stamp values into the RLV/NCO boxes with pdf-lib

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Finance houses: migration and admin server actions

**Files:**
- Create: `supabase/migrations/20261010_finance_houses.sql`
- Create: `src/utils/paperwork/financeHouseFields.js`
- Create: `src/app/admin/paperwork/actions.js`
- Test: `src/app/admin/paperwork/actions.test.js`

**Interfaces:**
- Produces:
  - `FINANCE_HOUSE_COLUMNS: string[]` and `cleanFinanceHouse(input) → row` (financeHouseFields.js). The row keeps only those columns, trimmed, with `""` → `null`.
  - Server actions (actions.js):
    - `listFinanceHouses() → { houses: Row[], missingTable: boolean }`
    - `saveFinanceHouse(input) → { house: Row } | { error: string }`: inserts when `input.id` is absent, otherwise updates that id.
    - `deleteFinanceHouse(id) → void`

    All of them throw `"Unauthorized"` / `"Admins only"` for non-admins.

- [ ] **Step 1: Create the migration** `supabase/migrations/20261010_finance_houses.sql`

```sql
-- Finance houses (banks) that can be the title holder on a financed sale.
-- /admin/paperwork uses them to fill RLV Part A and NCO Part B.
create table if not exists public.finance_houses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    id_type text check (id_type in ('business_reg', 'traffic_register')),
    id_number text,
    nature text check (nature in ('private_company', 'close_corporation', 'other')),
    nature_other text,
    email text,
    phone_code text,
    phone_number text,
    fax_code text,
    fax_number text,
    postal_line1 text,
    postal_line2 text,
    postal_line3 text,
    postal_suburb text,
    postal_city text,
    postal_code text,
    street_line1 text,
    street_line2 text,
    street_line3 text,
    street_suburb text,
    street_city text,
    street_code text,
    notices_to text check (notices_to in ('postal', 'street')),
    proxy_id_type text check (proxy_id_type in ('traffic_register', 'rsa_id', 'foreign_id')),
    proxy_id_number text,
    proxy_surname text,
    proxy_initials text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- No policies: RLS denies all anon/authenticated access. Reads and writes go
-- through admin-checked server actions using the service-role client.
alter table public.finance_houses enable row level security;
```

- [ ] **Step 2: Create** `src/utils/paperwork/financeHouseFields.js`

```js
// Columns of public.finance_houses that the admin form edits (all but id and timestamps).
export const FINANCE_HOUSE_COLUMNS = [
    "name", "id_type", "id_number", "nature", "nature_other",
    "email", "phone_code", "phone_number", "fax_code", "fax_number",
    "postal_line1", "postal_line2", "postal_line3", "postal_suburb", "postal_city", "postal_code",
    "street_line1", "street_line2", "street_line3", "street_suburb", "street_city", "street_code",
    "notices_to", "proxy_id_type", "proxy_id_number", "proxy_surname", "proxy_initials",
];

// Only known columns, trimmed; empty becomes null so the enum checks accept it.
export function cleanFinanceHouse(input) {
    return Object.fromEntries(
        FINANCE_HOUSE_COLUMNS.map((column) => {
            const value = String(input?.[column] ?? "").trim();
            return [column, value || null];
        }),
    );
}
```

- [ ] **Step 3: Write the failing test** at `src/app/admin/paperwork/actions.test.js`

```js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Who is signed in, what the next admin query resolves to, and what it was asked.
const state = { user: null, role: null, result: null };
let calls = [];

// Chainable stand-in for a Supabase query builder; awaiting it resolves to state.result.
function query(table) {
    const q = {
        select: () => q,
        order: () => q,
        single: () => q,
        eq: (...args) => (calls.push(["eq", ...args]), q),
        insert: (row) => (calls.push(["insert", table, row]), q),
        update: (row) => (calls.push(["update", table, row]), q),
        delete: () => (calls.push(["delete", table]), q),
        then: (resolve, reject) => Promise.resolve(state.result).then(resolve, reject),
    };
    return q;
}

vi.mock("@/utils/supabase/server", () => ({
    createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: state.user } }) },
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: state.user ? { role: state.role } : null }) }) }),
        }),
    }),
    createAdminClient: async () => ({ from: (table) => query(table) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { listFinanceHouses, saveFinanceHouse, deleteFinanceHouse } = await import("./actions");

beforeEach(() => {
    state.user = { id: "u1" };
    state.role = "admin";
    state.result = { data: [], error: null };
    calls = [];
});

describe("finance house actions", () => {
    it("refuse signed-out users", async () => {
        state.user = null;
        await expect(listFinanceHouses()).rejects.toThrow("Unauthorized");
        await expect(saveFinanceHouse({ name: "Test Bank" })).rejects.toThrow("Unauthorized");
        await expect(deleteFinanceHouse("fh-1")).rejects.toThrow("Unauthorized");
        expect(calls).toEqual([]);
    });

    it("refuse users who aren't admins", async () => {
        state.role = "affiliate";
        await expect(listFinanceHouses()).rejects.toThrow("Admins only");
        await expect(saveFinanceHouse({ name: "Test Bank" })).rejects.toThrow("Admins only");
        await expect(deleteFinanceHouse("fh-1")).rejects.toThrow("Admins only");
        expect(calls).toEqual([]);
    });

    it("lists finance houses", async () => {
        state.result = { data: [{ id: "fh-1", name: "Test Bank" }], error: null };
        expect(await listFinanceHouses()).toEqual({ houses: [{ id: "fh-1", name: "Test Bank" }], missingTable: false });
    });

    it("reports a missing table instead of failing", async () => {
        state.result = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
        expect(await listFinanceHouses()).toEqual({ houses: [], missingTable: true });
    });

    it("requires a name", async () => {
        expect(await saveFinanceHouse({ name: "   " })).toEqual({ error: "Name is required." });
        expect(calls).toEqual([]);
    });

    it("inserts a cleaned row for a new finance house", async () => {
        state.result = { data: { id: "fh-1", name: "Test Bank" }, error: null };
        const result = await saveFinanceHouse({ name: " Test Bank ", id_type: "business_reg", email: "", bogus: "x" });
        expect(result).toEqual({ house: { id: "fh-1", name: "Test Bank" } });
        const [, table, row] = calls.find((c) => c[0] === "insert");
        expect(table).toBe("finance_houses");
        expect(row).toMatchObject({ name: "Test Bank", id_type: "business_reg", email: null });
        expect(row).not.toHaveProperty("bogus");
    });

    it("updates an existing finance house by id", async () => {
        state.result = { data: { id: "fh-1", name: "Test Bank" }, error: null };
        await saveFinanceHouse({ id: "fh-1", name: "Test Bank" });
        expect(calls.some((c) => c[0] === "update")).toBe(true);
        expect(calls).toContainEqual(["eq", "id", "fh-1"]);
    });

    it("deletes by id", async () => {
        state.result = { error: null };
        await deleteFinanceHouse("fh-1");
        expect(calls).toEqual([["delete", "finance_houses"], ["eq", "id", "fh-1"]]);
    });
});
```

- [ ] **Step 4: Run it and confirm it fails**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/app/admin/paperwork/actions.test.js`
Expected: FAIL, cannot resolve `./actions`.

- [ ] **Step 5: Implement** `src/app/admin/paperwork/actions.js`

```js
"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cleanFinanceHouse } from "@/utils/paperwork/financeHouseFields";

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || profile.role !== "admin") throw new Error("Admins only");
}

// Postgres "undefined table" / PostgREST "not in schema cache": the migration
// hasn't been run yet, so the page offers Cash only.
const MISSING_TABLE = new Set(["42P01", "PGRST205"]);

export async function listFinanceHouses() {
    await requireAdmin();
    const admin = await createAdminClient();
    const { data, error } = await admin.from("finance_houses").select("*").order("name");
    if (error) {
        if (MISSING_TABLE.has(error.code)) return { houses: [], missingTable: true };
        throw new Error(error.message);
    }
    return { houses: data ?? [], missingTable: false };
}

export async function saveFinanceHouse(input) {
    await requireAdmin();
    const row = cleanFinanceHouse(input);
    if (!row.name) return { error: "Name is required." };

    const admin = await createAdminClient();
    const table = admin.from("finance_houses");
    const query = input?.id
        ? table.update({ ...row, updated_at: new Date().toISOString() }).eq("id", input.id)
        : table.insert(row);
    const { data, error } = await query.select().single();
    if (error) return { error: error.message };
    revalidatePath("/admin/paperwork");
    return { house: data };
}

export async function deleteFinanceHouse(id) {
    await requireAdmin();
    const admin = await createAdminClient();
    const { error } = await admin.from("finance_houses").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/paperwork");
}
```

- [ ] **Step 6: Run the test and confirm it passes**

Run: `cd /c/tmp/everest-split && pwd && npx vitest run src/app/admin/paperwork/actions.test.js`
Expected: 8 passed.

- [ ] **Step 7: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add supabase/migrations/20261010_finance_houses.sql src/utils/paperwork/financeHouseFields.js src/app/admin/paperwork/actions.js src/app/admin/paperwork/actions.test.js
git commit -m "feat(everest): finance houses table and admin-only actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: The Paperwork admin page

**Files:**
- Modify: `src/components/admin/AdminNav.jsx` (the `Stock` group in `NAV_GROUPS`)
- Create: `src/app/admin/paperwork/page.js`
- Create: `src/app/admin/paperwork/PaperworkClient.jsx`
- Create: `src/app/admin/paperwork/DealForms.jsx`
- Create: `src/app/admin/paperwork/FinanceHouses.jsx`

**Interfaces:**
- Consumes: `listFinanceHouses`, `saveFinanceHouse`, `deleteFinanceHouse` (Task 7); `FINANCE_HOUSE_COLUMNS` (Task 7); `parseOtp`, `OtpError` (Task 4); `buildRlvValues`, `buildNcoValues` (Task 5); `fillForm` (Task 6); `extractPageText` (Task 2); layouts (Task 1).
- `unpdf` and `pdf-lib` are loaded with dynamic `import()` inside event handlers, so they stay out of the initial page bundle and never run on the server.

- [ ] **Step 1: Add the nav item.** In `src/components/admin/AdminNav.jsx`, change the `Stock` group to:

```js
    {
        label: "Stock",
        items: [
            { href: "/admin/inventory", label: "Inventory" },
            { href: "/admin/sales", label: "Sales" },
            { href: "/admin/paperwork", label: "Paperwork" },
        ],
    },
```

- [ ] **Step 2: Create** `src/app/admin/paperwork/page.js`

```js
import { listFinanceHouses } from "./actions";
import PaperworkClient from "./PaperworkClient";

export const metadata = { title: "Paperwork | Everest Motoring" };

export default async function PaperworkPage() {
    // Admin access is enforced by src/app/admin/layout.js. listFinanceHouses guards
    // itself too, so swallow the auth error that races the layout redirect.
    let result = { houses: [], missingTable: false };
    try {
        result = await listFinanceHouses();
    } catch {
        result = { houses: [], missingTable: false };
    }

    return (
        <div className="p-8 max-w-5xl mx-auto w-full">
            <div className="mb-8">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                    Deal <span className="italic">Paperwork</span>
                </h1>
                <p className="text-slate-500 mt-1 font-medium max-w-2xl">
                    Upload the OTP from the dealer system to fill in the RLV and NCO. The OTP stays on
                    this computer: nothing about the deal is saved or sent anywhere.
                </p>
            </div>
            <PaperworkClient initialHouses={result.houses} missingTable={result.missingTable} />
        </div>
    );
}
```

- [ ] **Step 3: Create** `src/app/admin/paperwork/PaperworkClient.jsx`

```jsx
"use client";

import { useState } from "react";
import DealForms from "./DealForms";
import FinanceHouses from "./FinanceHouses";

const TABS = [
    { id: "deal", label: "Deal forms" },
    { id: "banks", label: "Finance houses" },
];

export default function PaperworkClient({ initialHouses, missingTable }) {
    const [tab, setTab] = useState("deal");
    const [houses, setHouses] = useState(initialHouses);

    return (
        <div>
            <div role="tablist" className="flex gap-2 mb-6 border-b border-slate-200">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        role="tab"
                        id={`tab-${t.id}`}
                        aria-selected={tab === t.id}
                        aria-controls={`panel-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 -mb-px border-b-2 text-sm font-bold ${
                            tab === t.id ? "border-black text-black" : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            {/* Both panels stay mounted so a reviewed deal survives a visit to Finance houses. */}
            <div role="tabpanel" id="panel-deal" aria-labelledby="tab-deal" hidden={tab !== "deal"}>
                <DealForms houses={houses} missingTable={missingTable} />
            </div>
            <div role="tabpanel" id="panel-banks" aria-labelledby="tab-banks" hidden={tab !== "banks"}>
                <FinanceHouses houses={houses} onChange={setHouses} missingTable={missingTable} />
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Create** `src/app/admin/paperwork/DealForms.jsx`

```jsx
"use client";

import { useState } from "react";
import { parseOtp, OtpError } from "@/utils/paperwork/parseOtp";
import { buildRlvValues, buildNcoValues } from "@/utils/paperwork/buildForms";
import RLV from "@/utils/paperwork/layouts/rlv";
import NCO from "@/utils/paperwork/layouts/nco";

// Fewest boxes any form gives this value, so the length warning covers both forms.
const boxes = (...fields) => Math.min(...fields.map((f) => f.cells.length));

const ID_TYPES = [
    ["rsa_id", "RSA ID"],
    ["foreign_id", "Foreign ID"],
    ["traffic_register", "Traffic register no."],
    ["business_reg", "Business reg. no."],
];

const CUSTOMER_FIELDS = [
    { key: "surname", label: "Surname", orgLabel: "Organisation name", limit: boxes(RLV["A.surname"], NCO["B.surname"]) },
    { key: "firstNames", label: "First names (up to 3)", person: true, limit: boxes(RLV["A.firstNames"]) },
    { key: "initials", label: "Initials", person: true, limit: boxes(RLV["A.initials"], NCO["B.initials"]) },
    { key: "idType", label: "ID type", options: ID_TYPES },
    { key: "idNumber", label: "ID number", limit: boxes(RLV["A.idNumber"], NCO["B.idNumber"]) },
    { key: "gender", label: "Gender", person: true, options: [["male", "Male"], ["female", "Female"]] },
    { key: "dob", label: "Date of birth", person: true, type: "date" },
    { key: "email", label: "Email", limit: boxes(RLV["A.email"], NCO["B.email"]) },
    { key: "cell", label: "Cellphone", limit: boxes(RLV["A.cell"]) },
    { key: "street1", label: "Street address", limit: boxes(RLV["A.street1"], NCO["B.street1"]) },
    { key: "street2", label: "Street address, line 2", limit: boxes(RLV["A.street2"], NCO["B.street2"]) },
    { key: "street3", label: "Street address, line 3", limit: boxes(RLV["A.street3"], NCO["B.street3"]) },
    { key: "streetSuburb", label: "Street: suburb", limit: boxes(RLV["A.streetSuburb"], NCO["B.streetSuburb"]) },
    { key: "streetCity", label: "Street: city/town", limit: boxes(RLV["A.streetCity"], NCO["B.streetCity"]) },
    { key: "streetCode", label: "Street: postal code", limit: boxes(RLV["A.streetCode"], NCO["B.streetCode"]) },
    { key: "postal1", label: "Postal address", limit: boxes(RLV["A.postal1"], NCO["B.postal1"]) },
    { key: "postal2", label: "Postal address, line 2", limit: boxes(RLV["A.postal2"], NCO["B.postal2"]) },
    { key: "postal3", label: "Postal address, line 3", limit: boxes(RLV["A.postal3"], NCO["B.postal3"]) },
    { key: "postalSuburb", label: "Postal: suburb", limit: boxes(RLV["A.postalSuburb"], NCO["B.postalSuburb"]) },
    { key: "postalCity", label: "Postal: city/town", limit: boxes(RLV["A.postalCity"], NCO["B.postalCity"]) },
    { key: "postalCode", label: "Postal: postal code", limit: boxes(RLV["A.postalCode"], NCO["B.postalCode"]) },
    { key: "notices", label: "Send notices to", options: [["postal", "Postal address"], ["street", "Street address"]] },
];

const VEHICLE_FIELDS = [
    { key: "licenceNo", label: "Licence (registration) number", limit: boxes(RLV["C.licence"], NCO["C.licence"]) },
    { key: "registerNo", label: "Vehicle register number", limit: boxes(RLV["C.registerNo"], NCO["C.registerNo"]) },
    { key: "vin", label: "VIN / chassis number", limit: boxes(RLV["C.vin"], NCO["C.vin"]) },
    { key: "engineNo", label: "Engine number", limit: boxes(RLV["C.engine"]) },
    { key: "make", label: "Make", limit: boxes(RLV["C.make"], NCO["C.make"]) },
    { key: "series", label: "Series name", limit: boxes(RLV["C.series"]) },
    { key: "colour", label: "Main colour (white, red and blue are ticked; others written in)", limit: boxes(RLV["C.colourOther"]) },
    { key: "odometer", label: "Odometer (km)", limit: boxes(RLV["C.odometer"], NCO["C.odometer"]) },
    { key: "transmission", label: "Transmission", options: [["automatic", "Automatic"], ["manual", "Manual"]] },
    { key: "description", label: "Body", options: [["sedan", "Sedan"], ["hatch_back", "Hatch back"], ["pick_up", "Pick-up (bakkie)"]] },
];

const ALWAYS = [
    "RLV: application for registration by title holder (X)",
    "RLV: driven: self-propelled (X)",
    "RLV: reason for registration: ownership (X)",
    "NCO: reason for change: sold (X)",
    "NCO seller: DeCar Beleggings (Pty) Ltd, reg. 2011/007142/07, 013 854 0600",
];

const BY_HAND =
    "Vehicle category, fuel type, kW and cm³, tare and GVM, NaTIS model number, steering position, " +
    "what it's used for, economic sector, nature of ownership, public road, and every signature, place and declaration date.";

const ORIGIN = {
    otp: { tag: "From OTP", input: "border-slate-300" },
    derived: { tag: "Derived", input: "border-amber-400 bg-amber-50" },
    blank: { tag: "Not on OTP", input: "border-dashed border-slate-400" },
    edited: { tag: "Edited", input: "border-slate-500" },
};

function FieldInput({ id, label, field, limit, type = "text", options, onChange }) {
    const look = ORIGIN[field.origin];
    const tag = field.origin === "derived" ? `Derived ${field.note}` : look.tag;
    const over = limit && field.value.length > limit;
    const cls = `w-full px-3 py-2 border rounded-lg text-slate-900 ${look.input}`;
    return (
        <div>
            <label htmlFor={id} className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{tag}</span>
            </label>
            {options ? (
                <select id={id} value={field.value} onChange={(e) => onChange(e.target.value)} className={cls}>
                    <option value="">(leave blank)</option>
                    {options.map(([value, text]) => (
                        <option key={value} value={value}>{text}</option>
                    ))}
                </select>
            ) : (
                <input id={id} type={type} value={field.value} onChange={(e) => onChange(e.target.value)} className={cls} />
            )}
            {over && (
                <p className="text-xs text-red-700 mt-1">
                    {field.value.length} characters, but the form has {limit} boxes. It will print smaller; shorten it if you can.
                </p>
            )}
        </div>
    );
}

function FieldGroup({ title, children }) {
    return (
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{title}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        </section>
    );
}

export default function DealForms({ houses, missingTable }) {
    const [deal, setDeal] = useState(null);
    const [houseId, setHouseId] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function onFile(e) {
        const input = e.target;
        const file = input.files?.[0];
        if (!file) return;
        setError("");
        setDeal(null);
        setBusy(true);
        try {
            const { extractPageText } = await import("@/utils/paperwork/extractText");
            setDeal(parseOtp(await extractPageText(await file.arrayBuffer())));
        } catch (err) {
            setError(err instanceof OtpError ? err.message : "Couldn't read that PDF. Upload the original OTP from the dealer system.");
        } finally {
            setBusy(false);
            input.value = ""; // so choosing the same file again re-reads it
        }
    }

    function update(group, key, value) {
        setDeal((d) => {
            const edit = (field) => ({ ...field, value, origin: "edited" });
            return group ? { ...d, [group]: { ...d[group], [key]: edit(d[group][key]) } } : { ...d, [key]: edit(d[key]) };
        });
    }

    async function download(kind) {
        setError("");
        try {
            const { fillForm } = await import("@/utils/paperwork/fillForm");
            const house = houses.find((h) => h.id === houseId) ?? null;
            const [layout, values] = kind === "rlv" ? [RLV, buildRlvValues(deal, house)] : [NCO, buildNcoValues(deal, house)];
            const template = await (await fetch(`/forms/${kind}.pdf`)).arrayBuffer();
            const bytes = await fillForm(template, layout, values);
            const href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
            const link = Object.assign(document.createElement("a"), {
                href,
                download: `${kind.toUpperCase()}-deal-${deal.dealId.value || "otp"}.pdf`,
            });
            link.click();
            setTimeout(() => URL.revokeObjectURL(href), 1000);
        } catch {
            setError("Couldn't create the PDF. Your reviewed details are still here; try again.");
        }
    }

    const person = deal?.customer.kind === "person";

    return (
        <div className="space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-6 grid gap-6 sm:grid-cols-2">
                <div>
                    <label htmlFor="otp-file" className="block text-sm font-bold text-slate-700 mb-2">OTP from the dealer system (PDF)</label>
                    <input
                        id="otp-file"
                        type="file"
                        accept="application/pdf"
                        onChange={onFile}
                        disabled={busy}
                        className="text-sm w-full file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-semibold file:bg-primary/10 file:text-black hover:file:bg-primary/20 disabled:opacity-60"
                    />
                </div>
                <div>
                    <label htmlFor="finance" className="block text-sm font-bold text-slate-700 mb-2">How is it paid?</label>
                    <select
                        id="finance"
                        value={houseId}
                        onChange={(e) => setHouseId(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900"
                    >
                        <option value="">Cash: the customer is the title holder</option>
                        {houses.map((h) => (
                            <option key={h.id} value={h.id}>Financed by {h.name}</option>
                        ))}
                    </select>
                    {missingTable && (
                        <p className="text-xs text-slate-500 mt-1">Finance houses aren&apos;t set up yet, so only Cash is available.</p>
                    )}
                </div>
            </section>

            {busy && <p className="text-sm text-slate-500">Reading the OTP…</p>}
            {error && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}

            {deal && (
                <>
                    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900">Deal {deal.dealId.value || "(no deal ID)"}</h2>
                            <div className="flex flex-wrap gap-3">
                                <button type="button" onClick={() => download("rlv")} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                                    Download RLV (blue)
                                </button>
                                <button type="button" onClick={() => download("nco")} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                                    Download NCO (yellow)
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500">
                            Check the details below. Amber boxes were worked out from the OTP; dashed boxes weren&apos;t on it.
                            Anything left blank stays blank on the forms, ready for a pen.
                        </p>
                    </section>

                    <FieldGroup title="Customer">
                        {CUSTOMER_FIELDS.filter((f) => person || !f.person).map((f) => (
                            <FieldInput
                                key={f.key}
                                id={`customer-${f.key}`}
                                label={!person && f.orgLabel ? f.orgLabel : f.label}
                                field={deal.customer[f.key]}
                                limit={f.limit}
                                type={f.type}
                                options={f.options}
                                onChange={(value) => update("customer", f.key, value)}
                            />
                        ))}
                    </FieldGroup>

                    <FieldGroup title="Vehicle">
                        {VEHICLE_FIELDS.map((f) => (
                            <FieldInput
                                key={f.key}
                                id={`vehicle-${f.key}`}
                                label={f.label}
                                field={deal.vehicle[f.key]}
                                limit={f.limit}
                                options={f.options}
                                onChange={(value) => update("vehicle", f.key, value)}
                            />
                        ))}
                    </FieldGroup>

                    <FieldGroup title="Sale">
                        <FieldInput
                            id="sale-orderDate"
                            label="Date of sale (date of change / date liable)"
                            field={deal.orderDate}
                            type="date"
                            onChange={(value) => update(null, "orderDate", value)}
                        />
                    </FieldGroup>

                    <section className="bg-white border border-slate-200 rounded-2xl p-6 grid gap-6 sm:grid-cols-2 text-sm">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Always on the forms</h3>
                            <ul className="list-disc pl-5 space-y-1 text-slate-700">
                                {ALWAYS.map((line) => <li key={line}>{line}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2">Fill in by hand</h3>
                            <p className="text-slate-700">{BY_HAND}</p>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 5: Create** `src/app/admin/paperwork/FinanceHouses.jsx`

```jsx
"use client";

import { useState } from "react";
import { saveFinanceHouse, deleteFinanceHouse } from "./actions";
import { FINANCE_HOUSE_COLUMNS } from "@/utils/paperwork/financeHouseFields";

const BLANK = Object.fromEntries(FINANCE_HOUSE_COLUMNS.map((column) => [column, ""]));

// [column, label, options?] per field, grouped like the forms' Part A.
const SECTIONS = [
    {
        title: "Organisation",
        fields: [
            ["name", "Name, as it must appear on the forms"],
            ["id_type", "ID type", [["business_reg", "Business reg. no."], ["traffic_register", "Traffic register no."]]],
            ["id_number", "ID number"],
            ["nature", "Nature of organisation", [["private_company", "Private company"], ["close_corporation", "Close corporation"], ["other", "Other (specify below)"]]],
            ["nature_other", "Other: specify"],
        ],
    },
    {
        title: "Contact",
        fields: [
            ["email", "Email"],
            ["phone_code", "Day phone: area code"],
            ["phone_number", "Day phone: number"],
            ["fax_code", "Fax: area code"],
            ["fax_number", "Fax: number"],
        ],
    },
    {
        title: "Postal address",
        fields: [
            ["postal_line1", "Line 1"], ["postal_line2", "Line 2"], ["postal_line3", "Line 3"],
            ["postal_suburb", "Suburb"], ["postal_city", "City/town"], ["postal_code", "Postal code"],
        ],
    },
    {
        title: "Street address",
        fields: [
            ["street_line1", "Line 1"], ["street_line2", "Line 2"], ["street_line3", "Line 3"],
            ["street_suburb", "Suburb"], ["street_city", "City/town"], ["street_code", "Postal code"],
        ],
    },
    {
        title: "Notices and proxy",
        fields: [
            ["notices_to", "Send notices to", [["postal", "Postal address"], ["street", "Street address"]]],
            ["proxy_id_type", "Proxy ID type", [["rsa_id", "RSA ID"], ["foreign_id", "Foreign ID"], ["traffic_register", "Traffic register no."]]],
            ["proxy_id_number", "Proxy ID number"],
            ["proxy_surname", "Proxy surname"],
            ["proxy_initials", "Proxy initials"],
        ],
    },
];

const INPUT = "w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900";

export default function FinanceHouses({ houses, onChange, missingTable }) {
    const [form, setForm] = useState(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    if (missingTable) {
        return (
            <p className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-700">
                Finance houses need a one-off database setup. Run{" "}
                <code className="font-mono text-sm">supabase/migrations/20261010_finance_houses.sql</code> in the Supabase
                SQL editor, then reload this page.
            </p>
        );
    }

    function open(house) {
        setError("");
        setForm(house ? { ...BLANK, ...Object.fromEntries(Object.entries(house).map(([k, v]) => [k, v ?? ""])) } : { ...BLANK });
    }

    async function save(e) {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const result = await saveFinanceHouse(form);
            if (result.error) {
                setError(result.error);
                return;
            }
            const others = houses.filter((h) => h.id !== result.house.id);
            onChange([...others, result.house].sort((a, b) => a.name.localeCompare(b.name)));
            setForm(null);
        } catch {
            setError("Couldn't save. Try again.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(house) {
        if (!window.confirm(`Delete ${house.name}? Forms already downloaded aren't affected.`)) return;
        setError("");
        try {
            await deleteFinanceHouse(house.id);
            onChange(houses.filter((h) => h.id !== house.id));
        } catch {
            setError("Couldn't delete. Try again.");
        }
    }

    return (
        <div className="space-y-6">
            {error && (
                <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
            )}

            {form ? (
                <form onSubmit={save} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-8">
                    <h2 className="text-xl font-bold text-slate-900">{form.id ? `Edit ${form.name}` : "Add a finance house"}</h2>
                    {SECTIONS.map((section) => (
                        <fieldset key={section.title}>
                            <legend className="text-sm font-black uppercase tracking-wide text-slate-500 mb-3">{section.title}</legend>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {section.fields.map(([key, label, options]) => (
                                    <div key={key}>
                                        <label htmlFor={`fh-${key}`} className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
                                        {options ? (
                                            <select id={`fh-${key}`} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={INPUT}>
                                                <option value="">(not set)</option>
                                                {options.map(([value, text]) => (
                                                    <option key={value} value={value}>{text}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                id={`fh-${key}`}
                                                value={form[key]}
                                                required={key === "name"}
                                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                                className={INPUT}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </fieldset>
                    ))}
                    <div className="flex gap-3">
                        <button type="submit" disabled={saving} className="px-6 py-3 bg-primary hover:bg-primary-dark disabled:bg-slate-400 text-black font-bold rounded-lg">
                            {saving ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={() => setForm(null)} className="px-6 py-3 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="text-sm text-slate-500 max-w-xl">
                            Banks that can be the title holder on a financed sale. Their details fill RLV Part A and NCO Part B.
                        </p>
                        <button type="button" onClick={() => open(null)} className="px-6 py-3 bg-primary hover:bg-primary-dark text-black font-bold rounded-lg">
                            Add a finance house
                        </button>
                    </div>
                    {houses.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No finance houses yet.</p>
                    ) : (
                        <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-200">
                            {houses.map((h) => (
                                <li key={h.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <p className="font-bold text-slate-900">{h.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {h.id_number || "No ID number yet"}
                                            {h.proxy_surname ? ` · proxy ${h.proxy_surname}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => open(h)} className="px-4 py-2 border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-50">
                                            Edit
                                        </button>
                                        <button type="button" onClick={() => remove(h)} className="px-4 py-2 border border-red-200 rounded-lg font-bold text-red-700 hover:bg-red-50">
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 6: Run the whole suite**

Run: `cd /c/tmp/everest-split && pwd && npm test`
Expected: all test files pass (the existing affiliate tests plus the new paperwork tests; `realOtp.test.js` shows as skipped).

- [ ] **Step 7: Start a dev server and drive the page.** No other `next dev` may be running for this repo; check with `netstat -ano | grep LISTENING | grep -E ":300[0-9]"`.

```bash
cd /c/tmp/everest-split && pwd && npx next dev -p 3005
```
(Run it in the background.) Then, with the Playwright browser:
1. Open `http://localhost:3005/admin/paperwork`. You'll be redirected to `/login`. **Ask the user to sign in as an Everest admin in that browser window.** Never type credentials yourself.
2. On the "Deal forms" tab, set the file input to the real sample OTP (local file; it never leaves the machine): the OTP PDF in `C:\Users\info\OneDrive\Documents\Ember Automations\Clients\Everest Motoring\Forms\`. Playwright's fill/click can no-op before hydration, so wait for the tab buttons to respond first.
3. Expect the OTP's deal number. Customer: surname, first names, ID number, street, city and code as on the OTP; gender and DOB filled (amber); suburb dashed and blank. Vehicle: VIN and colour as on the OTP, series showing the over-length warning, transmission and body type filled (amber).
4. Upload `public/forms/rlv.pdf` instead. Expect the "isn't an OTP from the dealer system" alert.
5. Re-upload the OTP, click both download buttons, and save the files to `C:/tmp/everest-otp-check/browser-*.pdf`.
6. Check the browser network log (`browser_network_requests`). During steps 2–5 the only requests are Next.js assets/chunks and `GET /forms/rlv.pdf` / `GET /forms/nco.pdf`; no POST and no request carrying customer data.
7. Check the browser console for errors. **If `unpdf` fails to load in the browser** (for example a pdf.js import/worker error), stop and report the exact console error. Don't work around it blindly.

- [ ] **Step 8: Commit**

```bash
cd /c/tmp/everest-split && git branch --show-current
git add src/components/admin/AdminNav.jsx src/app/admin/paperwork/page.js src/app/admin/paperwork/PaperworkClient.jsx src/app/admin/paperwork/DealForms.jsx src/app/admin/paperwork/FinanceHouses.jsx
git commit -m "feat(everest): Paperwork admin page: OTP upload, review and RLV/NCO download

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Independent verification against the spec, then PR

Run this as a **separate pass**: a fresh reviewer who checks the spec's success criteria, not the builder grading its own work. Stop the Task 8 dev server first (find its PID with `netstat -ano | grep ":3005"`, then `taskkill //PID <pid> //F`).

- [ ] **Step 1: Build check** (no dev server running)

```bash
cd /c/tmp/everest-split && pwd && npm test && npm run build
```
Expected: tests pass; `next build` completes and lists `/admin/paperwork`. (`npm run lint` is known to crash in this repo for pre-existing reasons; don't treat that as a failure of this work.)

- [ ] **Step 2: Criteria 1–3, the real OTP rendered and inspected.** Re-run the Task 6 Step 6 command. Then render every page of the 4 output PDFs plus the 2 browser downloads to PNG:

```bash
cd /c/tmp/everest-otp-check && python -c "
import fitz, glob
for f in glob.glob('*.pdf'):
    for i, p in enumerate(fitz.open(f)):
        p.get_pixmap(dpi=110).save(f'{f[:-4]}-p{i+1}.png')
"
```
Open the PNGs and check against the spec:
- Every printed character sits inside its box, and every filled value matches the OTP or the spec's derivation rules.
- Every box the spec marks Blank is empty: suburb, postal address, notices, register no., category, fuel, kW/cc, tare/GVM, steering, signatures and dates.
- Cash: customer in RLV Part A, RLV Part B empty, customer in NCO Part B.
- Financed: Test Bank in RLV Part A with its proxy, customer in RLV Part B, Test Bank in NCO Part B with no customer details anywhere on the NCO.
- NCO Part A is DeCar Beleggings (Pty) Ltd, 201100714207, 013 / 8540600.

- [ ] **Step 3: Criterion 4, finance houses in a real browser.** **Ask the user to run `supabase/migrations/20261010_finance_houses.sql` in the Supabase SQL editor first** (Claude has no database access). Then on a dev server:
  - Add a finance house named "Verification Test Bank" with a proxy.
  - Edit its phone number.
  - Confirm it appears in the Deal forms "How is it paid?" dropdown.
  - Download an RLV with it selected and check Part A shows the bank.
  - Delete it.

  Then, in a fresh browser context with no session, open `/admin/paperwork` and confirm it redirects to `/login`. (The actions' refusal of signed-out and non-admin users is covered by `actions.test.js`.)

- [ ] **Step 4: Criterion 5, privacy.** Confirm the Task 8 Step 7 network check was done on the final code. Then confirm `git ls-files | grep -iE "otp|deal\.json"` lists only source/test files, and that no committed file, docs included, contains a real customer value. The patterns file sits outside the repo, one value per line, so the check never names the customer itself:

```bash
cd /c/tmp/everest-split && git grep -n -i -F -f /c/tmp/everest-otp-check/pii-patterns.txt -- . ; echo "exit=$? (1 = nothing found)"
```

- [ ] **Step 5: Push and open the PR** (only after Steps 1–4 pass)

```bash
cd /c/tmp/everest-split && git branch --show-current && gh auth status 2>&1 | grep -i "active account" ; git push -u origin feat/otp-natis-forms
```
Write the PR body to a file outside the repo, then create the PR with `gh api` (`gh pr create` hangs in this environment):

```bash
gh api repos/alecsomers1980/everest-motoring/pulls -f title="Paperwork: fill RLV and NCO from the dealer-system OTP" -f head=feat/otp-natis-forms -f base=main -F body=@/c/tmp/everest-otp-check/pr-body.md < /dev/null --jq .html_url
```
The PR body must say:
1. What staff do: upload the OTP, review, download the RLV and NCO.
2. That nothing about a deal is stored.
3. **Before merge:** run `supabase/migrations/20261010_finance_houses.sql` in the Supabase SQL editor.
4. Everest still has to supply its NaTIS proxy details and email (NCO Part A).
5. Out of scope: trade-in NCO, other dealer systems, saved deals.

End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Don't merge: merging auto-deploys, and the user reviews first.
