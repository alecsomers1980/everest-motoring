/**
 * Email stats module — fetches email sends from the Resend API and categorises
 * them by subject.
 *
 * Returns { current: { total, byCategory }, previous: { ... } }
 * or { available: false } if the API key is missing.
 */

import { Resend } from "resend";

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

/**
 * Walk backwards through Resend email history, accumulating emails until
 * we've passed the cutoff date. Cap at 20 pages for safety.
 */
async function fetchAllEmailsSince(resend, since) {
  const emails = [];
  let before = undefined;
  const maxPages = 20;

  for (let page = 0; page < maxPages; page++) {
    const params = { limit: 100 };
    if (before) params.before = before;

    const { data, error } = await resend.emails.list(params);
    if (error) {
      console.error("[reports/emails] Resend list error:", error);
      break;
    }

    const batch = data?.data || [];
    if (batch.length === 0) break;

    emails.push(...batch);

    // If the oldest email in this batch is older than `since`, we're done
    const oldest = batch[batch.length - 1];
    if (oldest?.created_at && new Date(oldest.created_at) < new Date(since)) {
      break;
    }

    before = oldest?.id;
    if (!before) break;
  }

  return emails;
}

/**
 * Categorise an email by subject.
 */
function categorise(subject) {
  const s = (subject || "").toLowerCase();
  if (s.includes("anniversary") || s.includes("six months with your")) {
    return "Customer Retention";
  }
  if (s.includes("new website contact message")) {
    return "Contact Form (Internal)";
  }
  if (s.includes("new vehicle inquiry") || s.includes("new test drive request")) {
    return "Lead Inquiry (Internal)";
  }
  if (s.includes("latest arrivals")) {
    return "Newsletter";
  }
  if (s.includes("trade-in") || s.includes("offer")) {
    return "Trade-In Offer";
  }
  if (s.includes("welcome")) {
    return "Welcome";
  }
  return "Other";
}

function inWindow(ts, startISO, endExclusiveISO) {
  const d = new Date(ts);
  return d >= new Date(startISO) && d < new Date(endExclusiveISO);
}

export async function fetchEmailStats({ curr, prev }) {
  const resend = getClient();
  if (!resend) {
    return { available: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    // Need to cover both windows — fetch back to the start of the previous month
    const since = prev.startISO;
    const allEmails = await fetchAllEmailsSince(resend, since);

    const results = { current: { total: 0, byCategory: {} }, previous: { total: 0, byCategory: {} } };

    for (const email of allEmails) {
      const subject = email.subject || "";
      const cat = categorise(subject);
      const ts = email.created_at;

      if (ts && inWindow(ts, curr.startISO, curr.endExclusiveISO)) {
        results.current.total++;
        results.current.byCategory[cat] = (results.current.byCategory[cat] || 0) + 1;
      } else if (ts && inWindow(ts, prev.startISO, prev.endExclusiveISO)) {
        results.previous.total++;
        results.previous.byCategory[cat] = (results.previous.byCategory[cat] || 0) + 1;
      }
      // else: older than prev window — skip
    }

    return results;
  } catch (err) {
    console.error("[reports/emails] Resend API error:", err);
    return { available: false, error: err.message };
  }
}
