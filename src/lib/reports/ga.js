/**
 * GA4 Data API module — fetches website traffic metrics for the monthly report.
 *
 * Returns { available, totals, channels, topPages, devices, geo } for curr/prev
 * date ranges, or { available: false, error } if credentials are missing or the
 * API call fails.
 */

import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { OAuth2Client } from "google-auth-library";

// Service-account access to GA4 is broken by a Google-side bug (~Apr 2026), so we
// authenticate via OAuth using the existing OAuth client + the property owner's own
// GA access. See scripts/get-ga-oauth-token.mjs for minting GA_OAUTH_REFRESH_TOKEN.
function getClient() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GA_OAUTH_REFRESH_TOKEN;
  if (!propertyId || !clientId || !clientSecret || !refreshToken) return null;

  const authClient = new OAuth2Client(clientId, clientSecret);
  authClient.setCredentials({ refresh_token: refreshToken });

  return {
    client: new BetaAnalyticsDataClient({ authClient }),
    property: `properties/${propertyId}`,
  };
}

/**
 * Run a report for a single date range. Returns rows as plain objects.
 */
async function runSingleRange(client, property, start, end, { dimensions, metrics, limit }) {
  const payload = {
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    metrics: metrics.map((name) => ({ name })),
  };
  if (dimensions && dimensions.length) {
    payload.dimensions = dimensions.map((name) => ({ name }));
  }
  if (limit) payload.limit = limit;

  const [resp] = await client.runReport(payload);
  return resp;
}

function extractTotals(response) {
  const rv = {};
  const values = response.rows?.[0]?.metricValues || [];
  (response.metricHeaders || []).forEach((header, i) => {
    rv[header.name] = values[i]?.value || "0";
  });
  return rv;
}

function extractDimensionRows(response, dimName) {
  return (response.rows || []).map((row) => ({
    name: row.dimensionValues?.[0]?.value || "(none)",
    value: row.metricValues?.[0]?.value || "0",
  }));
}

function extractGeoRows(response) {
  return (response.rows || []).map((row) => ({
    name: row.dimensionValues?.[0]?.value || "(unknown)",
    sessions: row.metricValues?.[0]?.value || "0",
  }));
}

function extractChannelRows(response) {
  return (response.rows || []).map((row) => ({
    name: row.dimensionValues?.[0]?.value || "(none)",
    sessions: row.metricValues?.[0]?.value || "0",
    users: row.metricValues?.[1]?.value || "0",
  }));
}

export async function fetchGaReport({ curr, prev }) {
  const ctx = getClient();
  if (!ctx) {
    return { available: false, error: "GA4 credentials not configured" };
  }

  const { client, property } = ctx;

  try {
    // Totals (single call per range — metrics don't need dimensions)
    const [currTotalsResp, prevTotalsResp] = await Promise.all([
      runSingleRange(client, property, curr.start, curr.end, {
        metrics: [
          "totalUsers",
          "newUsers",
          "sessions",
          "screenPageViews",
          "averageSessionDuration",
          "bounceRate",
          "engagementRate",
        ],
      }),
      runSingleRange(client, property, prev.start, prev.end, {
        metrics: [
          "totalUsers",
          "newUsers",
          "sessions",
          "screenPageViews",
          "averageSessionDuration",
          "bounceRate",
          "engagementRate",
        ],
      }),
    ]);

    // Acquisition (channels) — one call per range
    const [currChannelsResp, prevChannelsResp] = await Promise.all([
      runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions", "totalUsers"],
      }),
      runSingleRange(client, property, prev.start, prev.end, {
        dimensions: ["sessionDefaultChannelGroup"],
        metrics: ["sessions", "totalUsers"],
      }),
    ]);

    // Top pages
    const [currPagesResp] = await Promise.all([
      runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["pagePath"],
        metrics: ["screenPageViews"],
        limit: 10,
      }),
    ]);

    // Devices
    const [currDevicesResp, prevDevicesResp] = await Promise.all([
      runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["deviceCategory"],
        metrics: ["sessions"],
      }),
      runSingleRange(client, property, prev.start, prev.end, {
        dimensions: ["deviceCategory"],
        metrics: ["sessions"],
      }),
    ]);

    // Geo
    const [currGeoResp] = await Promise.all([
      runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["city"],
        metrics: ["sessions"],
        limit: 10,
      }),
    ]);

    // Build the channels table — merge curr + prev by channel name
    const prevChannelsMap = {};
    for (const ch of extractChannelRows(prevChannelsResp)) {
      prevChannelsMap[ch.name] = ch;
    }
    const channels = extractChannelRows(currChannelsResp).map((ch) => ({
      name: ch.name,
      currentSessions: Number(ch.sessions) || 0,
      previousSessions: Number(prevChannelsMap[ch.name]?.sessions) || 0,
    }));
    // Add channels only present in prev but not curr
    for (const [name, pch] of Object.entries(prevChannelsMap)) {
      if (!channels.find((c) => c.name === name)) {
        channels.push({
          name,
          currentSessions: 0,
          previousSessions: Number(pch.sessions) || 0,
        });
      }
    }

    // Build devices table
    const prevDevicesMap = {};
    for (const d of extractDimensionRows(prevDevicesResp, "deviceCategory")) {
      prevDevicesMap[d.name] = d;
    }
    const devices = extractDimensionRows(currDevicesResp, "deviceCategory").map((d) => ({
      name: d.name,
      sessions: Number(d.value) || 0,
      previousSessions: Number(prevDevicesMap[d.name]?.value) || 0,
    }));

    // ---- new data ----
    // 1. newVsReturning (wrapped so a failure can't blank the whole section)
    let newVsReturning = [];
    try {
      const newVsReturningResp = await runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["newVsReturning"],
        metrics: ["sessions"],
      });
      newVsReturning = extractDimensionRows(newVsReturningResp, "newVsReturning").map((r) => ({
        name: r.name,
        sessions: Number(r.value) || 0,
      }));
    } catch (err) {
      console.error("[reports/ga] newVsReturning fetch failed:", err);
      newVsReturning = [];
    }

    // 2. YoY (year-over-year totals) — last-year dates, isolated so no-data won't break the report
    let yoy = null;
    try {
      const lastYear = (parseInt(curr.start.slice(0, 4)) - 1).toString();
      const lastYearStart = curr.start.replace(/^\d{4}/, lastYear);
      const lastYearEnd = curr.end.replace(/^\d{4}/, lastYear);
      const yoyResp = await runSingleRange(client, property, lastYearStart, lastYearEnd, {
        metrics: ["totalUsers", "sessions"],
      });
      yoy = extractTotals(yoyResp);
    } catch (err) {
      console.error("[reports/ga] YoY data fetch failed:", err);
      yoy = null;
    }

    // 3. Demographics (require Google Signals — may be empty) — isolated
    let demographics = { age: [], gender: [] };
    try {
      const [ageResp, genderResp] = await Promise.all([
        runSingleRange(client, property, curr.start, curr.end, {
          dimensions: ["userAgeBracket"],
          metrics: ["activeUsers"],
          limit: 12,
        }),
        runSingleRange(client, property, curr.start, curr.end, {
          dimensions: ["userGender"],
          metrics: ["activeUsers"],
          limit: 5,
        }),
      ]);
      const ageRows = extractDimensionRows(ageResp, "userAgeBracket")
        .filter((r) => r.name !== "(not set)" && r.name !== "unknown")
        .map((r) => ({ name: r.name, users: Number(r.value) || 0 }));
      const genderRows = extractDimensionRows(genderResp, "userGender")
        .filter((r) => r.name !== "(not set)" && r.name !== "unknown")
        .map((r) => ({ name: r.name, users: Number(r.value) || 0 }));
      demographics = { age: ageRows, gender: genderRows };
    } catch (err) {
      console.error("[reports/ga] Demographics data fetch failed:", err);
      demographics = { age: [], gender: [] };
    }

    // 4. Key events (conversions) — only events marked as key in GA4; isolated
    let keyEvents = [];
    try {
      const keyEventsResp = await runSingleRange(client, property, curr.start, curr.end, {
        dimensions: ["eventName"],
        metrics: ["keyEvents"],
        limit: 25,
      });
      keyEvents = extractDimensionRows(keyEventsResp, "eventName")
        .map((r) => ({ name: r.name, count: Number(r.value) || 0 }))
        .filter((r) => r.count > 0)
        .sort((a, b) => b.count - a.count);
    } catch (err) {
      console.error("[reports/ga] keyEvents fetch failed:", err);
      keyEvents = [];
    }

    return {
      available: true,
      totals: {
        current: extractTotals(currTotalsResp),
        previous: extractTotals(prevTotalsResp),
      },
      channels,
      topPages: extractDimensionRows(currPagesResp, "pagePath").map((p) => ({
        path: p.name,
        views: Number(p.value) || 0,
      })),
      devices,
      geo: extractGeoRows(currGeoResp),
      newVsReturning,
      yoy,
      demographics,
      keyEvents,
    };
  } catch (err) {
    console.error("[reports/ga] GA4 API error:", err);
    return { available: false, error: err.message || "GA4 API error" };
  }
}
