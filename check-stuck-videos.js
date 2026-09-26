// One-shot diagnostic: list any cars whose video is stuck in a processing state.
// Run: node check-stuck-videos.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

const PROCESSING_STATES = [
    'ai_pending',
    'ai_processing',
    'ai_rendering_clips',
    'ai_stitching_video',
    'cf_ingesting',
    'mux_ingesting',
];

(async () => {
    const { data, error } = await supabase
        .from('cars')
        .select('id, year, make, model, video_url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Query failed:', error);
        process.exit(1);
    }

    const now = Date.now();
    const rows = data.map(car => {
        const state = car.video_url || '(none)';
        const isProcessing = PROCESSING_STATES.includes(state) || state.startsWith('error:');
        const ageMin = car.created_at ? Math.round((now - new Date(car.created_at).getTime()) / 60000) : null;
        return { id: car.id, label: `${car.year} ${car.make} ${car.model}`, state, ageMin, isProcessing };
    });

    const processing = rows.filter(r => r.isProcessing);
    const ready = rows.filter(r => /^(cf:|mux:)/.test(r.state));
    const none = rows.filter(r => r.state === '(none)' || r.state === null);

    console.log('\n=== Cars by video state ===\n');
    console.log(`Total cars: ${rows.length}`);
    console.log(`  Live (cf: or mux:): ${ready.length}`);
    console.log(`  Processing or errored: ${processing.length}`);
    console.log(`  No video queued: ${none.length}\n`);

    if (processing.length === 0) {
        console.log('No videos appear stuck. All cars are either live or have no video queued.');
    } else {
        console.log('=== Processing / errored ===\n');
        processing.forEach(r => {
            const ageStr = r.ageMin != null ? `(${r.ageMin}m old)` : '';
            const stuckFlag = r.ageMin != null && r.ageMin > 10 && !r.state.startsWith('error:') ? '  ⚠️  STUCK' : '';
            console.log(`  ${r.label} [${r.state}] ${ageStr}${stuckFlag}`);
            console.log(`    id: ${r.id}`);
        });
    }

    console.log('\n=== Live ===\n');
    ready.forEach(r => console.log(`  ${r.label}  →  ${r.state}`));
})();
