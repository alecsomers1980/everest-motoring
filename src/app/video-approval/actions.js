"use server";

import { verifyApproval } from "@/utils/video/approvalToken";
import { applyVideoDecision } from "@/utils/video/decision";

/**
 * Applies an approve/reject decision made from the emailed link.
 *
 * The link lands on a confirmation page and this runs only when the button
 * there is pressed. That indirection is deliberate: mail clients prefetch
 * links, and a bare GET approval would let a scanner approve every video.
 */
export async function confirmVideoDecisionAction(carId, action, signature) {
    if (action !== "approve" && action !== "reject") {
        return { success: false, error: "Unknown action." };
    }
    if (!verifyApproval(carId, action, signature)) {
        return { success: false, error: "This link is not valid." };
    }
    return applyVideoDecision(carId, action);
}
