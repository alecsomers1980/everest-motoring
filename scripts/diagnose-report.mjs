// Diagnostic: verifies the monthly-report data sources are wired correctly.
// Tells you WHICH value is wrong (or which API rejects you) instead of the
// report silently rendering "not yet available".
//
// RUN (locally):   node scripts/diagnose-report.mjs
// RUN (against Vercel values): set the same env vars in your shell first, or
//   `vercel env pull .env.vercel && node --env-file=.env.vercel scripts/diagnose-report.mjs`
//
// It reads from process.env first, then falls back to .env.local.

import { readFileSync } from 'node:fs'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { OAuth2Client } from 'google-auth-library'

function env(key) {
  if (process.env[key]) return process.env[key]
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = txt.split(/\r?\n/).find((l) => l.startsWith(key + '='))
    return line ? line.slice(key.length + 1).trim().replace(/^"|"$/g, '') : null
  } catch {
    return null
  }
}

const ok = (s) => console.log('  \x1b[32m✓\x1b[0m ' + s)
const bad = (s) => console.log('  \x1b[31m✗\x1b[0m ' + s)
const info = (s) => console.log('  • ' + s)

// ──────────────────────────────────────────────────────────────────
// 1. WEBSITE TRAFFIC (GA4 Data API)
// ──────────────────────────────────────────────────────────────────
async function checkGA() {
  console.log('\n=== WEBSITE TRAFFIC (GA4) ===')
  const propertyId = env('GA4_PROPERTY_ID')
  const clientId = env('GOOGLE_CLIENT_ID')
  const clientSecret = env('GOOGLE_CLIENT_SECRET')
  const refreshToken = env('GA_OAUTH_REFRESH_TOKEN')

  const missing = []
  if (!propertyId) missing.push('GA4_PROPERTY_ID')
  if (!clientId) missing.push('GOOGLE_CLIENT_ID')
  if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET')
  if (!refreshToken) missing.push('GA_OAUTH_REFRESH_TOKEN')
  if (missing.length) {
    bad('Missing env var(s): ' + missing.join(', '))
    bad('-> Report shows "Website traffic data is not yet available".')
    return
  }
  ok('All 4 env vars present.')
  info('GA4_PROPERTY_ID = ' + propertyId + (/^\d+$/.test(propertyId) ? ' (looks numeric ✓)' : ' (⚠ should be a NUMBER like 533741507, not "G-XXXX")'))

  const authClient = new OAuth2Client(clientId, clientSecret)
  authClient.setCredentials({ refresh_token: refreshToken })

  // Step A: can we mint an access token? (catches expired/revoked/wrong refresh token)
  try {
    await authClient.getAccessToken()
    ok('OAuth refresh token is valid (got an access token).')
  } catch (err) {
    bad('OAuth refresh token REJECTED: ' + (err.message || err))
    bad('-> Re-mint it: node scripts/get-ga-oauth-token.mjs')
    return
  }

  // Step B: can we read the property? (catches wrong property id / no access / API disabled)
  try {
    const client = new BetaAnalyticsDataClient({ authClient })
    const [resp] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    })
    const sessions = resp.rows?.[0]?.metricValues?.[0]?.value ?? '0'
    const users = resp.rows?.[0]?.metricValues?.[1]?.value ?? '0'
    ok(`GA4 API responded. Last 30 days: ${sessions} sessions, ${users} users.`)
    if (Number(sessions) === 0) {
      info('⚠ Zero sessions — the property is reachable but has no data. Check the')
      info('  GA4 tag (NEXT_PUBLIC_GA_ID) is firing on the LIVE site, or the site is new.')
    }
  } catch (err) {
    bad('GA4 API call FAILED: ' + (err.message || err))
    info('Common causes:')
    info('  - GA4_PROPERTY_ID is wrong (must be the numeric Property ID from')
    info('    GA Admin -> Property Settings, NOT the G-XXXX measurement id).')
    info('  - The Google account you authorised has no access to this property.')
    info('  - "Google Analytics Data API" not enabled in the Cloud project.')
  }
}

// ──────────────────────────────────────────────────────────────────
// 2. SOCIAL (ember-social /api/report)
// ──────────────────────────────────────────────────────────────────
async function checkSocial() {
  console.log('\n=== SOCIAL MEDIA (ember-social) ===')
  const url = env('EMBER_SOCIAL_URL')
  const key = env('EMBER_SOCIAL_API_KEY')
  if (!url || !key) {
    bad('Missing EMBER_SOCIAL_URL or EMBER_SOCIAL_API_KEY.')
    return
  }
  ok('Env vars present. Endpoint: ' + url)
  const month = new Date().toISOString().slice(0, 7)
  try {
    const resp = await fetch(`${url}/api/report?month=${month}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!resp.ok) {
      bad(`Endpoint returned ${resp.status} ${resp.statusText}`)
      if (resp.status === 401) info('-> API key not recognised by ember-social (wrong/rotated key).')
      return
    }
    const data = await resp.json()
    const c = data.current || {}
    const t = c.totals || {}
    ok(`Endpoint OK. ${c.postsPublished || 0} posts this month.`)
    info(`reach=${t.reach || 0} impressions=${t.impressions || 0} likes=${t.likes || 0} comments=${t.comments || 0} shares=${t.shares || 0}`)
    const engagement = (t.likes || 0) + (t.comments || 0) + (t.shares || 0)
    if ((c.postsPublished || 0) > 0 && engagement === 0) {
      info('⚠ Posts exist but engagement is 0 -> back-fill not populating (check tokens / fetchEngagement.ts).')
    } else if (engagement > 0) {
      ok(`Engagement is populating (${engagement} total). Note: per-post reach/impressions are no longer available from Meta (deprecated 2026-06-15).`)
    }
  } catch (err) {
    bad('Could not reach endpoint: ' + (err.message || err))
  }
}

await checkGA()
await checkSocial()
console.log('')
