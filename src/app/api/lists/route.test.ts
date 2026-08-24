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

function makeDb(opts: {
  user?: { id: string } | null;
  failOn?: (call: Call) => boolean;
  data?: (table: string) => unknown;
}): MockDb {
  const calls: Call[] = [];
  const resolve = async () => {
    const last = calls[calls.length - 1];
    if (opts.failOn?.(last))
      return {
        data: null,
        error: { code: "42501", message: "new row violates row-level security policy" },
      };
    return { data: opts.data?.("rpc") ?? null, error: null };
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      // chainable builder: every method records the call and returns itself,
      // awaiting resolves via `then`
      const obj: Record<string, unknown> = {};
      for (const method of ["select", "eq", "single", "in", "insert", "update", "delete"]) {
        obj[method] = (...args: unknown[]) => {
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
    rpc(name: string, args: unknown) {
      calls.push({ table: `rpc:${name}`, method: "rpc", args: [args] });
      return resolve();
    },
  };
  return { client, calls };
}

const { POST } = await import("./route");

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/lists", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const doneBody = {
  title: "Movie Night",
  participants: ["Ana", "Ben"],
  status: "done",
  movies: [
    {
      tmdbId: 100,
      title: "Heat",
      posterPath: "/heat.jpg",
      releaseYear: 1995,
      elo: 1032.5,
      comparisons: 4,
      parked: false,
      finalRank: 1,
    },
    {
      tmdbId: 200,
      title: "Alien",
      posterPath: null,
      releaseYear: 1979,
      elo: 990,
      comparisons: 3,
      parked: true,
      finalRank: 2,
    },
  ],
};

beforeEach(() => {
  currentDb = makeDb({ user: { id: "u-1" } });
});

describe("POST /api/lists", () => {
  it("returns 401 when unauthenticated and touches no tables", async () => {
    currentDb = makeDb({ user: null });
    const res = await POST(jsonRequest(doneBody));
    expect(res.status).toBe(401);
    expect(currentDb.calls).toHaveLength(0);
  });

  it("returns 201 with a nanoid(10) id and saves atomically via save_list rpc", async () => {
    const res = await POST(jsonRequest(doneBody));
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    expect(id).toMatch(/^[A-Za-z0-9_-]{10}$/);

    expect(currentDb.calls.filter((c) => c.method === "rpc")).toHaveLength(1);
    const rpcCall = currentDb.calls.find((c) => c.table === "rpc:save_list")!;
    expect(rpcCall.args[0]).toMatchObject({
      p_id: id,
      p_title: "Movie Night",
      p_participants: ["Ana", "Ben"],
      p_status: "done",
    });
    const movieRows = (
      rpcCall.args[0] as { p_movies: Record<string, unknown>[] }
    ).p_movies;
    expect(movieRows.map((r) => [r.tmdb_id, r.final_rank])).toEqual([
      [100, 1],
      [200, 2],
    ]);
    expect(movieRows[0]).toMatchObject({
      title: "Heat",
      poster_path: "/heat.jpg",
      release_year: 1995,
      elo: 1032.5,
      comparisons: 4,
      parked: false,
    });
    expect(movieRows[1]).toMatchObject({ parked: true, poster_path: null });
  });

  it("rejects a missing title with 400", async () => {
    const res = await POST(jsonRequest({ ...doneBody, title: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid status with 400", async () => {
    const res = await POST(jsonRequest({ ...doneBody, status: "published" }));
    expect(res.status).toBe(400);
  });

  it("rejects movies without tmdbId/title with 400", async () => {
    const res = await POST(jsonRequest({ ...doneBody, movies: [{ title: "no id" }] }));
    expect(res.status).toBe(400);
  });

  it("maps an RLS violation to 403", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      failOn: (c) => c.table === "rpc:save_list",
    });
    const res = await POST(jsonRequest(doneBody));
    expect(res.status).toBe(403);
  });
});
