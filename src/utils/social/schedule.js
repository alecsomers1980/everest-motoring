/**
 * Slot maths for the automatic new-vehicle posting flow.
 *
 * Kept apart from the server actions that use it so the date handling can be
 * exercised directly — it is the part most likely to be wrong.
 *
 * Feed posts go out at 09:00 or 14:00 SAST: two cars a day, and a third car
 * added the same day rolls to the next morning. After approval the two
 * video-bearing posts go out the next day at 11:00 and 16:00 SAST, spread so
 * they never land on a feed slot. SAST is UTC+2.
 */

export const FEED_SLOTS_UTC = ["07:00", "12:00"];
export const REEL_SLOT_UTC = "09:00";
export const VIDEO_SLOT_UTC = "14:00";

export function sastNow(now = Date.now()) {
    return new Date(now + 2 * 60 * 60 * 1000);
}

export function addUtcDays(base, days) {
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days));
}

export function slotIso(day, hhmm) {
    return `${day.toISOString().slice(0, 10)}T${hhmm}:00.000Z`;
}

// ember-social skips Sundays when it schedules. An explicit scheduled_at
// bypasses that check, so honour the same rule here.
export function postingDay(offset, now = Date.now()) {
    const day = addUtcDays(sastNow(now), offset);
    return day.getUTCDay() === 0 ? addUtcDays(day, 1) : day;
}

// Earliest feed slot from tomorrow onward that no other vehicle already holds.
export function chooseFeedSlot(takenIsoStrings, now = Date.now()) {
    const taken = new Set((takenIsoStrings || []).map((value) => new Date(value).toISOString()));

    for (let offset = 1; offset <= 30; offset++) {
        const day = addUtcDays(sastNow(now), offset);
        if (day.getUTCDay() === 0) continue;
        for (const slot of FEED_SLOTS_UTC) {
            const iso = slotIso(day, slot);
            if (!taken.has(iso)) return iso;
        }
    }
    // Everything for the next month is spoken for — schedule past it rather
    // than silently dropping the post.
    return slotIso(postingDay(31, now), FEED_SLOTS_UTC[0]);
}

// The window slot allocation must consider: anything already scheduled from
// tomorrow onward.
export function feedLookbackFrom(now = Date.now()) {
    return addUtcDays(sastNow(now), 1).toISOString();
}
