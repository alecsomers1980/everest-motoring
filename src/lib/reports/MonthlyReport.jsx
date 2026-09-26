/**
 * MonthlyReport.jsx — @react-pdf/renderer document for the Everest Motoring
 * monthly performance report.
 *
 * Pure component: data in → Document out. No data fetching, no side effects.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ──── Colors ────
const BRAND_YELLOW = "#ffff01";
const BRAND_BLACK = "#0a0a0a";
const DARK_GREY = "#1a1a1a";
const MID_GREY = "#666666";
const LIGHT_GREY = "#e5e5e5";
const PAGE_BG = "#ffffff";
const GREEN = "#16a34a";
const RED = "#dc2626";
const GREY = "#9ca3af";

// ──── Register font (system font fallback for PDF) ────
// We register Helvetica as both normal and bold — these are built into
// @react-pdf/renderer and always available. NOTE: built-in Helvetica has no
// glyphs for ▲ ▼ Δ etc., so deltas/headers use plain ASCII + colour instead.

// ──── Styles ────
const styles = StyleSheet.create({
  page: {
    backgroundColor: PAGE_BG,
    paddingTop: 0,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    color: BRAND_BLACK,
  },
  // Cover band
  coverBand: {
    backgroundColor: BRAND_BLACK,
    paddingVertical: 28,
    paddingHorizontal: 40,
    marginHorizontal: -40,
    marginBottom: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `3 solid ${BRAND_YELLOW}`,
  },
  coverLogo: {
    width: 140,
    height: "auto",
  },
  coverTitle: {
    color: BRAND_YELLOW,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coverSub: {
    color: "#bbbbbb",
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  // Section
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLACK,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderBottom: `2 solid ${BRAND_YELLOW}`,
    paddingBottom: 5,
    marginBottom: 12,
    marginTop: 22,
  },
  // Sub-heading above each table
  subHeading: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLACK,
    letterSpacing: 0.3,
    marginTop: 14,
    marginBottom: 5,
  },
  // Stat tiles row
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statTile: {
    backgroundColor: "#fafafa",
    border: "1 solid #ececec",
    borderRadius: 6,
    padding: 10,
    width: "23%",
    minWidth: 110,
  },
  statLabel: {
    fontSize: 7,
    color: MID_GREY,
    textTransform: "uppercase",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: BRAND_BLACK,
    marginBottom: 2,
  },
  // Delta chip
  deltaChip: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  deltaUp: { color: GREEN },
  deltaDown: { color: RED },
  deltaNone: { color: GREY },
  // Tables
  tableBlock: {
    marginBottom: 6,
  },
  table: {
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_BLACK,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  tableHeaderText: {
    color: BRAND_YELLOW,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #f0f0f0",
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  tableRowAlt: {
    backgroundColor: "#fafafa",
  },
  tableCell: {
    fontSize: 8,
    color: BRAND_BLACK,
  },
  tableCellRight: {
    fontSize: 8,
    color: BRAND_BLACK,
    textAlign: "right",
  },
  tableDelta: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
  },
  // Muted panel (for unavailable sections)
  mutedPanel: {
    backgroundColor: "#f9fafb",
    border: "1 dashed #d1d5db",
    borderRadius: 6,
    padding: 16,
    marginVertical: 8,
    alignItems: "center",
  },
  mutedText: {
    fontSize: 9,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTop: "1 solid #e5e5e5",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#9ca3af",
  },
  footerPage: {
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
  },
});

// ──── Reusable subcomponents ────

function money(v) {
  if (v == null) return "R 0";
  return "R " + Number(v).toLocaleString("en-ZA");
}

function DeltaChip({ curr, prev, isMoney, isPercent, isDuration }) {
  if (prev == null || prev === 0) {
    if (curr == null || curr === 0) {
      return <Text style={styles.deltaChip}>—</Text>;
    }
    return <Text style={[styles.deltaChip, styles.deltaUp]}>NEW</Text>;
  }

  const c = Number(curr);
  const p = Number(prev);

  if (isDuration) {
    // Duration is in seconds — show difference, not percentage
    const diff = c - p;
    const sign = diff >= 0 ? "+" : "";
    return (
      <Text style={[styles.deltaChip, styles.deltaNone]}>
        {sign}{Math.round(diff)}s vs prev
      </Text>
    );
  }

  if (isPercent) {
    // already a percentage (e.g. bounceRate, engagementRate) — show diff in pp
    const diff = c - p;
    const sign = diff >= 0 ? "+" : "";
    const color = diff >= 0 ? styles.deltaUp : styles.deltaDown;
    return (
      <Text style={[styles.deltaChip, color]}>
        {sign}{diff.toFixed(1)}pp vs prev
      </Text>
    );
  }

  // Plain count metric — percentage change. Built-in Helvetica has no ▲/▼
  // glyphs, so we signal direction with sign + colour (renders reliably).
  const pct = ((c - p) / p) * 100;
  const positive = pct >= 0;
  const color = positive ? styles.deltaUp : styles.deltaDown;
  return (
    <Text style={[styles.deltaChip, color]}>
      {positive ? "+" : "-"}{Math.abs(pct).toFixed(0)}% vs prev
    </Text>
  );
}

function StatTile({ label, value, prevValue, isMoney, isPercent, isDuration }) {
  const display = isMoney
    ? money(value)
    : isDuration
    ? formatDuration(value)
    : isPercent
    ? `${formatNumber(value)}%`
    : formatNumber(value);
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{display}</Text>
      <DeltaChip curr={value} prev={prevValue} isMoney={isMoney} isPercent={isPercent} isDuration={isDuration} />
    </View>
  );
}

function formatNumber(v) {
  if (v == null) return "0";
  return Number(v).toLocaleString("en-ZA");
}

function formatDuration(seconds) {
  if (seconds == null || seconds === 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

// Captions come from social posts full of emojis and newlines, which Helvetica
// can't render (empty boxes) and which break table row layout. Strip emoji /
// pictographs and collapse all whitespace to single spaces.
function cleanCaption(text) {
  if (!text) return "";
  return String(text)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function SectionTitle({ children }) {
  // minPresenceAhead keeps a section heading from being stranded at the very
  // bottom of a page — if there isn't room for the heading plus the start of
  // its content, the whole thing moves to the next page.
  return (
    <Text style={styles.sectionTitle} minPresenceAhead={150}>
      {children}
    </Text>
  );
}

// A titled table that never splits across a page boundary. The heading and the
// whole table move together (wrap=false); individual rows are also atomic.
function TableBlock({ title, children }) {
  return (
    <View style={styles.tableBlock} wrap={false}>
      {title ? <Text style={styles.subHeading}>{title}</Text> : null}
      {children}
    </View>
  );
}

function DataTable({ columns, rows, colWidths }) {
  // Callers pass colWidths as a space-separated string ("40% 20% 20% 20%");
  // normalise to an array so indexing yields whole widths, not characters.
  const widths = typeof colWidths === "string" ? colWidths.trim().split(/\s+/) : colWidths;
  return (
    <View style={styles.table}>
      {/* Header */}
      <View style={styles.tableHeader}>
        {columns.map((col, i) => (
          <Text
            key={i}
            style={[
              styles.tableHeaderText,
              widths?.[i] ? { width: widths[i] } : { flex: 1 },
              col.align === "right" ? { textAlign: "right" } : {},
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>
      {/* Rows */}
      {rows.map((row, ri) => (
        <View
          key={ri}
          wrap={false}
          style={[
            styles.tableRow,
            ri % 2 === 1 ? styles.tableRowAlt : {},
          ]}
        >
          {columns.map((col, ci) => {
            const value = col.render ? col.render(row, ri) : row[col.key];
            const width = widths?.[ci];
            const isBold = typeof col.bold === "function" ? col.bold(row, ri) : col.bold;
            const cellColor = typeof col.color === "function" ? col.color(row, ri) : col.color;
            return (
              <Text
                key={ci}
                style={[
                  col.align === "right" ? styles.tableCellRight : styles.tableCell,
                  width ? { width } : { flex: 1 },
                  isBold ? { fontFamily: "Helvetica-Bold" } : {},
                  cellColor ? { color: cellColor } : {},
                ]}
              >
                {value}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function MutedPanel({ children }) {
  return (
    <View style={styles.mutedPanel}>
      <Text style={styles.mutedText}>{children}</Text>
    </View>
  );
}

// ──── Footer ────
function ReportFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Everest Motoring</Text>
      <Text
        style={styles.footerPage}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
      <Text style={styles.footerText}>Powered by Ember Automation</Text>
    </View>
  );
}

// ──── Section: Website Traffic ────
function TrafficSection({ ga }) {
  if (!ga || ga.available === false) {
    return (
      <View>
        <SectionTitle>Website Traffic</SectionTitle>
        <MutedPanel>
          Website traffic data is not yet available for this period.
        </MutedPanel>
      </View>
    );
  }

  const c = ga.totals?.current || {};
  const p = ga.totals?.previous || {};

  const channels = ga.channels || [];
  const topPages = ga.topPages || [];
  const devices = ga.devices || [];
  const geo = ga.geo || [];

  return (
    <View>
      <SectionTitle>Website Traffic</SectionTitle>

      {/* Stat tiles */}
      <View style={styles.statRow} wrap={false}>
        <StatTile label="Total Visitors" value={c.totalUsers} prevValue={p.totalUsers} />
        <StatTile label="New Visitors" value={c.newUsers} prevValue={p.newUsers} />
        <StatTile label="Sessions" value={c.sessions} prevValue={p.sessions} />
        <StatTile label="Page Views" value={c.screenPageViews} prevValue={p.screenPageViews} />
        <StatTile label="Avg Session Duration" value={c.averageSessionDuration} prevValue={p.averageSessionDuration} isDuration />
        <StatTile label="Bounce Rate" value={c.bounceRate} prevValue={p.bounceRate} isPercent />
        <StatTile label="Engagement Rate" value={c.engagementRate} prevValue={p.engagementRate} isPercent />
      </View>

      {/* Year-over-year line */}
      {ga.yoy && Number(ga.yoy.sessions) > 0 && (
        <Text style={{ fontSize: 9, color: '#555', marginBottom: 6, fontStyle: 'italic' }}>
          Year-over-year: {c.sessions} sessions vs {ga.yoy.sessions} same month last year ({(() => {
            const yoySessions = Number(ga.yoy.sessions);
            const pct = Math.round(((c.sessions - yoySessions) / yoySessions) * 100);
            return `${pct >= 0 ? '+' : ''}${pct}%`;
          })()}).
        </Text>
      )}

      {/* Acquisition table */}
      {channels.length > 0 && (
        <TableBlock title="Traffic by Channel">
          <DataTable
            columns={[
              { header: "Channel", key: "name" },
              { header: "Sessions", key: "currentSessions", align: "right" },
              { header: "Prev", key: "previousSessions", align: "right" },
              {
                header: "Change",
                key: "delta",
                align: "right",
                color: (row) => deltaColor(row.currentSessions, row.previousSessions),
                render: (row) => deltaPct(row.currentSessions, row.previousSessions),
              },
            ]}
            colWidths="40% 20% 20% 20%"
            rows={channels}
          />
        </TableBlock>
      )}

      {/* Top pages */}
      {topPages.length > 0 && (
        <TableBlock title="Top Pages">
          <DataTable
            columns={[
              { header: "Page", key: "path" },
              { header: "Views", key: "views", align: "right" },
            ]}
            colWidths="70% 30%"
            rows={topPages}
          />
        </TableBlock>
      )}

      {/* Devices */}
      {devices.length > 0 && (
        <TableBlock title="Devices">
          <DataTable
            columns={[
              { header: "Device", key: "name" },
              { header: "Sessions", key: "sessions", align: "right" },
              { header: "Prev", key: "previousSessions", align: "right" },
              {
                header: "Change",
                key: "delta",
                align: "right",
                color: (row) => deltaColor(row.sessions, row.previousSessions),
                render: (row) => deltaPct(row.sessions, row.previousSessions),
              },
            ]}
            colWidths="30% 25% 25% 20%"
            rows={devices}
          />
        </TableBlock>
      )}

      {/* Geo — cities */}
      {geo.length > 0 && (
        <TableBlock title="Top Locations (Cities)">
          <DataTable
            columns={[
              { header: "City", key: "name" },
              { header: "Sessions", key: "sessions", align: "right" },
            ]}
            colWidths="70% 30%"
            rows={geo}
          />
        </TableBlock>
      )}

      {/* New vs Returning Visitors */}
      {ga.newVsReturning && ga.newVsReturning.filter(r => r.name === 'new' || r.name === 'returning').length > 0 && (
        <TableBlock title="New vs Returning Visitors">
          <DataTable
            columns={[
              { header: 'Visitor Type', key: 'label' },
              { header: 'Sessions', key: 'sessions', align: 'right' },
            ]}
            colWidths="60% 40%"
            rows={ga.newVsReturning
              .filter(r => r.name === 'new' || r.name === 'returning')
              .map(r => ({
                label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
                sessions: r.sessions,
              }))}
          />
        </TableBlock>
      )}

      {/* Demographics – Age */}
      {ga.demographics?.age?.length > 0 && (
        <TableBlock title="Audience Age">
          <DataTable
            columns={[
              { header: 'Age', key: 'name' },
              { header: 'Users', key: 'users', align: 'right' },
            ]}
            colWidths="60% 40%"
            rows={ga.demographics.age}
          />
        </TableBlock>
      )}

      {/* Demographics – Gender */}
      {ga.demographics?.gender?.length > 0 && (
        <TableBlock title="Audience Gender">
          <DataTable
            columns={[
              { header: 'Gender', key: 'name' },
              { header: 'Users', key: 'users', align: 'right' },
            ]}
            colWidths="60% 40%"
            rows={ga.demographics.gender}
          />
        </TableBlock>
      )}
    </View>
  );
}

// ──── Section: Website Activity ────
function ActivitySection({ website, emails }) {
  const c = website?.current || {};
  const p = website?.previous || {};
  const ec = emails?.current || {};
  const ep = emails?.previous || {};

  return (
    <View>
      <SectionTitle>Website Activity</SectionTitle>

      <View style={styles.statRow} wrap={false}>
        <StatTile label="Cars Added" value={c.carsAdded} prevValue={p.carsAdded} />
        <StatTile label="Cars Sold" value={c.carsSold} prevValue={p.carsSold} />
        <StatTile label="Sold — List Value" value={c.carsSoldListValue} prevValue={p.carsSoldListValue} isMoney />
        <StatTile label="Cars Deleted" value={c.carsDeleted} prevValue={p.carsDeleted} />
        <StatTile label="New Leads" value={c.leads} prevValue={p.leads} />
        <StatTile label="Trade-In Requests" value={c.tradeInRequests} prevValue={p.tradeInRequests} />
        <StatTile label="Test Drives" value={c.testDrives} prevValue={p.testDrives} />
        <StatTile label="New Subscribers" value={c.subscribersGained} prevValue={p.subscribersGained} />
      </View>

      {/* Email stats table */}
      {emails && emails.available !== false && (
        <TableBlock title="Emails Sent">{renderEmailTable(ec, ep)}</TableBlock>
      )}

      {emails && emails.available === false && (
        <MutedPanel>Email data is not yet available for this period.</MutedPanel>
      )}

      {/* Leads breakdown */}
      {c.leadsByStatus && Object.keys(c.leadsByStatus).length > 0 && (
        <TableBlock title="Leads by Status">
          <DataTable
            columns={[
              { header: "Status", key: "status" },
              { header: "This Month", key: "current", align: "right" },
              { header: "Last Month", key: "previous", align: "right" },
              {
                header: "Change",
                key: "delta",
                align: "right",
                color: (row) => deltaColor(row.current, row.previous),
                render: (row) => deltaPct(row.current, row.previous),
              },
            ]}
            colWidths="35% 25% 20% 20%"
            rows={buildLeadStatusRows(c.leadsByStatus, p.leadsByStatus)}
          />
        </TableBlock>
      )}
    </View>
  );
}

function renderEmailTable(current, previous) {
  const allCategories = new Set([
    ...Object.keys(current?.byCategory || {}),
    ...Object.keys(previous?.byCategory || {}),
  ]);

  const rows = Array.from(allCategories).map((cat) => ({
    category: cat,
    current: current?.byCategory?.[cat] || 0,
    previous: previous?.byCategory?.[cat] || 0,
  }));

  // Sort by current month count desc
  rows.sort((a, b) => b.current - a.current);

  // Add total row
  rows.push({
    category: "TOTAL",
    current: current?.total || 0,
    previous: previous?.total || 0,
    isTotal: true,
  });

  return (
    <DataTable
      columns={[
        { header: "Category", key: "category", bold: (row) => row?.isTotal },
        { header: "This Month", key: "current", align: "right", bold: (row) => row?.isTotal },
        { header: "Last Month", key: "previous", align: "right", bold: (row) => row?.isTotal },
        {
          header: "Change",
          key: "delta",
          align: "right",
          color: (row) => deltaColor(row.current, row.previous),
          render: (row) => deltaPct(row.current, row.previous),
        },
      ]}
      colWidths="40% 25% 20% 15%"
      rows={rows}
    />
  );
}

function buildLeadStatusRows(current, previous) {
  const allStatuses = new Set([...Object.keys(current), ...Object.keys(previous || {})]);
  const rows = Array.from(allStatuses).map((s) => ({
    status: s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    current: current[s] || 0,
    previous: (previous || {})[s] || 0,
  }));
  rows.sort((a, b) => b.current - a.current);
  return rows;
}

// ──── Section: Affiliate Network ────
function AffiliateSection({ affiliates }) {
  if (!affiliates || affiliates.available === false) {
    return (
      <View>
        <SectionTitle>Affiliate Network</SectionTitle>
        <MutedPanel>Affiliate data is not yet available for this period.</MutedPanel>
      </View>
    );
  }

  const c = affiliates.current || {};
  const p = affiliates.previous || {};
  const active = affiliates.activeAffiliates || 0;
  const top = affiliates.topAffiliates || [];
  const pipe = affiliates.pipeline || {};

  if (active === 0 && (c.leads || 0) === 0) {
    return (
      <View>
        <SectionTitle>Affiliate Network</SectionTitle>
        <MutedPanel>No affiliate activity yet for this period.</MutedPanel>
      </View>
    );
  }

  const commentary = (() => {
    if ((c.leads || 0) === 0) {
      return `The affiliate network has ${active} active member(s) but drove no new leads this period.`;
    }
    return `The affiliate network has ${active} active member(s). This month they generated ${c.leads || 0} lead(s) and closed ${c.completed || 0} deal(s), earning ${money(c.commission || 0)} in commissions.`;
  })();

  const topColumns = [
    { header: 'Affiliate', key: 'name' },
    { header: 'Leads', key: 'leads', align: 'right' },
    { header: 'Completed', key: 'completed', align: 'right' },
    { header: 'Est. Value', key: 'saleValue', align: 'right', render: (row) => money(row.saleValue) },
  ];

  const pipelineRows = [
    { stage: 'Inquiry (new / contacted)', count: pipe.inquiry || 0 },
    { stage: 'Busy with Financing', count: pipe.financing || 0 },
    { stage: 'Completed Deals', count: pipe.completed || 0 },
  ];

  const pipelineColumns = [
    { header: 'Stage', key: 'stage' },
    { header: 'Leads', key: 'count', align: 'right' },
  ];

  return (
    <View>
      <SectionTitle>Affiliate Network</SectionTitle>
      <View style={styles.statRow} wrap={false}>
        <StatTile label="Affiliate Leads" value={c.leads} prevValue={p.leads} />
        <StatTile label="Completed Deals" value={c.completed} prevValue={p.completed} />
        <StatTile label="Commission Owed" value={c.commission} prevValue={p.commission} isMoney />
        <StatTile label="New Affiliates" value={c.newAffiliates} prevValue={p.newAffiliates} />
      </View>

      <Text style={{ fontSize: 9, color: '#555', marginBottom: 8, fontStyle: 'italic' }}>
        {commentary}
      </Text>

      {top.length > 0 && (
        <TableBlock title="Top Affiliates This Month">
          <DataTable colWidths="40% 20% 20% 20%" columns={topColumns} rows={top} />
        </TableBlock>
      )}

      <TableBlock title="Affiliate Pipeline (This Month)">
        <DataTable colWidths="70% 30%" columns={pipelineColumns} rows={pipelineRows} />
      </TableBlock>

      <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 6 }}>
        Completed deals and commissions are attributed by lead-creation date, consistent with the affiliate portal. Commission uses each affiliate's own agreed rate per completed deal.
      </Text>
    </View>
  );
}

// ──── Section: Social Media ────
function SocialSection({ social }) {
  if (!social || social.available === false) {
    return (
      <View>
        <SectionTitle>Social Media</SectionTitle>
        <MutedPanel>
          Social media is not connected yet for this period.
        </MutedPanel>
      </View>
    );
  }

  const c = social.current || {};
  const p = social.previous || {};
  const ct = c.totals || {};
  const pt = p.totals || {};

  const platforms = buildPlatformRows(c.perPlatform, p.perPlatform);
  const totalEng = (ct.likes || 0) + (ct.comments || 0) + (ct.shares || 0);

  return (
    <View>
      <SectionTitle>Social Media</SectionTitle>

      {/* Headline tiles */}
      <View style={styles.statRow} wrap={false}>
        <StatTile label="Posts Published" value={c.postsPublished} prevValue={p.postsPublished} />
        <StatTile label="Total Engagement" value={totalEng} prevValue={(pt.likes || 0) + (pt.comments || 0) + (pt.shares || 0)} />
        <StatTile label="Shares" value={ct.shares} prevValue={pt.shares} />
        <StatTile label="Comments" value={ct.comments} prevValue={pt.comments} />
        <StatTile label="Link Clicks" value={ct.clicks} prevValue={pt.clicks} />
        <StatTile label="Video Views" value={ct.video_views} prevValue={pt.video_views} />
        {c.pageReach != null && (
          <StatTile label="Reach (page-wide)" value={c.pageReach} prevValue={p.pageReach} />
        )}
      </View>

      {/* Commentary */}
      <Text style={{ fontSize: 9, color: '#555', marginBottom: 8, fontStyle: 'italic' }}>
        {(() => {
          if ((c.postsPublished || 0) === 0) return "No posts were published in this period.";
          if (totalEng === 0) return `${c.postsPublished} posts published. Engagement is still accumulating for this period.`;
          return `${c.postsPublished} posts published, earning ${totalEng} total engagements${
            c.topPosts && c.topPosts[0]
              ? ` — top post: "${cleanCaption(c.topPosts[0].caption)}" (${c.topPosts[0].engagement} engagements)`
              : ''
          }.`;
        })()}
      </Text>

      {/* Top posts */}
      {c.topPosts && c.topPosts.length > 0 && (
        <TableBlock title="Top Posts This Month">
          <DataTable
            colWidths="7% 51% 14% 14% 14%"
            columns={[
              { header: '#', key: 'rank' },
              { header: 'Post', key: 'caption', render: (row) => cleanCaption(row.caption) || '(no caption)' },
              {
                header: 'Platform',
                key: 'platform',
                render: (row) =>
                  (row.platforms || [])
                    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join(', '),
              },
              { header: 'Shares', key: 'shares', align: 'right' },
              { header: 'Eng.', key: 'engagement', align: 'right' },
            ]}
            rows={c.topPosts.map((tp, i) => ({
              rank: String(i + 1),
              caption: tp.caption,
              platforms: tp.platforms,
              shares: tp.shares,
              engagement: tp.engagement,
            }))}
          />
        </TableBlock>
      )}

      {/* Per-platform table */}
      {platforms.length > 0 && (
        <TableBlock title="By Platform">
          <DataTable
            columns={[
              { header: 'Platform', key: 'name' },
              { header: 'Shares', key: 'shares', align: 'right' },
              { header: 'Engagement', key: 'engagement', align: 'right' },
              {
                header: 'Change',
                key: 'delta',
                align: 'right',
                color: (row) => deltaColor(row.cEng, row.pEng),
                render: (row) => deltaPct(row.cEng, row.pEng),
              },
            ]}
            colWidths="30% 25% 25% 20%"
            rows={platforms}
          />
        </TableBlock>
      )}

      <Text style={{ fontSize: 7, color: '#9ca3af', marginTop: 6 }}>
        Note: Meta no longer provides per-post reach or impressions (platform change, June 2026). Engagement,
        link clicks and video views are reported per post; "Reach (page-wide)" is a Facebook Page-level figure
        (28-day unique reach), not a per-post number.
      </Text>
    </View>
  );
}

// Shared delta helpers for table "Change" columns — keep colour + text in sync.
function deltaPct(curr, prev) {
  if (!prev) return Number(curr) > 0 ? "NEW" : "—";
  const pct = ((Number(curr) - Number(prev)) / Number(prev)) * 100;
  return `${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(0)}%`;
}

function deltaColor(curr, prev) {
  if (!prev) return Number(curr) > 0 ? GREEN : GREY;
  return Number(curr) - Number(prev) >= 0 ? GREEN : RED;
}

function buildPlatformRows(current, previous) {
  const all = new Set([
    ...Object.keys(current || {}),
    ...Object.keys(previous || {}),
  ]);
  return Array.from(all).map((name) => {
    const cc = current?.[name] || {};
    const pp = previous?.[name] || {};
    const cEng = (cc.likes || 0) + (cc.comments || 0) + (cc.shares || 0);
    const pEng = (pp.likes || 0) + (pp.comments || 0) + (pp.shares || 0);
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      shares: formatNumber(cc.shares),
      engagement: formatNumber(cEng),
      cEng,
      pEng,
    };
  });
}

// ──── Main Document ────
export default function MonthlyReport({ data, monthLabel, logo }) {
  if (!data) return null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cover band */}
        <View style={styles.coverBand}>
          {logo ? (
            <Image src={logo} style={styles.coverLogo} />
          ) : (
            <Text style={[styles.coverTitle, { fontSize: 16 }]}>
              EVEREST MOTORING
            </Text>
          )}
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.coverTitle}>Monthly Performance Report</Text>
            <Text style={styles.coverSub}>{data.monthLabel}</Text>
            <Text style={styles.coverSub}>
              compared to {data.prevLabel}
            </Text>
          </View>
        </View>

        {/* Sections — each major section starts on its own page (break).
            Website Activity and Social Media were explicitly requested on
            their own pages; breaking before every section keeps each one
            self-contained. */}
        <TrafficSection ga={data.ga} />
        <View break>
          <ActivitySection website={data.website} emails={data.emails} />
        </View>
        <View break>
          <AffiliateSection affiliates={data.affiliates} />
        </View>
        <View break>
          <SocialSection social={data.social} />
        </View>

        <ReportFooter />
      </Page>
    </Document>
  );
}
