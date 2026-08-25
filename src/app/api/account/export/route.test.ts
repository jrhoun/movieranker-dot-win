import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

const exportedLists = [
  {
    id: "abc123",
    title: "Best Sci-Fi",
    status: "done",
    list_movies: [{ title: "Alien", tmdb_id: 348 }],
  },
];

let currentDb: { client: unknown; calls: Call[]; data?: unknown };

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
      obj.select = (...args: unknown[]) => {
        calls.push({ table, method: "select", args });
        return obj;
      };
      obj.then = (
        onFulfilled?: (v: unknown) => unknown,
        onRejected?: (e: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: opts.user ? (currentDb.data ?? []) : null,
          error: null,
        }).then(onFulfilled, onRejected);
      return obj;
    },
  };
  return { client, calls };
}

beforeEach(() => {
  currentDb = { ...makeDb({ user: { id: "u-1" } }), data: exportedLists };
});

describe("GET /api/account/export", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = { ...makeDb({ user: null }), data: undefined };
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("downloads JSON with exported_at and full lists incl. movies", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");

    const body = (await res.json()) as {
      exported_at: string;
      lists: typeof exportedLists;
    };
    expect(typeof body.exported_at).toBe("string");
    expect(new Date(body.exported_at).toString()).not.toBe("Invalid Date");
    expect(body.lists).toEqual(exportedLists);
    expect(body.lists[0].list_movies[0]).toMatchObject({ tmdb_id: 348 });
  });

  it("exports an empty lists array for a user with no lists", async () => {
    currentDb.data = null;
    const { GET } = await import("./route");
    const res = await GET();
    const body = (await res.json()) as { exported_at: string; lists: unknown[] };
    expect(body.lists).toEqual([]);
  });
});
