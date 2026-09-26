/**
 * Read the current video_url state for a car (or all cars stuck in an
 * `ai_*` processing state) so we can diagnose why a regeneration failed
 * without opening Supabase.
 *
 * Usage:
 *   node scripts/inspect-stuck-car.mjs                 # list all stuck cars
 *   node scripts/inspect-stuck-car.mjs "Suzuki Fronx"  # filter by model
 *   node scripts/inspect-stuck-car.mjs --reset <car_id>  # unstick a car (set video_url=null)
 *   node scripts/inspect-stuck-car.mjs --queue <car_id>  # queue a car for AI video render
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
    try {
        const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
        for (const line of raw.split(/\r?\n/)) {
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
            if (!m) continue;
            const key = m[1];
            let val = m[2].trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (!process.env[key]) process.env[key] = val;
        }
    } catch (e) {
        console.warn('Could not read .env.local — relying on shell env. Reason:', e.message);
    }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run from the everest-motoring root with .env.local present.');
    process.exit(1);
}

const supabase = createClient(url, key);

const args = process.argv.slice(2);

if (args[0] === '--reset' && args[1]) {
    const carId = args[1];
    const { data, error } = await supabase
        .from('cars')
        .update({ video_url: null })
        .eq('id', carId)
        .select('id, make, model, video_url');
    if (error) {
        console.error('Reset failed:', error.message);
        process.exit(1);
    }
    if (!data || data.length === 0) {
        console.error('No car found with id:', carId);
        process.exit(1);
    }
    console.log(`Reset car ${data[0].make} ${data[0].model} (${carId}) — video_url is now null.`);
    process.exit(0);
}

if (args[0] === '--queue' && args[1]) {
    const carId = args[1];
    const { data, error } = await supabase
        .from('cars')
        .update({ video_url: 'ai_pending' })
        .eq('id', carId)
        .select('id, make, model, video_url');
    if (error) {
        console.error('Queue failed:', error.message);
        process.exit(1);
    }
    if (!data || data.length === 0) {
        console.error('No car found with id:', carId);
        process.exit(1);
    }
    console.log(`Queued car ${data[0].make} ${data[0].model} (${carId}) for AI video render — state=ai_pending.`);
    console.log('Open the admin inventory page in a browser and KEEP THE TAB OPEN.');
    console.log('VideoRenderManager polls every 15s and will pick this up automatically.');
    process.exit(0);
}

const modelFilter = args[0] || null;

let query = supabase
    .from('cars')
    .select('id, make, model, year, video_url, created_at')
    .order('created_at', { ascending: false });

if (modelFilter) {
    query = query.ilike('model', `%${modelFilter}%`);
}

const { data, error } = await query;
if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
}

// Group by video_url state for a quick overview.
const buckets = { stuck: [], errored: [], live: [], idle: [] };
for (const car of data) {
    const v = car.video_url || '';
    if (v.startsWith('ai_') || v === 'cf_ingesting' || v === 'mux_ingesting') buckets.stuck.push(car);
    else if (v.startsWith('error:')) buckets.errored.push(car);
    else if (v.startsWith('cf:') || v.startsWith('mux:')) buckets.live.push(car);
    else buckets.idle.push(car);
}

console.log('');
console.log('=== STUCK (mid-pipeline, will not advance without a queue manager) ===');
for (const c of buckets.stuck) {
    console.log(`  ${c.id}  ${c.year} ${c.make} ${c.model}  state=${c.video_url}  created=${c.created_at}`);
}
if (buckets.stuck.length === 0) console.log('  (none)');

console.log('');
console.log('=== ERRORED (DB shows an error message — pipeline caught the failure) ===');
for (const c of buckets.errored) {
    console.log(`  ${c.id}  ${c.year} ${c.make} ${c.model}`);
    console.log(`     → ${c.video_url}`);
}
if (buckets.errored.length === 0) console.log('  (none)');

if (modelFilter) {
    console.log('');
    console.log('=== LIVE (filtered subset) ===');
    for (const c of buckets.live) {
        console.log(`  ${c.id}  ${c.year} ${c.make} ${c.model}  state=${c.video_url}`);
    }
    console.log('');
    console.log('=== IDLE / no video (filtered subset) ===');
    for (const c of buckets.idle) {
        console.log(`  ${c.id}  ${c.year} ${c.make} ${c.model}  state=${c.video_url || '(null)'}`);
    }
}

console.log('');
console.log(`Totals — stuck:${buckets.stuck.length}  errored:${buckets.errored.length}  live:${buckets.live.length}  idle:${buckets.idle.length}`);
console.log('');
console.log('To unstick a car:  node scripts/inspect-stuck-car.mjs --reset <car_id>');
