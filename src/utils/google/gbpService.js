const GBP_API_BASE = "https://mybusiness.googleapis.com/v4";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function requireEnv() {
    const required = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN", "GBP_ACCOUNT_ID", "GBP_LOCATION_ID"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
        throw new Error(`Missing GBP env vars: ${missing.join(", ")}`);
    }
    return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accountId: process.env.GBP_ACCOUNT_ID,
        locationId: process.env.GBP_LOCATION_ID,
    };
}

let _cachedToken = null;
let _tokenExpiry = 0;

async function getAccessToken() {
    if (_cachedToken && Date.now() < _tokenExpiry - 60000) {
        return _cachedToken;
    }
    const { clientId, clientSecret, refreshToken } = requireEnv();

    const res = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GBP token refresh failed (${res.status}): ${text.slice(0, 300)}`);
    }

    const data = await res.json();
    _cachedToken = data.access_token;
    _tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
    return _cachedToken;
}

/**
 * Create a local post on the Google Business Profile listing.
 * Returns the created post object or null if GBP is not configured.
 */
export async function createLocalPost({ summary, callToAction, imageUrl, topicType = "STANDARD" }) {
    try {
        const { accountId, locationId } = requireEnv();
        const token = await getAccessToken();

        const body = {
            languageCode: "en-ZA",
            summary,
            topicType,
        };

        if (callToAction) {
            body.callToAction = callToAction;
        }

        if (imageUrl) {
            // GBP supports PHOTO and VIDEO media formats
            const isVideo = /\.(mp4|mov|webm)(\?|$)/i.test(imageUrl);
            body.media = [{
                mediaFormat: isVideo ? "VIDEO" : "PHOTO",
                sourceUrl: imageUrl,
            }];
        }

        const res = await fetch(
            `${GBP_API_BASE}/accounts/${accountId}/locations/${locationId}/localPosts`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error("[GBP] Failed to create post:", JSON.stringify(data));
            return null;
        }

        console.log("[GBP] Post created:", data.name);
        return data;
    } catch (err) {
        // GBP posting is best-effort — never throw to the caller
        if (err.message?.startsWith("Missing GBP env vars")) {
            console.log("[GBP] Skipping post — env vars not configured");
        } else {
            console.error("[GBP] Post creation error:", err.message);
        }
        return null;
    }
}

/**
 * Format and post a car listing to GBP as an OFFER post.
 */
export async function postCarToGbp(car) {
    if (!car || !car.id) return null;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
    const url = `${baseUrl}/inventory/${car.id}`;
    const price = car.price
        ? `R ${new Intl.NumberFormat("en-ZA").format(car.price)}`
        : "";

    const summary = [
        `Just in: ${car.year} ${car.make} ${car.model}`,
        price ? `${price}` : "",
        car.mileage ? `${new Intl.NumberFormat("en-ZA").format(car.mileage)} km` : "",
        car.transmission || "",
        car.fuel_type || "",
    ]
        .filter(Boolean)
        .join(" · ");

    const imageUrl = car.main_image_url ||
        car.images?.[0] ||
        car.video_url ||
        null;

    return createLocalPost({
        summary,
        callToAction: {
            actionType: "LEARN_MORE",
            url,
        },
        imageUrl,
        topicType: "OFFER",
    });
}

/**
 * Format and post a news article to GBP as a STANDARD post.
 */
export async function postNewsToGbp(article) {
    if (!article || !article.slug) return null;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://everestmotoring.co.za";
    const url = `${baseUrl}/news/${article.slug}`;

    const summary = article.excerpt || article.meta_description || article.title;

    return createLocalPost({
        summary: summary.slice(0, 1500),
        callToAction: {
            actionType: "LEARN_MORE",
            url,
        },
        imageUrl: article.hero_image_url || null,
        topicType: "STANDARD",
    });
}
