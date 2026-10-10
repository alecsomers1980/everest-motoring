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
