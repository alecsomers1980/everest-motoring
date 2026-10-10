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
