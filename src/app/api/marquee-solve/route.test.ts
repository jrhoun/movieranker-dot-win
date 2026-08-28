import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidSolveRequest, isCorrectGuess } from "./route";

type Call = { table: string; method: string; args: unknown[] };
type DbResult = { data?: unknown; error?: { code?: string; message: string } | null };

let currentDb: {
  client: unknown;
  calls: Call[];
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
  currentDb = makeDb({ user: { id: "u-1" } });
});

describe("isValidSolveRequest", () => {
  it("accepts a well-formed body", () => {
    expect(isValidSolveRequest({ themeSlug: "best-hairpieces", guessIndex: 0 })).toBe(true);
  });

  it("rejects a missing or non-string themeSlug", () => {
    expect(isValidSolveRequest({ guessIndex: 0 })).toBe(false);
    expect(isValidSolveRequest({ themeSlug: 42, guessIndex: 0 })).toBe(false);
    expect(isValidSolveRequest({ themeSlug: "", guessIndex: 0 })).toBe(false);
  });

  it("rejects a non-integer or negative guessIndex", () => {
    expect(isValidSolveRequest({ themeSlug: "x", guessIndex: "0" })).toBe(false);
    expect(isValidSolveRequest({ themeSlug: "x", guessIndex: -1 })).toBe(false);
    expect(isValidSolveRequest({ themeSlug: "x", guessIndex: 1.5 })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidSolveRequest(null)).toBe(false);
    expect(isValidSolveRequest("nope")).toBe(false);
    expect(isValidSolveRequest([])).toBe(false);
  });
});

describe("isCorrectGuess", () => {
  it("returns false for an unknown theme slug", () => {
    expect(isCorrectGuess("no-such-theme", 0)).toBe(false);
  });

  it("returns false for a theme that defines no connection game", () => {
    // Only 5 of 52 themes define connectionGame. The other 47 have no quiz, so
    // they can never be solved and must not throw when asked.
    expect(isCorrectGuess("rain-soaked-cinema", 0)).toBe(false);
  });

  it("returns true for a real theme's correct index", () => {
    // secretly-same-story defines connectionGame with correctIndex 0.
    expect(isCorrectGuess("secretly-same-story", 0)).toBe(true);
  });

  it("returns false for a real theme's wrong index", () => {
    expect(isCorrectGuess("secretly-same-story", 1)).toBe(false);
  });
});

describe("POST /api/marquee-solve", () => {
  async function post(body: unknown) {
    const { POST } = await import("./route");
    return POST(
      new Request("http://x/api/marquee-solve", {
        method: "POST",
        body: typeof body === "string" ? body : JSON.stringify(body),
      }),
    );
  }

  it("returns 400 when request body is invalid or malformed JSON", async () => {
    expect((await post({ themeSlug: "secretly-same-story" })).status).toBe(400);
    expect((await post("not-json")).status).toBe(400);
    expect((await post(null)).status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "sign in to record a solve" });
  });

  it("returns 200 { solved: false } and does not upsert on incorrect guess", async () => {
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 2 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ solved: false });
    expect(currentDb.calls).toHaveLength(0);
  });

  it("returns 200 { solved: true } and upserts solve on correct guess", async () => {
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ solved: true });

    const upsert = currentDb.calls.find((c) => c.method === "upsert");
    expect(upsert).toBeTruthy();
    expect(upsert?.table).toBe("marquee_solves");
    expect(upsert?.args[0]).toEqual({
      user_id: "u-1",
      theme_slug: "secretly-same-story",
    });
    expect(upsert?.args[1]).toEqual({
      onConflict: "user_id,theme_slug",
      ignoreDuplicates: true,
    });
  });

  it("returns 500 when database upsert fails", async () => {
    currentDb.writeResult = { error: { message: "db down" } };
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "could not record solve" });
  });
});
