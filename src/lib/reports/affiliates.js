/**
 * Affiliate-network module — aggregates referral-affiliate performance for the
 * monthly report across two date windows.
 *
 * Completed deals and commission are attributed by the lead's created_at, to
 * stay consistent with the affiliate portal (which resets "Completed this month"
 * and commission owed by created_at). Commission uses each affiliate's own
 * commission_per_deal rate; an affiliate with no rate set contributes nothing.
 *
 * Returns { available, activeAffiliates, current, previous, topAffiliates,
 * pipeline } or { available: false, error } on failure.
 */

import { createAdminClient } from "@/utils/supabase/server";

function aggregateLeads(leads, rateById) {
  const completedDeals = leads.filter(l => l.status === 'closed_won');
  const saleValue = completedDeals.reduce((sum, l) => sum + (Number(l.cars?.price) || 0), 0);
  return {
    leads: leads.length,
    completed: completedDeals.length,
    commission: completedDeals.reduce(
      (sum, l) => sum + (Number(rateById[l.affiliate_id]) || 0),
      0
    ),
    saleValue,
  };
}

export async function fetchAffiliateReport({ curr, prev }) {
  try {
    const client = await createAdminClient();

    // 1. All affiliate profiles
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, first_name, last_name, is_approved, created_at, commission_per_deal')
      .eq('role', 'affiliate');

    if (profilesError) {
      console.error('[reports/affiliates] profiles fetch error:', profilesError);
    }
    const allProfiles = (profilesError ? [] : profiles) || [];

    // 2. Current window leads
    const { data: leadsCurr, error: leadsCurrErr } = await client
      .from('leads')
      .select('affiliate_id, status, created_at, cars(price)')
      .not('affiliate_id', 'is', null)
      .gte('created_at', curr.startISO)
      .lt('created_at', curr.endExclusiveISO);

    if (leadsCurrErr) {
      console.error('[reports/affiliates] current leads fetch error:', leadsCurrErr);
    }
    const currLeads = (leadsCurrErr ? [] : leadsCurr) || [];

    // 3. Previous window leads
    const { data: leadsPrev, error: leadsPrevErr } = await client
      .from('leads')
      .select('affiliate_id, status, created_at, cars(price)')
      .not('affiliate_id', 'is', null)
      .gte('created_at', prev.startISO)
      .lt('created_at', prev.endExclusiveISO);

    if (leadsPrevErr) {
      console.error('[reports/affiliates] previous leads fetch error:', leadsPrevErr);
    }
    const prevLeads = (leadsPrevErr ? [] : leadsPrev) || [];

    // 4. Active affiliates (snapshot)
    const activeAffiliates = allProfiles.filter(p => p.is_approved).length;

    // 5. New affiliates per window (based on profile created_at)
    function countNewProfiles(window) {
      return allProfiles.filter(p => p.created_at >= window.startISO && p.created_at < window.endExclusiveISO).length;
    }
    const currNew = countNewProfiles(curr);
    const prevNew = countNewProfiles(prev);

    // 6. Name map + per-affiliate commission rate map
    const rateById = {};
    allProfiles.forEach(p => { rateById[p.id] = p.commission_per_deal; });

    const nameMap = {};
    allProfiles.forEach(p => {
      const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
      nameMap[p.id] = fullName || 'Affiliate';
    });

    // 7. topAffiliates for current window
    const groups = {};
    currLeads.forEach(lead => {
      const id = lead.affiliate_id;
      if (!groups[id]) groups[id] = [];
      groups[id].push(lead);
    });

    const topAffiliates = Object.entries(groups)
      .map(([id, leads]) => {
        const name = nameMap[id] || 'Affiliate';
        const stats = aggregateLeads(leads, rateById);
        return { name, ...stats };
      })
      .sort((a, b) => b.completed - a.completed || b.leads - a.leads)
      .slice(0, 6);

    // 8. Pipeline for current window
    const pipeline = {
      inquiry: currLeads.filter(l => ['new', 'contacted'].includes(l.status)).length,
      financing: currLeads.filter(l => ['document_collection', 'finance_pending'].includes(l.status)).length,
      completed: currLeads.filter(l => l.status === 'closed_won').length,
    };

    // 9. Current and previous aggregates
    const current = { ...aggregateLeads(currLeads, rateById), newAffiliates: currNew };
    const previous = { ...aggregateLeads(prevLeads, rateById), newAffiliates: prevNew };

    return {
      available: true,
      activeAffiliates,
      current,
      previous,
      topAffiliates,
      pipeline,
    };
  } catch (err) {
    console.error('[reports/affiliates] failed:', err);
    return { available: false, error: err.message };
  }
}
