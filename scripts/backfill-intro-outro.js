// Back-fill: re-stitch every existing car video with brand intro/outro,
// ingest the new merged video into Cloudflare Stream, and update each car's
// video_url to point at the new CF Stream entry.
//
// Old CF Stream entries are NOT deleted — keep them as a rollback safety net.
// You can clean them up manually from the Cloudflare dashboard once happy.
//
// A manifest of every (carId, oldUid, newUid) is written to
// backfill-manifest.json so you can audit / roll back.
//
// Run: node backfill-intro-outro.js

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const INTRO_URL = process.env.EVEREST_INTRO_VIDEO_URL;
const OUTRO_URL = process.env.EVEREST_OUTRO_VIDEO_URL;
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;
const CF_SUBDOMAIN = process.env.CLOUDFLARE_STREAM_SUBDOMAIN;
const FAL_KEY = process.env.FAL_KEY;
const MANIFEST = path.join(__dirname, 'backfill-manifest.json');

function cfHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CF_TOKEN}`
    };
}

async function enableAndWaitForMp4(uid) {
    // Kick off MP4 transcode (idempotent)
    await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${uid}/downloads`, {
        method: 'POST',
        headers: cfHeaders()
    });
    // Poll for ready
    for (let i = 0; i < 60; i++) {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${uid}/downloads`, { headers: cfHeaders() });
        const data = await res.json();
        const state = data.result?.default?.status;
        if (state === 'ready') return `https://${CF_SUBDOMAIN}/${uid}/downloads/default.mp4`;
        if (state === 'error') throw new Error(`CF Stream MP4 transcode errored for ${uid}`);
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`CF Stream MP4 transcode timeout for ${uid}`);
}

async function stitchThree(introUrl, middleUrl, outroUrl) {
    const res = await fetch('https://fal.run/fal-ai/ffmpeg-api/merge-videos', {
        method: 'POST',
        headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_urls: [introUrl, middleUrl, outroUrl] })
    });
    if (!res.ok) throw new Error(`FAL ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data?.video?.url) throw new Error(`FAL bad response: ${JSON.stringify(data)}`);
    return data.video.url;
}

async function ingestToCloudflare(videoUrl, meta) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/copy`, {
        method: 'POST',
        headers: cfHeaders(),
        body: JSON.stringify({ url: videoUrl, meta })
    });
    const data = await res.json();
    if (!data.success) throw new Error(`CF copy failed: ${data.errors?.[0]?.message}`);
    return data.result.uid;
}

async function waitForCfReady(uid) {
    for (let i = 0; i < 60; i++) {
        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream/${uid}`, { headers: cfHeaders() });
        const data = await res.json();
        if (data.result?.readyToStream) return;
        if (data.result?.status?.state === 'error') throw new Error(`CF ingest errored: ${JSON.stringify(data.result.status)}`);
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error(`CF ingest timeout for ${uid}`);
}

function loadManifest() {
    if (fs.existsSync(MANIFEST)) return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    return [];
}
function saveManifest(entries) {
    fs.writeFileSync(MANIFEST, JSON.stringify(entries, null, 2));
}

async function main() {
    if (!INTRO_URL || !OUTRO_URL) throw new Error('Missing EVEREST_INTRO_VIDEO_URL or EVEREST_OUTRO_VIDEO_URL');
    if (!CF_ACCOUNT || !CF_TOKEN || !CF_SUBDOMAIN) throw new Error('Missing Cloudflare env vars');
    if (!FAL_KEY) throw new Error('Missing FAL_KEY');

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: allCars, error } = await supabase.from('cars').select('id, year, make, model, video_url');
    if (error) throw error;
    const cars = allCars.filter(c => c.video_url && c.video_url.startsWith('cf:'));
    console.log(`Found ${cars.length} car(s) eligible for back-fill.\n`);

    const manifest = loadManifest();
    const alreadyDone = new Set(manifest.filter(m => m.status === 'success').map(m => m.carId));

    for (let i = 0; i < cars.length; i++) {
        const car = cars[i];
        const label = `[${i + 1}/${cars.length}] ${car.year} ${car.make} ${car.model}`;
        if (alreadyDone.has(car.id)) {
            console.log(`${label} — already migrated, skipping.`);
            continue;
        }
        const oldUid = car.video_url.split(':')[1];
        const entry = { carId: car.id, label: `${car.year} ${car.make} ${car.model}`, oldUid, newUid: null, status: 'in_progress', error: null, ts: new Date().toISOString() };
        manifest.push(entry);
        saveManifest(manifest);

        try {
            console.log(`${label}`);
            console.log(`   old uid: ${oldUid}`);

            console.log(`   1/4 enabling/waiting for MP4 download...`);
            const mp4Url = await enableAndWaitForMp4(oldUid);

            console.log(`   2/4 stitching intro + car + outro via FAL...`);
            const stitchedUrl = await stitchThree(INTRO_URL, mp4Url, OUTRO_URL);

            console.log(`   3/4 ingesting stitched video to Cloudflare Stream...`);
            const newUid = await ingestToCloudflare(stitchedUrl, {
                car_id: car.id,
                name: `${car.year} ${car.make} ${car.model} (with branding)`
            });
            await waitForCfReady(newUid);

            console.log(`   4/4 updating car.video_url -> cf:${newUid}`);
            const { error: updateErr } = await supabase.from('cars').update({ video_url: `cf:${newUid}` }).eq('id', car.id);
            if (updateErr) throw updateErr;

            entry.newUid = newUid;
            entry.status = 'success';
            saveManifest(manifest);
            console.log(`   ✓ done\n`);
        } catch (err) {
            entry.status = 'failed';
            entry.error = err.message;
            saveManifest(manifest);
            console.error(`   ✗ FAILED: ${err.message}\n`);
        }
    }

    const ok = manifest.filter(m => m.status === 'success').length;
    const fail = manifest.filter(m => m.status === 'failed').length;
    console.log(`\nBack-fill complete. Success: ${ok}, Failed: ${fail}`);
    console.log(`Manifest written to: ${MANIFEST}`);
    if (fail > 0) console.log(`Re-run the script to retry failed entries (successes are skipped automatically).`);
}

main().catch(err => {
    console.error('FATAL:', err);
    process.exit(1);
});
