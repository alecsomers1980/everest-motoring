/**
 * Date-helper for the monthly report.
 *
 * getMonthWindows(month?) accepts an optional "YYYY-MM" string (defaults to the
 * last completed month) and returns:
 *
 *   { monthLabel, prevLabel, curr: { start, end }, prev: { start, end } }
 *
 * All dates are computed in Africa/Johannesburg timezone.  start/end are
 * "YYYY-MM-DD" strings.
 */

const TZ = "Africa/Johannesburg";

function fmtDate(d) {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA gives YYYY-MM-DD
}

// Exact SAST instant for the first day of a month, used as precise (timezone-aware)
// bounds for timestamptz DB queries — avoids the off-by-one-day / UTC-skew that
// date-only strings cause at month boundaries.
function firstInstantISO(year, month) {
  return `${year}-${String(month).padStart(2, "0")}-01T00:00:00+02:00`;
}

function firstOfMonth(year, month) {
  // Construct in SA timezone by formatting a UTC date that's close, then
  // adjusting.  Simpler: use string math.
  const m = String(month).padStart(2, "0");
  const firstDay = new Date(`${year}-${m}-01T00:00:00+02:00`);
  // Verify by re-parsing — the above constructor should work in modern Node
  return firstDay;
}

function lastOfMonth(year, month) {
  // Go to first day of next month, then back one day
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstOfNext = firstOfMonth(nextYear, nextMonth);
  const lastDay = new Date(firstOfNext.getTime() - 1);
  return lastDay;
}

export function getMonthWindows(monthStr) {
  let year, month;

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    [year, month] = monthStr.split("-").map(Number);
  } else {
    // Default: last completed month (current month minus 1)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
    });
    const [y, m] = formatter.format(now).split("-").map(Number);
    if (m === 1) {
      year = y - 1;
      month = 12;
    } else {
      year = y;
      month = m - 1;
    }
  }

  // Previous month
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;

  // Next month (exclusive upper bound for the current window)
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return {
    monthLabel: `${monthNames[month - 1]} ${year}`,
    prevLabel: `${monthNames[prevMonth - 1]} ${prevYear}`,
    curr: {
      // Date-only strings (inclusive) — for the GA4 Data API.
      start: `${year}-${String(month).padStart(2, "0")}-01`,
      end: fmtDate(lastOfMonth(year, month)),
      // Timezone-aware instants — for timestamptz DB / email queries. endExclusiveISO
      // is the first instant of next month, so use it with a strict `<` (start-inclusive,
      // end-exclusive).
      startISO: firstInstantISO(year, month),
      endExclusiveISO: firstInstantISO(nextYear, nextMonth),
    },
    prev: {
      start: `${prevYear}-${String(prevMonth).padStart(2, "0")}-01`,
      end: fmtDate(lastOfMonth(prevYear, prevMonth)),
      startISO: firstInstantISO(prevYear, prevMonth),
      endExclusiveISO: firstInstantISO(year, month), // exclusive end = start of curr month
    },
  };
}
