/**
 * Assembler — gathers data from all modules in parallel, builds the report
 * data object, and renders the PDF via @react-pdf/renderer.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { getMonthWindows } from "./period";
import { fetchGaReport } from "./ga";
import { fetchWebsiteActivity } from "./website";
import { fetchEmailStats } from "./emails";
import { fetchSocialReport } from "./social";
import { fetchAffiliateReport } from "./affiliates";

let _logoDataUrl = null;

function getLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  const logoPath = join(process.cwd(), "public", "images", "logo.png");
  const buf = readFileSync(logoPath);
  _logoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return _logoDataUrl;
}

/**
 * Build the full report data object for a given month string ("YYYY-MM").
 * Fetches all four modules in parallel via Promise.allSettled so one failure
 * doesn't kill the whole report.
 */
export async function buildReportData(month) {
  const { monthLabel, prevLabel, curr, prev } = getMonthWindows(month);

  const [ga, website, emails, social, affiliates] = await Promise.allSettled([
    fetchGaReport({ curr, prev }),
    fetchWebsiteActivity({ curr, prev }),
    fetchEmailStats({ curr, prev }),
    fetchSocialReport({ month }),
    fetchAffiliateReport({ curr, prev }),
  ]);

  return {
    monthLabel,
    prevLabel,
    ga: ga.status === "fulfilled" ? ga.value : { available: false, error: "Module failed" },
    website:
      website.status === "fulfilled"
        ? website.value
        : { current: {}, previous: {}, error: "Module failed" },
    emails:
      emails.status === "fulfilled"
        ? emails.value
        : { available: false, error: "Module failed" },
    social:
      social.status === "fulfilled"
        ? social.value
        : { available: false, error: "Module failed" },
    affiliates:
      affiliates.status === "fulfilled"
        ? affiliates.value
        : { available: false, error: "Module failed" },
  };
}

/**
 * Render the MonthlyReport PDF to a Buffer.
 * Returns { buffer, monthLabel, filename } or throws on error.
 */
export async function renderReportPdf(month) {
  const data = await buildReportData(month);
  const { default: React } = await import("react");
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { default: MonthlyReport } = await import("./MonthlyReport");

  const logo = getLogoDataUrl();

  const doc = React.createElement(MonthlyReport, {
    data,
    monthLabel: data.monthLabel,
    logo,
  });

  const buffer = await renderToBuffer(doc);
  const filename = `Everest-Report-${month || new Date().toISOString().slice(0, 7)}.pdf`;

  return { buffer, monthLabel: data.monthLabel, filename };
}
