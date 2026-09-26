// Month bucketing for the admin dashboard trend tiles.
//
// Extracted from the dashboard page so the date maths — which wraps across year
// boundaries — can be tested independently of Supabase and React.

/**
 * The last `count` calendar months ending with the month containing `now`,
 * oldest first.
 * @returns {{year: number, month: number}[]}
 */
export function monthWindow(now = new Date(), count = 6) {
    return Array.from({ length: count }, (_, i) => {
        // Date handles negative month indexes by rolling the year back.
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });
}

export function inMonth(iso, { year, month }) {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d)) return false;
    return d.getMonth() === month && d.getFullYear() === year;
}

/** Count rows matching `predicate` in each month of `window`. */
export function countByMonth(rows, window, predicate = () => true) {
    return window.map(
        (k) => (rows || []).filter((r) => predicate(r) && inMonth(r.created_at, k)).length
    );
}

/** Previous month's long name, for the "vs June" delta label. */
export function previousMonthName(now = new Date(), locale = "en-ZA") {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toLocaleDateString(locale, { month: "long" });
}
