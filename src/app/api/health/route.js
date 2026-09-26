import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
    const started = Date.now()
    const checks = {}
    let ok = true

    try {
        const supabase = await createClient()
        const { error } = await supabase.from('cars').select('id', { head: true, count: 'exact' }).limit(1)
        checks.supabase = error ? { ok: false, error: error.message } : { ok: true }
        if (error) ok = false
    } catch (e) {
        checks.supabase = { ok: false, error: e.message }
        ok = false
    }

    checks.env = {
        ok: Boolean(
            process.env.NEXT_PUBLIC_SUPABASE_URL &&
            process.env.SUPABASE_SERVICE_ROLE_KEY &&
            process.env.NEXT_PUBLIC_SITE_URL
        ),
    }
    if (!checks.env.ok) ok = false

    return NextResponse.json(
        {
            ok,
            service: 'everest-motoring',
            commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
            region: process.env.VERCEL_REGION || 'local',
            uptime_ms: Math.round(process.uptime() * 1000),
            latency_ms: Date.now() - started,
            checks,
        },
        { status: ok ? 200 : 503 }
    )
}
