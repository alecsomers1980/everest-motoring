import { describe, it, expect, vi, beforeEach } from "vitest";

let mockCar = null;
let mockCarError = null;
const enableDownloadsMock = vi.fn();
const getMp4UrlMock = vi.fn();

vi.mock("@/utils/supabase/server", () => ({
    createAdminClient: async () => ({
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: async () => ({ data: mockCar, error: mockCarError }),
                }),
            }),
        }),
    }),
}));

vi.mock("@/utils/ai/cloudflareStreamService", () => ({
    enableDownloads: (...args) => enableDownloadsMock(...args),
    getMp4Url: (...args) => getMp4UrlMock(...args),
}));

const { GET } = await import("./route");

function makeRequest(query = "") {
    return new Request(`https://everestmotoring.co.za/api/affiliate/video-download/car-1${query}`);
}

beforeEach(() => {
    mockCar = { id: "car-1", make: "Toyota", model: "Land Cruiser 79 4.2D P/U S/C", year: 2020, video_url: "cf:abc123" };
    mockCarError = null;
    enableDownloadsMock.mockReset();
    getMp4UrlMock.mockReset();
    getMp4UrlMock.mockReturnValue("https://videodelivery.net/abc123/downloads/default.mp4");
    global.fetch = vi.fn();
});

describe("GET /api/affiliate/video-download/[carId]", () => {
    it("returns 404 when the car isn't found (non-redirect)", async () => {
        mockCar = null;
        const res = await GET(makeRequest(), { params: Promise.resolve({ carId: "car-1" }) });
        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body).toEqual({ ready: false, error: "Car not found" });
    });

    it("returns 404 when the car isn't found (redirect)", async () => {
        mockCar = null;
        const res = await GET(makeRequest("?redirect=1"), { params: Promise.resolve({ carId: "car-1" }) });
        expect(res.status).toBe(404);
    });

    it("returns not-ready when the car has no Cloudflare video", async () => {
        mockCar.video_url = null;
        const res = await GET(makeRequest(), { params: Promise.resolve({ carId: "car-1" }) });
        const body = await res.json();
        expect(body.ready).toBe(false);
    });

    it("non-redirect: points at our own proxy URL rather than Cloudflare's", async () => {
        enableDownloadsMock.mockResolvedValue({});
        const res = await GET(makeRequest(), { params: Promise.resolve({ carId: "car-1" }) });
        const body = await res.json();
        expect(body).toEqual({ ready: true, url: "/api/affiliate/video-download/car-1?redirect=1" });
    });

    it("redirect: streams the video with a sanitized Content-Disposition filename", async () => {
        enableDownloadsMock.mockResolvedValue({});
        global.fetch.mockResolvedValue({
            ok: true,
            body: new ReadableStream(),
            headers: new Headers({ "content-length": "12345" }),
        });

        const res = await GET(makeRequest("?redirect=1"), { params: Promise.resolve({ carId: "car-1" }) });

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("video/mp4");
        // "P/U S/C" must not leak a literal "/" into the filename
        expect(res.headers.get("Content-Disposition")).toBe(
            'attachment; filename="2020-Toyota-Land-Cruiser-79-4-2D-P-U-S-C.mp4"'
        );
        expect(res.headers.get("Content-Length")).toBe("12345");
    });

    it("redirect: returns 502 when Cloudflare's file isn't fetchable", async () => {
        enableDownloadsMock.mockResolvedValue({});
        global.fetch.mockResolvedValue({ ok: false, body: null, headers: new Headers() });

        const res = await GET(makeRequest("?redirect=1"), { params: Promise.resolve({ carId: "car-1" }) });
        expect(res.status).toBe(502);
    });

    it("redirect: returns 500 with the error message when enableDownloads throws", async () => {
        enableDownloadsMock.mockRejectedValue(new Error("timed out"));

        const res = await GET(makeRequest("?redirect=1"), { params: Promise.resolve({ carId: "car-1" }) });
        expect(res.status).toBe(500);
        const text = await res.text();
        expect(text).toContain("timed out");
    });
});
