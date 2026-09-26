import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv(file) {
    try {
        const text = readFileSync(resolve(file), 'utf8')
        for (const line of text.split('\n')) {
            const m = line.replace(/\r$/, '').match(/^([A-Z0-9_]+)=(.*)$/)
            if (m && !process.env[m[1]]) {
                let v = m[2]
                if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
                process.env[m[1]] = v
            }
        }
    } catch { }
}
loadEnv('.env.local')

const uid = 'ae17d6f7c8bf2ca8641ca45ed0fbe665'
const acct = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim().replace(/\r$/, '')
const tok = (process.env.CLOUDFLARE_STREAM_API_TOKEN || '').trim().replace(/\r$/, '')
const sub = (process.env.CLOUDFLARE_STREAM_SUBDOMAIN || '').trim().replace(/\r$/, '')
console.log('subdomain:', sub || '(empty)')
console.log('account loaded:', acct ? acct.slice(0, 8) + '...' : '(empty)')
console.log('token loaded:', tok ? '(yes, ' + tok.length + ' chars)' : '(empty)')

const headers = { Authorization: `Bearer ${tok}` }

console.log('\n--- Video metadata ---')
const meta = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/stream/${uid}`, { headers })
console.log('status', meta.status)
const metaJson = await meta.json()
console.log(JSON.stringify(metaJson, null, 2).slice(0, 2000))

console.log('\n--- Downloads state ---')
const dl = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/stream/${uid}/downloads`, { headers })
console.log('status', dl.status)
console.log(await dl.text())
