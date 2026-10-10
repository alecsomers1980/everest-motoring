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
