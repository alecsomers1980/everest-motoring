# GA4 Data API — one-time setup (you do this, ~15 min)

The website already **sends** data to Google Analytics (the `G-XXXX` measurement ID in
`NEXT_PUBLIC_GA_ID`). To **read** that data back out for the monthly report we need the
**GA4 Data API**, which is a separate thing: a Google Cloud *service account* that is given
*Viewer* access to the GA4 property. Code can't create this — it needs your Google login.

Do these steps once, paste two values into the env file, and the GA section of the report
turns on. Nothing here costs money (the Data API is free).

---

## Step 1 — Find your GA4 **Property ID** (numeric)

This is **not** the `G-XXXXXXXXXX` measurement ID. It's a number like `123456789`.

1. Go to <https://analytics.google.com> and pick the Everest Motoring property.
2. Click **Admin** (gear, bottom-left).
3. Under the **Property** column → **Property Settings**.
4. Copy the **Property ID** shown at the top right (a number).

➡️ Save it. This becomes `GA4_PROPERTY_ID`.

---

## Step 2 — Create a Google Cloud project + service account

1. Go to <https://console.cloud.google.com>.
2. Top bar → project dropdown → **New Project** → name it `everest-reports` → **Create**.
   (If you already have a project you're happy to use, skip this.)
3. With that project selected, open
   <https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com>
   and click **Enable** (this turns on the "Google Analytics Data API").
4. Go to **APIs & Services → Credentials**
   (<https://console.cloud.google.com/apis/credentials>).
5. **Create Credentials → Service account**.
   - Name: `everest-report-reader` → **Create and Continue**.
   - Role: skip (leave blank) → **Continue** → **Done**.
6. You'll land back on the Credentials list. Click the new service account
   (`everest-report-reader@…iam.gserviceaccount.com`).
7. **Keys** tab → **Add Key → Create new key → JSON → Create**.
   A `.json` file downloads. **Keep it safe — this is a password.**

➡️ Also **copy the service account email** (ends in `.iam.gserviceaccount.com`). You need it
in Step 3.

---

## Step 3 — Give the service account access to the GA4 property

1. Back in <https://analytics.google.com> → **Admin**.
2. Property column → **Property Access Management**.
3. **+** (top right) → **Add users**.
4. Paste the service-account email from Step 2.
5. Role: **Viewer** (that's all it needs).
6. Untick "Notify new users by email" → **Add**.

---

## Step 4 — Put the two values into the env file

Open `.env.local` (and add the same to Vercel → Project → Settings → Environment Variables
for production). Add:

```bash
# Numeric property ID from Step 1
GA4_PROPERTY_ID=123456789

# The ENTIRE contents of the JSON key file from Step 2, on one line.
# Easiest: open the .json in a text editor, copy everything, paste it between the quotes.
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"...", ... }'
```

> **Note on the JSON value:** keep it as a single-quoted one-liner. The code parses it with
> `JSON.parse`. Do **not** commit the real value to git — `.env.local` is already gitignored.
> In Vercel, paste the JSON as the value of `GOOGLE_APPLICATION_CREDENTIALS_JSON` (the Vercel
> UI handles the newlines fine).

---

## Done

Tell the build (task R2) these two env vars exist. To sanity-check before the full report is
wired, you can hit the debug route the build adds:
`/api/admin/reports/ga-test` — it should return last-30-days users/sessions as JSON.

If it errors with `403 PERMISSION_DENIED`, the service account wasn't added to the property
(redo Step 3). If `INVALID_ARGUMENT`, the `GA4_PROPERTY_ID` is wrong (it must be the numeric
one, not `G-XXXX`).
