import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
    Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0,
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
        release: process.env.VERCEL_GIT_COMMIT_SHA,
        enabled: process.env.NODE_ENV === 'production',
    })
}
