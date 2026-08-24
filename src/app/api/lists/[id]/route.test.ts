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
const EXISTING_MOVIES = [
  { id: 11, tmdb_id: 100 },
  { id: 12, tmdb_id: 200 },
];

function makeDb(opts: {
  user?: { id: string } | null;
  failOn?: (call: Call) => boolean;
  listVisible?: boolean;
}): MockDb {
  const calls: Call[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      let sawSelect = false;
      const resolve = async () => {
        const last = calls[calls.length - 1];
        if (opts.failOn?.(last))
          return {
            data: null,
            error: { code: "42501", message: "new row violates row-level security policy" },
          };
        if (table === "lists")
          return { data: opts.listVisible === false ? [] : [{ id: LIST_ID }], error: null };
        if (table === "list_movies" && sawSelect)
          return { data: EXISTING_MOVIES, error: null };
        return { data: null, error: null };
      };
      const obj: Record<string, unknown> = {};
      for (const method of ["select", "eq", "single", "in", "insert", "update", "delete"]) {
        obj[method] = (...args: unknown[]) => {
          if (method === "select") sawSelect = true;
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

const { PATCH, DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ id: LIST_ID }) };

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/lists/${LIST_ID}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  currentDb = makeDb({ user: { id: "u-1" } });
});

describe("PATCH /api/lists/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await PATCH(patchRequest({ title: "x" }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when the list is not owned/visible via RLS", async () => {
    currentDb = makeDb({ user: { id: "u-1" }, listVisible: false });
    const res = await PATCH(patchRequest({ title: "x" }), ctx);
    expect(res.status).toBe(403);
    expect(currentDb.calls.filter((c) => c.table === "list_movies")).toHaveLength(0);
  });

  it("updates list fields and diffs movies by tmdbId", async () => {
    const res = await PATCH(
      patchRequest({
        title: "Renamed",
        participants: ["Ana"],
        status: "done",
        // keep 200 (update elo), drop 100 (delete), add 300 (insert)
        movies: [{ tmdbId: 200, elo: 1050 }, { tmdbId: 300, title: "New Movie" }],
      }),
      ctx,
    );
    expect(res.status).toBe(204);

    const listUpdate = currentDb.calls.find(
      (c) => c.table === "lists" && c.method === "update",
    )!;
    expect(listUpdate.args[0]).toEqual({
      title: "Renamed",
      participants: ["Ana"],
      status: "done",
    });

    // removed tmdbId 100 -> delete by row id
    expect(currentDb.calls).toContainEqual(
      expect.objectContaining({ table: "list_movies", method: "delete", args: [] }),
    );
    expect(currentDb.calls).toContainEqual(
      expect.objectContaining({ table: "list_movies", method: "in", args: ["id", [11]] }),
    );

    // new tmdbId 300 -> insert with defaults filled
    const ins = currentDb.calls.find(
      (c) => c.table === "list_movies" && c.method === "insert",
    )!;
    expect(ins.args[0]).toMatchObject([
      { list_id: LIST_ID, tmdb_id: 300, title: "New Movie", elo: 1000, final_rank: null },
    ]);

    // existing tmdbId 200 -> partial update of provided fields only, keyed by row id
    const upd = currentDb.calls.find(
      (c) => c.table === "list_movies" && c.method === "update",
    )!;
    expect(upd.args[0]).toEqual({ elo: 1050 });
    expect(currentDb.calls).toContainEqual(
      expect.objectContaining({ table: "list_movies", method: "eq", args: ["id", 12] }),
    );
  });

  it("rejects a movie payload without tmdbId with 400", async () => {
    const res = await PATCH(patchRequest({ movies: [{ title: "nope" }] }), ctx);
    expect(res.status).toBe(400);
  });

  it("rejects an invalid status with 400", async () => {
    const res = await PATCH(patchRequest({ status: "archived" }), ctx);
    expect(res.status).toBe(400);
  });

  it("maps an RLS violation on the list update to 403", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      // awaited chains end in .eq(), so match that
      failOn: (c) => c.table === "lists" && c.method === "eq",
    });
    const res = await PATCH(patchRequest({ title: "Renamed" }), ctx);
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/lists/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await DELETE(new Request(`http://localhost/api/lists/${LIST_ID}`), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-owner", async () => {
    currentDb = makeDb({ user: { id: "u-1" }, listVisible: false });
    const res = await DELETE(new Request(`http://localhost/api/lists/${LIST_ID}`), ctx);
    expect(res.status).toBe(403);
  });

  it("deletes the list row and returns 204", async () => {
    const res = await DELETE(new Request(`http://localhost/api/lists/${LIST_ID}`), ctx);
    expect(res.status).toBe(204);
    expect(currentDb.calls).toContainEqual(
      expect.objectContaining({ table: "lists", method: "eq", args: ["id", LIST_ID] }),
    );
  });
});
