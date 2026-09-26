/**
 * VideoRenderManager — deprecated client-side queue manager.
 *
 * The AI walkaround pipeline is now driven by a server-side Vercel Cron job
 * at /api/cron/advance-video that advances each car one phase per minute,
 * with no dependency on a browser tab staying open. This component used to
 * run that pipeline from the admin layout via client polling + Server
 * Actions; that architecture is the reason renders kept getting stranded
 * when the admin tab was closed, refreshed, or navigated away from.
 *
 * Kept as a no-op stub (rather than removed) so the admin layout's existing
 * import continues to resolve without a code change there. Safe to delete
 * once the layout import is also removed.
 */
export default function VideoRenderManager() {
    return null;
}
