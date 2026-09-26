import { describe, it, expect, vi, beforeEach } from "vitest";

const notifyApprovedAffiliatesMock = vi.fn();

vi.mock("@/utils/affiliate/notifyApprovedAffiliates", () => ({
    notifyApprovedAffiliates: (...args) => notifyApprovedAffiliatesMock(...args),
}));

const { POST } = await import("./route");

function makeRequest(body, headers = {}) {
    const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    return {
        headers: { get: (key) => lower[key.toLowerCase()] ?? null },
        json: async () => body,
    };
}

beforeEach(() => {
    notifyApprovedAffiliatesMock.mockReset();
    process.env.AFFILIATE_NOTIFY_SECRET = "test-secret";
});

describe("POST /api/affiliate/notify-approved", () => {
    it("rejects a request with a missing or wrong bearer secret", async () => {
        const res = await POST(makeRequest({ carId: "car-1" }, { authorization: "Bearer wrong" }));
        expect(res.status).toBe(401);
        expect(notifyApprovedAffiliatesMock).not.toHaveBeenCalled();
    });

    it("requires carId", async () => {
        const res = await POST(makeRequest({}, { authorization: "Bearer test-secret" }));
        expect(res.status).toBe(400);
        expect(notifyApprovedAffiliatesMock).not.toHaveBeenCalled();
    });

    it("delegates to notifyApprovedAffiliates and returns its result", async () => {
        notifyApprovedAffiliatesMock.mockResolvedValue({ success: true, notified: 2 });

        const res = await POST(makeRequest({ carId: "car-1" }, { authorization: "Bearer test-secret" }));
        const body = await res.json();

        expect(notifyApprovedAffiliatesMock).toHaveBeenCalledWith("car-1");
        expect(body).toEqual({ success: true, notified: 2 });
    });

    it("returns 404 when the car isn't found", async () => {
        notifyApprovedAffiliatesMock.mockResolvedValue({ success: false, error: "Car not found", notified: 0 });

        const res = await POST(makeRequest({ carId: "missing" }, { authorization: "Bearer test-secret" }));

        expect(res.status).toBe(404);
    });

    it("returns 500 for any other failure", async () => {
        notifyApprovedAffiliatesMock.mockResolvedValue({ success: false, error: "db exploded", notified: 0 });

        const res = await POST(makeRequest({ carId: "car-1" }, { authorization: "Bearer test-secret" }));

        expect(res.status).toBe(500);
    });
});
