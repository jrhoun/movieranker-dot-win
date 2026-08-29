import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };
type DbResult = { data?: unknown; error?: { code?: string; message: string } | null };

let currentDb: {
  client: unknown;
  calls: Call[];
  row?: unknown | null;
  /** Per-table row override; falls back to `row`. */
  rowsByTable?: Record<string, unknown | null>;
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
      let isWrite = false;
      const track = (method: string) => (...args: unknown[]) => {
        calls.push({ table, method, args });
        return obj;
      };
      obj.select = track("select");
      obj.eq = track("eq");
      obj.update = (...args: unknown[]) => {
        isWrite = true;
        return track("update")(...args);
      };
      // Terminal ops resolve with the configured result; writes use
      // writeResult, reads fall back to the stored row.
      obj.maybeSingle = async () =>
        isWrite
          ? (currentDb.writeResult ?? { data: null, error: null })
          : { data: table in (currentDb.rowsByTable ?? {}) ? currentDb.rowsByTable![table] : (currentDb.row ?? null), error: null };
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

describe("PATCH /api/profile — showcase", () => {
  async function patchShowcase(showcase: unknown) {
    const { PATCH } = await import("./route");
    return PATCH(
      new Request("http://x/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ showcase }),
      }),
    );
  }

  it("400 on malformed showcase payloads", async () => {
    currentDb.row = { id: "u-1", showcase: {} };
    expect((await patchShowcase("nope")).status).toBe(400);
    expect((await patchShowcase({ achievementKeys: "first_premiere" })).status).toBe(400);
    expect((await patchShowcase({ achievementKeys: ["not_a_key"] })).status).toBe(400);
    expect((await patchShowcase({ achievementKeys: [42] })).status).toBe(400);
    expect((await patchShowcase({ achievementKeys: ["first_premiere", "first_premiere"] })).status).toBe(400);
  });

  it("400 when more than 3 achievements pinned", async () => {
    currentDb.row = { id: "u-1", showcase: {} };
    currentDb.writeResult = { data: { id: "u-1" }, error: null };
    const keys = ["first_premiere", "marathoner", "centurion"];
    expect((await patchShowcase({ achievementKeys: keys })).status).toBe(200);
    expect((await patchShowcase({ achievementKeys: [...keys, "centurion"] })).status).toBe(400);
  });

  it("403 when user is below Level 10 attempting to pin favoriteListId", async () => {
    currentDb.row = { id: "u-1", showcase: { lifetimeXp: 10 } }; // Level 3 (< 10)
    const res = await patchShowcase({ favoriteListId: "l-mine" });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Level 10/);
  });

  it("400 when favoriteListId is not an owned public done list", async () => {
    // user is Level 11 (50 XP), lists lookup resolves no row -> rejected at the trust boundary.
    currentDb.row = { id: "u-1", showcase: { lifetimeXp: 50 } };
    currentDb.rowsByTable = { lists: null };
    expect((await patchShowcase({ favoriteListId: "l-someone-elses" })).status).toBe(400);
    const body = (await (
      await patchShowcase({ favoriteListId: "l-private-one" })
    ).json()) as { error: string };
    expect(body.error).toMatch(/public finished/);
  });

  it("merges a partial patch and persists the full showcase object", async () => {
    currentDb.row = {
      id: "u-1",
      showcase: { achievementKeys: ["first_premiere"], favoriteListId: null, lifetimeXp: 50 },
    };
    currentDb.writeResult = { data: { id: "u-1" }, error: null };
    const res = await patchShowcase({ favoriteListId: "l-mine" });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      showcase: { achievementKeys: ["first_premiere"], favoriteListId: "l-mine", lifetimeXp: 50 },
    });
    const upd = currentDb.calls.find((c) => c.method === "update")!;
    expect(upd.args[0]).toEqual({
      showcase: { achievementKeys: ["first_premiere"], favoriteListId: "l-mine", lifetimeXp: 50 },
    });
    // The lists trust-boundary check ran before the update.
    const listsCall = currentDb.calls.find(
      (c) => c.table === "lists" && c.method === "eq",
    );
    expect(listsCall).toBeTruthy();
  });

  it("409 'claim a handle first' when no profiles row exists", async () => {
    const res = await patchShowcase({ achievementKeys: [] });
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("claim a handle first");
  });

  it("strips a client-supplied lifetimeXp instead of storing it", async () => {
    // CRITICAL: lifetimeXp is server-derived. Without stripping it, a client
    // could (1) PATCH an inflated lifetimeXp here, then (2) send any equip
    // PATCH — whose guard reads lifetimeXp back via fetchCareerXp /
    // grandfatheredXp / levelFor — and get every level-gated item, the pin
    // gate, and the proposals gate for free. Closing step 1 breaks the chain.
    currentDb.row = {
      id: "u-1",
      showcase: { achievementKeys: [], favoriteListId: null, lifetimeXp: 50 },
    };
    currentDb.writeResult = { data: { id: "u-1" }, error: null };
    const res = await patchShowcase({ lifetimeXp: 999999999 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { showcase: { lifetimeXp?: number } };
    expect(body.showcase.lifetimeXp).toBe(50);
    const upd = currentDb.calls.find((c) => c.method === "update")!;
    expect((upd.args[0] as { showcase: { lifetimeXp?: number } }).showcase.lifetimeXp).toBe(50);
  });

  it("strips lifetimeXp even riding alongside a legitimate field in the same request", async () => {
    currentDb.row = {
      id: "u-1",
      showcase: { achievementKeys: [], favoriteListId: null, lifetimeXp: 50 },
    };
    currentDb.writeResult = { data: { id: "u-1" }, error: null };
    const res = await patchShowcase({ achievementKeys: ["first_premiere"], lifetimeXp: 999999999 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      showcase: { achievementKeys: string[]; lifetimeXp?: number };
    };
    expect(body.showcase.achievementKeys).toEqual(["first_premiere"]);
    expect(body.showcase.lifetimeXp).toBe(50);
  });

  it("400 when neither visibility nor showcase is present", async () => {
    currentDb.row = { id: "u-1", showcase: {} };
    const { PATCH } = await import("./route");
    const res = await PATCH(
      new Request("http://x/api/profile", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
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
