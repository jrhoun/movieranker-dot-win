import { beforeEach, describe, expect, it, vi } from "vitest";

let currentDb: { client: unknown; row?: unknown | null };

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

function makeDb(opts: { user?: { id: string } | null }) {
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from() {
      const obj: Record<string, unknown> = {};
      obj.select = () => obj;
      obj.eq = () => obj;
      obj.maybeSingle = async () => ({ data: currentDb.row ?? null, error: null });
      return obj;
    },
  };
  return { client };
}

beforeEach(() => {
  vi.resetModules();
  currentDb = { ...makeDb({ user: { id: "u-1" } }), row: null };
});

async function get(handle: string) {
  const { GET } = await import("./route");
  return GET(new Request(`http://x/api/profile/availability?handle=${encodeURIComponent(handle)}`));
}

describe("GET /api/profile/availability", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = { ...makeDb({ user: null }), row: null };
    expect((await get("abc")).status).toBe(401);
  });

  it("unavailable with reason for invalid and reserved", async () => {
    await expect((await get("ab")).json()).resolves.toEqual({
      available: false,
      reason: "invalid",
    });
    await expect((await get("admin")).json()).resolves.toEqual({
      available: false,
      reason: "reserved",
    });
  });

  it("available when no profile holds the handle", async () => {
    const res = await get("moviebuff-7");
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ available: true });
  });

  it("unavailable 'taken' when the handle exists", async () => {
    currentDb.row = { id: "someone-else" };
    await expect((await get("taken")).json()).resolves.toEqual({
      available: false,
      reason: "taken",
    });
  });
});
