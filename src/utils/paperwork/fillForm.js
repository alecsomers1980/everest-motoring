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
