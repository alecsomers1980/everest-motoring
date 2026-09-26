// Deletes the old (pre-branding) Cloudflare Stream entries listed in
// backfill-manifest.json. Each car's video_url has already been pointed at
// the new (branded) entry, so removing the old uid frees CF storage with no
// user-facing impact. Idempotent: a 404 means already deleted, treat as success.
//
// Run: node cleanup-old-cf-streams.js

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const MANIFEST = path.join(__dirname, 'backfill-manifest.json');
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

async function deleteStream(uid) {
    const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${uid}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${CF_TOKEN}` } }
    );
    if (res.status === 404) return { ok: true, status: 'already-gone' };
    if (res.status === 200 || res.status === 204) return { ok: true, status: 'deleted' };
    const text = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
}

async function main() {
    if (!CF_ACCOUNT || !CF_TOKEN) throw new Error('Missing Cloudflare env vars');
    if (!fs.existsSync(MANIFEST)) throw new Error(`Missing ${MANIFEST}`);

    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    const targets = manifest.filter(m => m.status === 'success' && m.oldUid && !m.cleanedUp);
    console.log(`Cleaning up ${targets.length} old CF Stream entries...\n`);

    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        const result = await deleteStream(t.oldUid);
        if (result.ok) {
            t.cleanedUp = true;
            t.cleanedUpAt = new Date().toISOString();
            ok++;
            console.log(`[${i + 1}/${targets.length}] ${t.label} — ${result.status}: ${t.oldUid}`);
        } else {
            fail++;
            console.error(`[${i + 1}/${targets.length}] ${t.label} — FAILED: ${result.error}`);
        }
    }

    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`\nCleanup complete. Deleted: ${ok}, Failed: ${fail}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
