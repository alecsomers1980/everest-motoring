/**
 * Social media module — fetches aggregated social stats from the ember-social
 * report endpoint, reusing the existing Ember integration credentials
 * (EMBER_SOCIAL_URL + EMBER_SOCIAL_API_KEY). The workspace is derived from the
 * API key on the ember-social side, so no workspace id or extra secret is needed.
 *
 * Returns { current, previous } or { available: false } if not configured.
 */

export async function fetchSocialReport({ month }) {
  const apiUrl = process.env.EMBER_SOCIAL_URL;
  const apiKey = process.env.EMBER_SOCIAL_API_KEY;

  if (!apiUrl || !apiKey) {
    return { available: false, error: "Social integration not configured" };
  }

  try {
    const resp = await fetch(`${apiUrl}/api/report?month=${month}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) {
      return { available: false, error: `Social API returned ${resp.status}` };
    }

    const data = await resp.json();
    return {
      available: true,
      current: data.current,
      previous: data.previous,
    };
  } catch (err) {
    console.error("[reports/social] fetch failed:", err);
    return { available: false, error: err.message };
  }
}
