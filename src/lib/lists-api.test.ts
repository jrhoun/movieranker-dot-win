import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

// ponytail: match the loose supabase typing lists-api accepts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = { from: (t: string) => any };

let currentDb: { client: DbClient; calls: Call[] };

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

function makeDb(
  opts: {
    list?: Record<string, unknown> | null;
    movies?: Record<string, unknown>[];
  } = {},
): { client: DbClient; calls: Call[] } {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const resolve = async () => {
        if (table === "lists") return { data: opts.list ?? null, error: null };
        return { data: opts.movies ?? [], error: null };
      };
      const obj: Record<string, unknown> = {};
      for (const method of ["select", "eq", "single"]) {
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
  };
  return { client, calls };
}

const { fetchResumableList } = await import("./lists-api");

beforeEach(() => {
  currentDb = makeDb();
});

describe("fetchResumableList", () => {
  it("maps db rows to a ResumedList for the owner's draft", async () => {
    currentDb = makeDb({
      list: { title: "Movie Night", participants: ["Ana"], status: "draft" },
      movies: [
        {
          tmdb_id: 100,
          title: "Heat",
          poster_path: "/heat.jpg",
          release_year: 1995,
          elo: 1032.5,
          comparisons: 4,
          parked: false,
        },
        {
          tmdb_id: 200,
          title: "Alien",
          poster_path: null,
          release_year: null,
          elo: 990,
          comparisons: 3,
          parked: true,
        },
      ],
    });
    const list = await fetchResumableList(currentDb.client, "abc123");
    expect(list).toMatchObject({
      id: "abc123",
      title: "Movie Night",
      participants: ["Ana"],
      status: "draft",
    });
    expect(list!.movies[0]).toEqual({
      tmdbId: 100,
      title: "Heat",
      posterPath: "/heat.jpg",
      releaseYear: 1995,
      elo: 1032.5,
      comparisons: 4,
      parked: false,
    });
    expect(list!.movies[1]).toMatchObject({ tmdbId: 200, posterPath: null, parked: true });

    // both lookups are RLS-scoped by id
    const tables = [...new Set(currentDb.calls.map((c) => c.table))];
    expect(tables).toEqual(["lists", "list_movies"]);
  });

  it("returns null for a missing or non-owned row (RLS hides it)", async () => {
    currentDb = makeDb({ list: null });
    expect(await fetchResumableList(currentDb.client, "nope")).toBeNull();
  });

  it("returns null for a done list — only drafts are resumable", async () => {
    currentDb = makeDb({ list: { title: "T", participants: [], status: "done" } });
    expect(await fetchResumableList(currentDb.client, "abc123")).toBeNull();
    // and it never queries movies in that case
    expect(currentDb.calls.some((c) => c.table === "list_movies")).toBe(false);
  });
});
