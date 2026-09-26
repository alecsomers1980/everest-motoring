// Google Business Profile — one-time setup helper
// ================================================
// This script helps you:
//   1. Get an OAuth refresh token with the business.manage scope
//   2. Discover your GBP account ID and location ID
//
// Prerequisites (do these first in Google Cloud Console):
//   https://console.cloud.google.com
//
//   a) Create a project (or use an existing one)
//   b) Enable the "Business Profile API"
//   c) Create OAuth 2.0 credentials (Web application type)
//      - Add http://localhost:3001/oauth2callback as a redirect URI
//   d) Copy the Client ID and Client Secret below
//
// Run:  node scripts/gbp-setup.js
//       Then open http://localhost:3001 in your browser.

const http = require("http");
const { URLSearchParams } = require("url");
const fs = require("fs");
const path = require("path");

// ── CONFIGURE THESE ──────────────────────────────────
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
// ─────────────────────────────────────────────────────

const PORT = 3001;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/business.manage"];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

if (CLIENT_ID.startsWith("YOUR_")) {
    console.log(
        "Edit this script and set CLIENT_ID and CLIENT_SECRET from Google Cloud Console.\n" +
        "Or set them as env vars: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET"
    );
    process.exit(1);
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === "/") {
        // Step 1: Show the authorization URL
        const authUrl =
            "https://accounts.google.com/o/oauth2/v2/auth?" +
            new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                response_type: "code",
                access_type: "offline",
                prompt: "consent",
                scope: SCOPES.join(" "),
            }).toString();

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`<!DOCTYPE html>
<html><head><title>GBP Setup</title></head><body style="font-family:sans-serif;max-width:700px;margin:50px auto">
<h2>Google Business Profile — Setup</h2>
<ol>
  <li>Click the link below to authorize</li>
  <li>After redirect, refresh token + account info will appear below</li>
</ol>
<a href="${authUrl}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
  Authorize with Google
</a>
</body></html>`);

    } else if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        if (error) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end(`Authorization error: ${error}`);
            return;
        }

        if (!code) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end("No authorization code received.");
            return;
        }

        try {
            // Exchange code for tokens
            const tokenRes = await fetch(TOKEN_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    code,
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    redirect_uri: REDIRECT_URI,
                    grant_type: "authorization_code",
                }),
            });
            const tokenData = await tokenRes.json();

            if (!tokenRes.ok) {
                throw new Error(JSON.stringify(tokenData, null, 2));
            }

            const accessToken = tokenData.access_token;
            const refreshToken = tokenData.refresh_token;

            // Discover accounts
            let accountsHtml = "";
            try {
                const acctRes = await fetch(
                    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                const acctData = await acctRes.json();
                if (acctData.accounts) {
                    accountsHtml = "<h3>Your GBP Accounts</h3><table border='1' cellpadding='8' style='border-collapse:collapse'>";
                    accountsHtml += "<tr><th>Account Name</th><th>Account ID</th><th>Locations</th></tr>";

                    for (const acct of acctData.accounts) {
                        const acctId = acct.name.split("/").pop();
                        let locations = "";
                        try {
                            const locRes = await fetch(
                                `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${acctId}/locations?readMask=name,title`,
                                { headers: { Authorization: `Bearer ${accessToken}` } }
                            );
                            const locData = await locRes.json();
                            if (locData.locations) {
                                locations = locData.locations
                                    .map((l) => `<b>${l.title}</b> (ID: <code>${l.name.split("/").pop()}</code>)`)
                                    .join("<br>");
                            }
                        } catch { locations = "(could not fetch)"; }
                        accountsHtml += `<tr><td>${acct.accountName}</td><td><code>${acctId}</code></td><td>${locations}</td></tr>`;
                    }
                    accountsHtml += "</table>";
                }
            } catch (err) {
                accountsHtml = `<p style="color:#999">Could not fetch accounts: ${err.message}</p>`;
            }

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`<!DOCTYPE html>
<html><head><title>GBP Setup Complete</title></head><body style="font-family:sans-serif;max-width:800px;margin:50px auto">
<h2>GBP Setup — Success</h2>
<p>Add these to your <code>.env.local</code> and Vercel environment variables:</p>
<pre style="background:#f5f5f5;padding:16px;border-radius:6px;overflow-x:auto">
GOOGLE_CLIENT_ID=${CLIENT_ID}
GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}
GOOGLE_REFRESH_TOKEN=${refreshToken || "(no refresh token — re-authorize with prompt=consent)"}
GBP_ACCOUNT_ID=<em>copy from table below</em>
GBP_LOCATION_ID=<em>copy from table below</em>
</pre>
${accountsHtml}
<p style="margin-top:20px;color:#666">You can close this window now.</p>
</body></html>`);

            // Also print to console
            console.log("\n=== GBP SETUP COMPLETE ===\n");
            console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
            if (refreshToken) {
                console.log("\nAdd these env vars to .env.local and Vercel production:");
                console.log(`GOOGLE_REFRESH_TOKEN=${refreshToken}`);
                console.log("GBP_ACCOUNT_ID=<from the table above>");
                console.log("GBP_LOCATION_ID=<from the table above>");
            }
        } catch (err) {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Token exchange failed:\n" + err.message);
        }
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(PORT, () => {
    console.log(`\nGBP Setup helper running at http://localhost:${PORT}\n`);
    console.log(`Open that URL in your browser to start.\n`);
});
