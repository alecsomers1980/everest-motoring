import crypto from "crypto";

// AES-256-GCM, app-layer encryption — the key lives only in env vars,
// never in the database, so a leaked service-role key/DB dump alone
// can't decrypt stored account numbers.
const ALGORITHM = "aes-256-gcm";
const ENCRYPTED_FORMAT = /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

function getKey() {
    const keyHex = process.env.BANK_DETAILS_ENCRYPTION_KEY;
    if (!keyHex) throw new Error("BANK_DETAILS_ENCRYPTION_KEY is not set");
    return Buffer.from(keyHex, "hex");
}

export function encryptBankField(plaintext) {
    if (!plaintext) return plaintext;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext.toString("base64")}`;
}

// Existing rows predate encryption and are stored as plain text — pass
// those through unchanged instead of failing the read.
export function decryptBankField(stored) {
    if (!stored) return stored;
    if (!ENCRYPTED_FORMAT.test(stored)) return stored;

    try {
        const [ivB64, authTagB64, ciphertextB64] = stored.split(":");
        const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
        decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
        const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, "base64")), decipher.final()]);
        return plaintext.toString("utf8");
    } catch (err) {
        console.error("decryptBankField failed:", err);
        return null;
    }
}
