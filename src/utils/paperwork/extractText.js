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
