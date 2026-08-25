import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

interface MockDb {
  client: unknown;
  calls: Call[];
}

let currentDb: MockDb;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

const LIST_ID = "L123456789";

function makeDb(opts: {
  user?: { id: string } | null;
  /** lists row visible via RLS? */
  listVisible?: boolean;
  listParticipants?: string[];
  /** insert into participant_attributions hits the unique constraint? */
  alreadyClaimed?: boolean;
  /** existing own attribution row (GET) */
  existingClaim?: { display_name: string } | null;
}): MockDb {
  const calls: Call[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      let sawMaybeSingle = false;
      const resolve = async () => {
        if (table === "lists")
          return {
            data: opts.listVisible === false
              ? null
              : { participants: opts.listParticipants ?? [] },
            error: null,
          };
        if (table === "participant_attributions") {
          const last = calls[calls.length - 1];
          if (last.method === "insert") {
            return opts.alreadyClaimed
              ? {
                  data: null,
                  error: {
                    code: "23505",
                    message: "duplicate key value violates unique constraint",
                  },
                }
              : { data: null, error: null };
          }
          // select + maybeSingle -> GET probe / claim lookup
          return sawMaybeSingle
            ? { data: opts.existingClaim ?? null, error: null }
            : { data: null, error: null };
        }
        return { data: null, error: null };
      };
      const obj: Record<string, unknown> = {};
      for (const method of [
        "select",
        "eq",
        "single",
        "maybeSingle",
        "insert",
        "update",
        "delete",
      ]) {
        obj[method] = (...args: unknown[]) => {
          if (method === "maybeSingle" || method === "single") sawMaybeSingle = true;
          calls.push({ table, method, args });
          return obj;
        };
      }
      obj.then = (
        onFulfilled?: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) => resolve().then(onFulfilled, onRejected);
      return obj;
    },
  };
  return { client, calls };
}

const { POST, DELETE, GET } = await import("./route");

const ctx = { params: Promise.resolve({ id: LIST_ID }) };

function req(method: string, body?: unknown) {
  return new Request(`http://localhost/api/lists/${LIST_ID}/participants/claim`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  currentDb = makeDb({ user: { id: "u-1" }, listParticipants: ["Ana", "Bo"] });
});

describe("POST .../participants/claim", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await POST(req("POST", { displayName: "Ana" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for an unknown/unreadable list", async () => {
    currentDb = makeDb({ user: { id: "u-1" }, listVisible: false });
    const res = await POST(req("POST", { displayName: "Ana" }), ctx);
    expect(res.status).toBe(404);
    expect(currentDb.calls.filter((c) => c.method === "insert")).toHaveLength(0);
  });

  it("binds an existing participant name case-insensitively without appending", async () => {
    const res = await POST(req("POST", { displayName: "  ana  " }), ctx);
    expect(res.status).toBe(201);

    const insert = currentDb.calls.find(
      (c) => c.table === "participant_attributions" && c.method === "insert",
    )!;
    expect(insert.args[0]).toEqual({
      list_id: LIST_ID,
      display_name: "Ana", // canonical spelling from lists.participants
      user_id: "u-1",
    });
    expect(currentDb.calls.filter((c) => c.table === "lists" && c.method === "update"))
      .toHaveLength(0);
  });

  it("appends a new name to participants when nothing matches", async () => {
    const res = await POST(req("POST", { displayName: "Cleo" }), ctx);
    expect(res.status).toBe(201);

    const update = currentDb.calls.find(
      (c) => c.table === "lists" && c.method === "update",
    )!;
    expect(update.args[0]).toEqual({ participants: ["Ana", "Bo", "Cleo"] });
  });

  it("returns 409 already participating on unique violation and does not append", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      listParticipants: ["Ana"],
      alreadyClaimed: true,
    });
    const res = await POST(req("POST", { displayName: "Ana" }), ctx);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe("already participating");
    expect(
      currentDb.calls.filter((c) => c.table === "lists" && c.method === "update"),
    ).toHaveLength(0);
  });

  it("rejects a missing/blank/too-long name with 400", async () => {
    for (const displayName of ["   ", "", "x".repeat(41)]) {
      const res = await POST(req("POST", { displayName }), ctx);
      expect(res.status).toBe(400);
    }
  });
});

describe("GET .../participants/claim", () => {
  it("reports claimed status with the bound display name", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      existingClaim: { display_name: "Ana" },
    });
    const res = await GET(req("GET"), ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { claimed: boolean; displayName?: string };
    expect(body.claimed).toBe(true);
    expect(body.displayName).toBe("Ana");
  });

  it("reports unclaimed for a fresh viewer", async () => {
    const res = await GET(req("GET"), ctx);
    const body = (await res.json()) as { claimed: boolean };
    expect(body.claimed).toBe(false);
  });
});

describe("DELETE .../participants/claim", () => {
  it("removes only the caller's own attribution row", async () => {
    const res = await DELETE(req("DELETE"), ctx);
    expect(res.status).toBe(204);

    const del = currentDb.calls.find((c) => c.method === "delete")!;
    const eqs = currentDb.calls
      .filter((c) => c.table === "participant_attributions" && c.method === "eq")
      .map((c) => c.args);
    expect(eqs).toContainEqual(["list_id", LIST_ID]);
    expect(eqs).toContainEqual(["user_id", "u-1"]);
    expect(del).toBeTruthy();
  });

  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await DELETE(req("DELETE"), ctx);
    expect(res.status).toBe(401);
  });
});
