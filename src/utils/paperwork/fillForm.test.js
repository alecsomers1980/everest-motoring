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
    it("prints each character, uppercased, from the first box to the fifth", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.surname": "Botha" });
        const field = RLV["A.surname"];
        const items = await inField(out, field);
        // pdf.js merges neighbouring characters into one run with a space ("B O"),
        // so compare without spaces and check where the first and last characters sit.
        expect(items.map((i) => i.str).join("").replace(/\s/g, "")).toBe("BOTHA");
        const first = items[0];
        const last = items[items.length - 1];
        expect(first.x).toBeGreaterThan(field.cells[0][0]);
        expect(first.x).toBeLessThan(field.cells[0][1]);
        expect(last.x + last.width).toBeGreaterThan(field.cells[4][0]);
        expect(last.x + last.width).toBeLessThan(field.cells[4][1]);
    });

    it("prints date digits into the date slots", async () => {
        const out = await fillForm(rlvTemplate, RLV, { "A.dob": "19800101" });
        // The form itself prints a ":" in every date box.
        const text = (await inField(out, RLV["A.dob"])).map((i) => i.str).join("");
        expect(text.replace(/[\s:]/g, "")).toBe("19800101");
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
