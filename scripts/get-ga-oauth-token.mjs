// One-time helper: mint a GA4 Data API refresh token using the EXISTING OAuth client.
// Why: Google's service-account add to GA4 is broken (confirmed bug, ~Apr 2026), so we
// authenticate as your own Google account (which already has access to the property).
//
// PREREQUISITE (one manual step in Google Cloud Console):
//   APIs & Services -> Credentials -> open the OAuth 2.0 Client that matches GOOGLE_CLIENT_ID
//   -> Authorized redirect URIs -> add:  http://localhost:5555/oauth2callback  -> Save.
//   (Also make sure "Google Analytics Data API" is enabled for the project.)
//
// RUN:  node scripts/get-ga-oauth-token.mjs
//   A browser opens; sign in with the Google account that has access to GA property 533741507,
//   approve. The script prints GA_OAUTH_REFRESH_TOKEN — paste it into .env.local (and Vercel).

import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { OAuth2Client } from 'google-auth-library'

const REDIRECT_URI = 'http://localhost:5555/oauth2callback'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

// Minimal .env.local parser for the two values we need.
function readEnv(key) {
  if (process.env[key]) return process.env[key]
  const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const line = txt.split(/\r?\n/).find((l) => l.startsWith(key + '='))
  return line ? line.slice(key.length + 1).trim() : null
}

const clientId = readEnv('GOOGLE_CLIENT_ID')
const clientSecret = readEnv('GOOGLE_CLIENT_SECRET')
if (!clientId || !clientSecret) {
  console.error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local')
  process.exit(1)
}

const oauth = new OAuth2Client(clientId, clientSecret, REDIRECT_URI)
const authUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // force a refresh_token even if previously authorised
  scope: [SCOPE],
})

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/oauth2callback')) {
    res.writeHead(404).end()
    return
  }
  const code = new URL(req.url, REDIRECT_URI).searchParams.get('code')
  if (!code) {
    res.writeHead(400).end('No code')
    return
  }
  try {
    const { tokens } = await oauth.getToken(code)
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end('<h2>Done. You can close this tab and return to the terminal.</h2>')
    console.log('\n=== SUCCESS ===')
    if (tokens.refresh_token) {
      console.log('\nAdd this line to .env.local (and Vercel env):\n')
      console.log('GA_OAUTH_REFRESH_TOKEN=' + tokens.refresh_token + '\n')
    } else {
      console.log('No refresh_token returned. Revoke prior access at')
      console.log('https://myaccount.google.com/permissions and re-run.')
    }
  } catch (err) {
    res.writeHead(500).end('Token exchange failed: ' + err.message)
    console.error(err)
  } finally {
    server.close()
    process.exit(0)
  }
})

server.listen(5555, () => {
  console.log('Open this URL in your browser (sign in with the Google account that has GA access):\n')
  console.log(authUrl + '\n')
})
