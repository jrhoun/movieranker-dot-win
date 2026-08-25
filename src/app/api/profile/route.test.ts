import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };
type DbResult = { data?: unknown; error?: { code?: string; message: string } | null };

let currentDb: {
  client: unknown;
  calls: Call[];
  row?: unknown | null;
  writeResult?: DbResult;
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

function makeDb(opts: { user?: { id: string } | null }) {
  const calls: Call[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      const obj: Record<string, unknown> = {};
      const track = (method: string) => (...args: unknown[]) => {
        calls.push({ table, method, args });
        return obj;
      };
      obj.select = track("select");
      obj.eq = track("eq");
      obj.update = track("update");
      // Terminal ops resolve with the configured result.
      obj.maybeSingle = async () => currentDb.writeResult ?? { data: currentDb.row ?? null, error: null };
      obj.upsert = async (...args: unknown[]) => {
        calls.push({ table, method: "upsert", args });
        return currentDb.writeResult ?? { data: null, error: null };
      };
      return obj;
    },
  };
  return { client, calls };
}

beforeEach(() => {
  vi.resetModules();
  currentDb = { ...makeDb({ user: { id: "u-1" } }), row: null };
});

describe("GET /api/profile", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = { ...makeDb({ user: null }), row: null };
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns handle + visibility for the claimed profile", async () => {
    currentDb.row = { handle: "moviebuff-7", visibility: "public" };
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      handle: "moviebuff-7",
      visibility: "public",
    });
  });

  it("defaults to null handle / private visibility when unclaimed", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    await expect(res.json()).resolves.toEqual({ handle: null, visibility: "private" });
  });
});

describe("POST /api/profile", () => {
  async function post(handle: unknown) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://x/api/profile", {
        method: "POST",
        body: JSON.stringify({ handle }),
      }),
    );
  }

  it("returns 401 when unauthenticated", async () => {
    currentDb = { ...makeDb({ user: null }), row: null };
    expect((await post("abc")).status).toBe(401);
  });

  it("400 on invalid shape and reserved names", async () => {
    expect((await post("ab")).status).toBe(400);
    expect((await post("has space!!")).status).toBe(400);
    expect((await post("API")).status).toBe(400);
    expect((await post(null)).status).toBe(400);
  });

  it("409 when the handle is taken (unique violation)", async () => {
    currentDb.writeResult = { error: { code: "23505", message: "duplicate key" } };
    const res = await post("taken-handle");
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/taken/);
  });

  it("happy path upserts normalized handle keyed on id", async () => {
    const res = await post("  MovieBuff-7 ");
    expect(res.status).toBe(201);
    const upsert = currentDb.calls.find((c) => c.method === "upsert")!;
    expect(upsert.args[0]).toEqual({
      id: "u-1",
      handle: "moviebuff-7",
    });
    expect((upsert.args[1] as { onConflict: string }).onConflict).toBe("id");
  });

  it("500 surfaces non-conflict db errors", async () => {
    currentDb.writeResult = { error: { message: "boom" } };
    expect((await post("fine-handle-1")).status).toBe(500);
  });

  it("rate-limits claim attempts, counting failures too", async () => {
    // LIMITS.claimHandle = 5/hour; every failed validation still counts.
    for (let i = 0; i < 5; i++) {
      expect((await post("ab")).status).toBe(400);
    }
    const res = await post("still-valid-but-blocked");
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("PATCH /api/profile", () => {
  async function patch(visibility: unknown) {
    const { PATCH } = await import("./route");
    return PATCH(
      new Request("http://x/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ visibility }),
      }),
    );
  }

  it("returns 401 when unauthenticated", async () => {
    currentDb = { ...makeDb({ user: null }), row: null };
    expect((await patch("public")).status).toBe(401);
  });

  it("400 on bad visibility values", async () => {
    expect((await patch("unlisted")).status).toBe(400);
    expect((await patch(42)).status).toBe(400);
  });

  it("409 'claim a handle first' when no profiles row exists", async () => {
    const res = await patch("public");
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("claim a handle first");
  });

  it("happy path updates visibility on the owned row", async () => {
    currentDb.writeResult = { data: { id: "u-1" }, error: null };
    const res = await patch("public");
    expect(res.status).toBe(200);
    const upd = currentDb.calls.find((c) => c.method === "update")!;
    expect(upd.args[0]).toEqual({ visibility: "public" });
    const eq = currentDb.calls.find((c) => c.method === "eq")!;
    expect(eq.args).toEqual(["id", "u-1"]);
  });
});
