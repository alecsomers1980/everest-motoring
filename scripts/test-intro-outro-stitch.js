// One-off test: stitch intro + existing rendered car video + outro for the
// 2017 VW Caravelle (id ba02dcc2…). If this produces a clean output, we
// know FAL can merge the brand clips with Veo3 output without re-encode pain.
//
// Run: node test-intro-outro-stitch.js

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const CAR_ID_PREFIX = 'ba02dcc2';
const INTRO_LOCAL = path.join(__dirname, 'public', 'images', 'intro.mp4');
const OUTRO_LOCAL = path.join(__dirname, 'public', 'images', 'outro.mp4');
const BUCKET = 'sale-videos';
const INTRO_KEY = 'branding/intro.mp4';
const OUTRO_KEY = 'branding/outro.mp4';

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Find the car
    const { data: cars } = await supabase.from('cars').select('id, year, make, model, video_url');
    const car = cars.find(c => String(c.id).startsWith(CAR_ID_PREFIX));
    if (!car) throw new Error(`No car with id starting ${CAR_ID_PREFIX}`);
    console.log(`[1/5] Car: ${car.year} ${car.make} ${car.model}`);
    console.log(`      video_url: ${car.video_url}`);

    if (!car.video_url || !car.video_url.startsWith('cf:')) {
        throw new Error(`Car video_url not in cf:<uid> form, got: ${car.video_url}`);
    }
    const cfUid = car.video_url.split(':')[1];

    // 2. Make sure Cloudflare Stream downloads are enabled, get MP4 URL
    console.log(`[2/5] Enabling MP4 downloads for CF Stream uid ${cfUid}...`);
    const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${cfUid}/downloads`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}`
            }
        }
    );
    const cfData = await cfRes.json();
    if (!cfData.success) {
        console.warn(`      CF download enable warning:`, JSON.stringify(cfData.errors));
    } else {
        console.log(`      Download state: ${cfData.result?.default?.status} (${cfData.result?.default?.percentComplete}%)`);
    }
    const carVideoUrl = `https://${process.env.CLOUDFLARE_STREAM_SUBDOMAIN}/${cfUid}/downloads/default.mp4`;
    console.log(`      MP4 URL: ${carVideoUrl}`);

    // Wait for the MP4 download to be ready (CF needs to transcode the MP4
    // download separately from the streaming variants). Poll until ready.
    for (let i = 0; i < 30; i++) {
        const statusRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${cfUid}/downloads`,
            { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_STREAM_API_TOKEN}` } }
        );
        const statusData = await statusRes.json();
        const state = statusData.result?.default?.status;
        const pct = statusData.result?.default?.percentComplete;
        console.log(`      [poll ${i + 1}] state=${state} pct=${pct}`);
        if (state === 'ready') break;
        if (state === 'error' || state === 'inprogress' && i === 29) throw new Error(`CF download not ready: ${state}`);
        await new Promise(r => setTimeout(r, 5000));
    }

    // 3. Upload intro.mp4 and outro.mp4 to Supabase public bucket
    console.log(`[3/5] Uploading intro & outro to Supabase bucket "${BUCKET}"...`);
    for (const [local, key] of [[INTRO_LOCAL, INTRO_KEY], [OUTRO_LOCAL, OUTRO_KEY]]) {
        if (!fs.existsSync(local)) throw new Error(`Missing local file: ${local}`);
        const buf = fs.readFileSync(local);
        const { error } = await supabase.storage.from(BUCKET).upload(key, buf, {
            contentType: 'video/mp4',
            upsert: true
        });
        if (error) throw new Error(`Upload failed for ${key}: ${error.message}`);
        console.log(`      uploaded ${key} (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
    }
    const introUrl = supabase.storage.from(BUCKET).getPublicUrl(INTRO_KEY).data.publicUrl;
    const outroUrl = supabase.storage.from(BUCKET).getPublicUrl(OUTRO_KEY).data.publicUrl;
    console.log(`      intro URL: ${introUrl}`);
    console.log(`      outro URL: ${outroUrl}`);

    // 4. Submit to FAL FFmpeg merge
    console.log(`[4/5] Submitting 3-clip merge to FAL...`);
    const clipUrls = [introUrl, carVideoUrl, outroUrl];
    const falRes = await fetch('https://fal.run/fal-ai/ffmpeg-api/merge-videos', {
        method: 'POST',
        headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ video_urls: clipUrls })
    });
    if (!falRes.ok) {
        const txt = await falRes.text();
        throw new Error(`FAL returned ${falRes.status}: ${txt}`);
    }
    const falData = await falRes.json();
    const stitchedUrl = falData?.video?.url;
    if (!stitchedUrl) throw new Error(`FAL response had no video.url: ${JSON.stringify(falData)}`);

    // 5. Done
    console.log(`[5/5] STITCH SUCCEEDED`);
    console.log(`\n      Output: ${stitchedUrl}\n`);
    console.log(`      Open that URL in a browser to preview.`);
}

main().catch(err => {
    console.error('TEST FAILED:', err.message);
    process.exit(1);
});
