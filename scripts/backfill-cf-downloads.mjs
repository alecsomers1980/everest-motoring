// One-shot backfill: walk every car whose video_url is `cf:<uid>`, and make
// sure CF Stream has the MP4 download enabled (Facebook/Instagram need it).
//
// Idempotent: per-UID, it first checks GET /downloads and skips if `default`
// is already `ready`. Only videos missing the MP4 get the enable+poll call.
//
// Cars whose CF Stream entry is gone (404 on /stream/{uid}) are reported but
// not touched — those need human intervention (re-ingest from source or clear
// the dead pointer).
//
// Run: node scripts/backfill-cf-downloads.mjs

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file) {
    try {
        const text = readFileSync(resolve(file), 'utf8')
        for (const line of text.split('\n')) {
            const clean = line.replace(/\r$/, '')
            const m = clean.match(/^([A-Z0-9_]+)=(.*)$/)
            if (m && !process.env[m[1]]) {
                let v = m[2]
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
                process.env[m[1]] = v
            }
        }
    } catch { }
}
loadEnv('.env.local')

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CF_ACCT = process.env.CLOUDFLARE_ACCOUNT_ID
const CF_TOK = process.env.CLOUDFLARE_STREAM_API_TOKEN
if (!SB_URL || !SB_KEY) throw new Error('Missing Supabase env')
if (!CF_ACCT || !CF_TOK) throw new Error('Missing CF env')

const CF_API = 'https://api.cloudflare.com/client/v4'
const cfHeaders = { Authorization: `Bearer ${CF_TOK}`, 'Content-Type': 'application/json' }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchAllCfCars() {
    const url = `${SB_URL}/rest/v1/cars?select=id,year,make,model,video_url&video_url=like.cf:*`
    const res = await fetch(url, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })
    if (!res.ok) throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`)
    return res.json()
}

async function getVideoMeta(uid) {
    const res = await fetch(`${CF_API}/accounts/${CF_ACCT}/stream/${uid}`, { headers: cfHeaders })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
}

async function getDownloadsState(uid) {
    const res = await fetch(`${CF_API}/accounts/${CF_ACCT}/stream/${uid}/downloads`, { headers: cfHeaders })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, body }
}

async function enableDownloadsAndWait(uid, { maxWaitMs = 180000, pollMs = 4000 } = {}) {
    const post = await fetch(`${CF_API}/accounts/${CF_ACCT}/stream/${uid}/downloads`, { method: 'POST', headers: cfHeaders })
    const postBody = await post.json().catch(() => ({}))
    if (!post.ok || !postBody.success) {
        throw new Error(`POST /downloads failed (HTTP ${post.status}): ${postBody.errors?.[0]?.message || 'unknown'}`)
    }
    const start = Date.now()
    while (true) {
        const { body } = await getDownloadsState(uid)
        const def = body?.result?.default
        if (def?.status === 'ready') return def
        if (def?.status === 'error') throw new Error('CF MP4 generation errored')
        if (Date.now() - start > maxWaitMs) throw new Error(`MP4 not ready after ${maxWaitMs}ms (state=${def?.status ?? 'missing'})`)
        await sleep(pollMs)
    }
}

const cars = await fetchAllCfCars()
console.log(`Found ${cars.length} car(s) with cf:<uid> pointers\n`)

const tallies = { alreadyOk: 0, fixed: 0, notReady: 0, missing: 0, errors: 0 }
const needsAttention = []

for (const car of cars) {
    const uid = car.video_url.slice(3)
    const label = `${car.year} ${car.make} ${car.model} (${car.id.slice(0, 8)} · ${uid.slice(0, 12)}…)`

    const meta = await getVideoMeta(uid)
    if (meta.status === 404) {
        console.log(`[MISSING] ${label} — CF Stream entry not found`)
        tallies.missing++
        needsAttention.push({ car, reason: 'cf-stream-missing' })
        continue
    }
    if (!meta.body.success) {
        console.log(`[ERROR]   ${label} — ${meta.body.errors?.[0]?.message || meta.status}`)
        tallies.errors++
        needsAttention.push({ car, reason: 'cf-meta-error' })
        continue
    }
    if (!meta.body.result?.readyToStream) {
        console.log(`[PENDING] ${label} — video itself still ingesting (state=${meta.body.result?.status?.state})`)
        tallies.notReady++
        needsAttention.push({ car, reason: 'still-ingesting' })
        continue
    }

    const dl = await getDownloadsState(uid)
    const def = dl.body?.result?.default
    if (def?.status === 'ready') {
        console.log(`[OK]      ${label}`)
        tallies.alreadyOk++
        continue
    }

    try {
        process.stdout.write(`[FIXING]  ${label} … `)
        await enableDownloadsAndWait(uid)
        console.log('done')
        tallies.fixed++
    } catch (e) {
        console.log(`failed: ${e.message}`)
        tallies.errors++
        needsAttention.push({ car, reason: `enable-failed: ${e.message}` })
    }
}

console.log('\n=== Summary ===')
console.log(`already ok:    ${tallies.alreadyOk}`)
console.log(`fixed now:     ${tallies.fixed}`)
console.log(`still ingesting (skipped, re-run later): ${tallies.notReady}`)
console.log(`missing from CF (need re-ingest): ${tallies.missing}`)
console.log(`errors: ${tallies.errors}`)

if (needsAttention.length) {
    console.log('\n=== Needs attention ===')
    for (const n of needsAttention) {
        console.log(`  ${n.car.id} (${n.car.year} ${n.car.make} ${n.car.model}) — ${n.reason}`)
    }
}
