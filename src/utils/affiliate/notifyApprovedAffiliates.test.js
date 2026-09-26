import { describe, it, expect, vi, beforeEach } from "vitest";

let mockCar = null;
let mockAffiliates = [];
let mockAffiliatesError = null;
let mockEmailsById = {};
const sendEmailCalls = [];
let sendEmailResults = [];

function makeQueryBuilder(result) {
    const builder = {
        select: () => builder,
        eq: () => builder,
        not: () => builder,
        maybeSingle: async () => result,
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return builder;
}

vi.mock("@/utils/supabase/server", () => ({
    createAdminClient: async () => ({
        from: (table) => {
            if (table === "cars") return makeQueryBuilder({ data: mockCar, error: null });
            if (table === "profiles") return makeQueryBuilder({ data: mockAffiliates, error: mockAffiliatesError });
            throw new Error(`Unexpected table: ${table}`);
        },
        auth: {
            admin: {
                getUserById: async (id) => {
                    const email = mockEmailsById[id];
                    return email ? { data: { user: { email } }, error: null } : { data: { user: null }, error: { message: "not found" } };
                },
            },
        },
    }),
}));

vi.mock("@/lib/resend", () => ({
    sendEmail: async (args) => {
        sendEmailCalls.push(args);
        return sendEmailResults.shift() ?? { success: true };
    },
}));

const { notifyApprovedAffiliates } = await import("./notifyApprovedAffiliates");

beforeEach(() => {
    mockCar = {
        id: "car-1",
        make: "Toyota",
        model: "Hilux",
        year: 2024,
        price: 749900,
        mileage: 12500,
        main_image_url: "https://example.com/hilux.jpg",
        video_url: null,
    };
    mockAffiliates = [];
    mockAffiliatesError = null;
    mockEmailsById = {};
    sendEmailCalls.length = 0;
    sendEmailResults = [];
    process.env.NEXT_PUBLIC_SITE_URL = "https://everestmotoring.co.za";
});

describe("notifyApprovedAffiliates", () => {
    it("returns Car not found when the car doesn't exist", async () => {
        mockCar = null;
        const result = await notifyApprovedAffiliates("missing");
        expect(result).toEqual({ success: false, error: "Car not found", notified: 0 });
        expect(sendEmailCalls).toHaveLength(0);
    });

    it("emails every approved affiliate with their own tracking ref", async () => {
        mockAffiliates = [
            { id: "a1", first_name: "Jane", affiliate_code: "JANEAB12" },
            { id: "a2", first_name: "Sam", affiliate_code: "SAMCD34" },
        ];
        mockEmailsById = { a1: "jane@example.com", a2: "sam@example.com" };
        sendEmailResults = [{ success: true }, { success: true }];

        const result = await notifyApprovedAffiliates("car-1");

        expect(result).toEqual({ success: true, notified: 2 });
        expect(sendEmailCalls).toHaveLength(2);
        expect(sendEmailCalls[0].to).toBe("jane@example.com");
        expect(sendEmailCalls[1].to).toBe("sam@example.com");
    });

    it("continues sending to the rest when one affiliate's send fails", async () => {
        mockAffiliates = [
            { id: "a1", first_name: "Jane", affiliate_code: "JANEAB12" },
            { id: "a2", first_name: "Sam", affiliate_code: "SAMCD34" },
        ];
        mockEmailsById = { a1: "jane@example.com", a2: "sam@example.com" };
        sendEmailResults = [{ success: false, error: "bounced" }, { success: true }];

        const result = await notifyApprovedAffiliates("car-1");

        expect(result).toEqual({ success: true, notified: 1 });
        expect(sendEmailCalls).toHaveLength(2);
    });

    it("skips an affiliate whose auth user has no email, and still notifies the rest", async () => {
        mockAffiliates = [
            { id: "a1", first_name: "Jane", affiliate_code: "JANEAB12" },
            { id: "a2", first_name: "Sam", affiliate_code: "SAMCD34" },
        ];
        mockEmailsById = { a2: "sam@example.com" };
        sendEmailResults = [{ success: true }];

        const result = await notifyApprovedAffiliates("car-1");

        expect(result).toEqual({ success: true, notified: 1 });
        expect(sendEmailCalls).toHaveLength(1);
        expect(sendEmailCalls[0].to).toBe("sam@example.com");
    });

    it("propagates an affiliates-query error without sending anything", async () => {
        mockAffiliatesError = { message: "db exploded" };
        const result = await notifyApprovedAffiliates("car-1");
        expect(result).toEqual({ success: false, error: "db exploded", notified: 0 });
        expect(sendEmailCalls).toHaveLength(0);
    });
});
