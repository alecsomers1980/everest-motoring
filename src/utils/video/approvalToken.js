import crypto from "crypto";

// Approval links are signed rather than stored: the walkaround approval email
// goes to one person and carries no state a DB row would need to hold.
function signingSecret() {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        throw new Error("CRON_SECRET is required to sign video approval links.");
    }
    return secret;
}

export function signApproval(carId, action) {
    return crypto
        .createHmac("sha256", signingSecret())
        .update(`${carId}:${action}`)
        .digest("hex");
}

export function verifyApproval(carId, action, signature) {
    const expected = Buffer.from(signApproval(carId, action), "utf8");
    const supplied = Buffer.from(String(signature || ""), "utf8");
    // timingSafeEqual throws on a length mismatch, so check that first.
    return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}
