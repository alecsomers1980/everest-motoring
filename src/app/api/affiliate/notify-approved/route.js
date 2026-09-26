import { notifyApprovedAffiliates } from "@/utils/affiliate/notifyApprovedAffiliates";

/**
 * External webhook kept for compatibility (bearer-secret authenticated).
 * The real trigger is now the direct in-process call from
 * postApprovedVideoPosts, right when Everest's own walkaround approval
 * succeeds — see src/app/admin/inventory/socialAction.js.
 */
export async function POST(req) {
  const secret = process.env.AFFILIATE_NOTIFY_SECRET;
  const authorization = req.headers.get("authorization") || "";

  if (!secret || authorization !== `Bearer ${secret}`) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { carId } = await req.json();

  if (!carId) {
    return Response.json({ success: false, error: "carId is required" }, { status: 400 });
  }

  const result = await notifyApprovedAffiliates(carId);

  if (!result.success) {
    const status = result.error === "Car not found" ? 404 : 500;
    return Response.json({ success: false, error: result.error }, { status });
  }

  return Response.json({ success: true, notified: result.notified });
}
