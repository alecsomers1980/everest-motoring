/**
 * Website activity module — queries Supabase for car/sales/leads/trade-in/test-drive
 * metrics across two date windows.
 *
 * Returns { current: { carsAdded, carsSold, ... }, previous: { ... } }
 */

import { createAdminClient } from "@/utils/supabase/server";

async function countInWindow(client, table, column, start, end) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .gte(column, start)
    .lt(column, end);
  if (error) {
    console.error(`[reports/website] count ${table}.${column} failed:`, error);
    return 0;
  }
  return count || 0;
}

async function countTestDrives(client, start, end) {
  // Test drives are leads with preferred_date_1 set
  const { count, error } = await client
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", start)
    .lt("created_at", end)
    .not("preferred_date_1", "is", null);
  if (error) {
    console.error("[reports/website] test-drive count failed:", error);
    return 0;
  }
  return count || 0;
}

async function sumCarsSold(client, start, end) {
  const { data, error } = await client
    .from("sales")
    .select("car_id, cars!inner(price)")
    .gte("sold_at", start)
    .lt("sold_at", end);
  if (error) {
    console.error("[reports/website] sales join failed:", error);
    return { count: 0, listValue: 0 };
  }
  const count = (data || []).length;
  const listValue = (data || []).reduce((sum, s) => {
    const price = s.cars?.price;
    return sum + (typeof price === "number" ? price : 0);
  }, 0);
  return { count, listValue };
}

async function leadBreakdown(client, start, end) {
  const { data, error } = await client
    .from("leads")
    .select("status")
    .gte("created_at", start)
    .lt("created_at", end);
  if (error) {
    console.error("[reports/website] leads query failed:", error);
    return { total: 0, byStatus: {} };
  }
  const byStatus = {};
  for (const lead of data || []) {
    const s = lead.status || "unknown";
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  return { total: (data || []).length, byStatus };
}

export async function fetchWebsiteActivity({ curr, prev }) {
  const client = await createAdminClient();

  const [
    carsAddedCurr,
    carsAddedPrev,
    carsSoldCurr,
    carsSoldPrev,
    carsDeletedCurr,
    carsDeletedPrev,
    leadsCurr,
    leadsPrev,
    tradeInsCurr,
    tradeInsPrev,
    testDrivesCurr,
    testDrivesPrev,
    subsCurr,
    subsPrev,
  ] = await Promise.all([
    countInWindow(client, "cars", "created_at", curr.startISO, curr.endExclusiveISO),
    countInWindow(client, "cars", "created_at", prev.startISO, prev.endExclusiveISO),
    sumCarsSold(client, curr.startISO, curr.endExclusiveISO),
    sumCarsSold(client, prev.startISO, prev.endExclusiveISO),
    countInWindow(client, "car_events", "created_at", curr.startISO, curr.endExclusiveISO),
    countInWindow(client, "car_events", "created_at", prev.startISO, prev.endExclusiveISO),
    leadBreakdown(client, curr.startISO, curr.endExclusiveISO),
    leadBreakdown(client, prev.startISO, prev.endExclusiveISO),
    countInWindow(client, "value_my_car_requests", "created_at", curr.startISO, curr.endExclusiveISO),
    countInWindow(client, "value_my_car_requests", "created_at", prev.startISO, prev.endExclusiveISO),
    countTestDrives(client, curr.startISO, curr.endExclusiveISO),
    countTestDrives(client, prev.startISO, prev.endExclusiveISO),
    countInWindow(client, "newsletter_subscribers", "created_at", curr.startISO, curr.endExclusiveISO),
    countInWindow(client, "newsletter_subscribers", "created_at", prev.startISO, prev.endExclusiveISO),
  ]);

  return {
    current: {
      carsAdded: carsAddedCurr,
      carsSold: carsSoldCurr.count,
      carsSoldListValue: carsSoldCurr.listValue,
      carsDeleted: carsDeletedCurr,
      leads: leadsCurr.total,
      leadsByStatus: leadsCurr.byStatus,
      tradeInRequests: tradeInsCurr,
      testDrives: testDrivesCurr,
      subscribersGained: subsCurr,
    },
    previous: {
      carsAdded: carsAddedPrev,
      carsSold: carsSoldPrev.count,
      carsSoldListValue: carsSoldPrev.listValue,
      carsDeleted: carsDeletedPrev,
      leads: leadsPrev.total,
      leadsByStatus: leadsPrev.byStatus,
      tradeInRequests: tradeInsPrev,
      testDrives: testDrivesPrev,
      subscribersGained: subsPrev,
    },
  };
}
