import { describe, it, expect, vi, beforeEach } from "vitest";

// Who is signed in, what the next admin query resolves to, and what it was asked.
const state = { user: null, role: null, result: null };
let calls = [];

// Chainable stand-in for a Supabase query builder; awaiting it resolves to state.result.
function query(table) {
    const q = {
        select: () => q,
        order: () => q,
        single: () => q,
        eq: (...args) => (calls.push(["eq", ...args]), q),
        insert: (row) => (calls.push(["insert", table, row]), q),
        update: (row) => (calls.push(["update", table, row]), q),
        delete: () => (calls.push(["delete", table]), q),
        then: (resolve, reject) => Promise.resolve(state.result).then(resolve, reject),
    };
    return q;
}

vi.mock("@/utils/supabase/server", () => ({
    createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: state.user } }) },
        from: () => ({
            select: () => ({ eq: () => ({ single: async () => ({ data: state.user ? { role: state.role } : null }) }) }),
        }),
    }),
    createAdminClient: async () => ({ from: (table) => query(table) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { listFinanceHouses, saveFinanceHouse, deleteFinanceHouse } = await import("./actions");

beforeEach(() => {
    state.user = { id: "u1" };
    state.role = "admin";
    state.result = { data: [], error: null };
    calls = [];
});

describe("finance house actions", () => {
    it("refuse signed-out users", async () => {
        state.user = null;
        await expect(listFinanceHouses()).rejects.toThrow("Unauthorized");
        await expect(saveFinanceHouse({ name: "Test Bank" })).rejects.toThrow("Unauthorized");
        await expect(deleteFinanceHouse("fh-1")).rejects.toThrow("Unauthorized");
        expect(calls).toEqual([]);
    });

    it("refuse users who aren't admins", async () => {
        state.role = "affiliate";
        await expect(listFinanceHouses()).rejects.toThrow("Admins only");
        await expect(saveFinanceHouse({ name: "Test Bank" })).rejects.toThrow("Admins only");
        await expect(deleteFinanceHouse("fh-1")).rejects.toThrow("Admins only");
        expect(calls).toEqual([]);
    });

    it("lists finance houses", async () => {
        state.result = { data: [{ id: "fh-1", name: "Test Bank" }], error: null };
        expect(await listFinanceHouses()).toEqual({ houses: [{ id: "fh-1", name: "Test Bank" }], missingTable: false });
    });

    it("reports a missing table instead of failing", async () => {
        state.result = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
        expect(await listFinanceHouses()).toEqual({ houses: [], missingTable: true });
    });

    it("requires a name", async () => {
        expect(await saveFinanceHouse({ name: "   " })).toEqual({ error: "Name is required." });
        expect(calls).toEqual([]);
    });

    it("inserts a cleaned row for a new finance house", async () => {
        state.result = { data: { id: "fh-1", name: "Test Bank" }, error: null };
        const result = await saveFinanceHouse({ name: " Test Bank ", id_type: "business_reg", email: "", bogus: "x" });
        expect(result).toEqual({ house: { id: "fh-1", name: "Test Bank" } });
        const [, table, row] = calls.find((c) => c[0] === "insert");
        expect(table).toBe("finance_houses");
        expect(row).toMatchObject({ name: "Test Bank", id_type: "business_reg", email: null });
        expect(row).not.toHaveProperty("bogus");
    });

    it("updates an existing finance house by id", async () => {
        state.result = { data: { id: "fh-1", name: "Test Bank" }, error: null };
        await saveFinanceHouse({ id: "fh-1", name: "Test Bank" });
        expect(calls.some((c) => c[0] === "update")).toBe(true);
        expect(calls).toContainEqual(["eq", "id", "fh-1"]);
    });

    it("deletes by id", async () => {
        state.result = { error: null };
        await deleteFinanceHouse("fh-1");
        expect(calls).toEqual([["delete", "finance_houses"], ["eq", "id", "fh-1"]]);
    });
});
