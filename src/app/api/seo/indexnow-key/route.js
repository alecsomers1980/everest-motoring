import { getIndexNowKey } from "@/utils/seo/indexNow";

export const dynamic = "force-static";

export async function GET() {
    const key = getIndexNowKey();
    if (!key) {
        return new Response("IndexNow key not configured", { status: 404 });
    }
    return new Response(key, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
}
