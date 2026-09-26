"use server";

import { postCarToGbp, postNewsToGbp } from "@/utils/google/gbpService";

export async function postCarToGbpAction(car) {
    try {
        await postCarToGbp(car);
        return { success: true };
    } catch (err) {
        console.error("[GBP] postCarToGbpAction failed:", err.message);
        return { success: false };
    }
}

export async function postNewsToGbpAction(article) {
    try {
        await postNewsToGbp(article);
        return { success: true };
    } catch (err) {
        console.error("[GBP] postNewsToGbpAction failed:", err.message);
        return { success: false };
    }
}
