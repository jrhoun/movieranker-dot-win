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
  // Stands in for the real (user_id, theme_slug) primary key. Modelling it here
  // rather than always returning success is the point: the one-attempt rule is
  // enforced by the database, so a mock that accepts every insert would let the
  // brute-force regression pass silently.
  const rows = new Set<string>();
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      const obj: Record<string, unknown> = {};
      obj.insert = async (...args: unknown[]) => {
        calls.push({ table, method: "insert", args });
        if (currentDb.writeResult) return currentDb.writeResult;
        const row = args[0] as { user_id: string; theme_slug: string };
        const key = `${row.user_id}:${row.theme_slug}`;
        if (rows.has(key)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        rows.add(key);
        return { data: null, error: null };
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

  it("accepts a null guessIndex, the 'peeked at the answer' attempt", () => {
    expect(isValidSolveRequest({ themeSlug: "x", guessIndex: null })).toBe(true);
  });

  it("still rejects a body with no guessIndex key at all", () => {
    // undefined is a malformed client, distinct from an explicit null peek.
    expect(isValidSolveRequest({ themeSlug: "x" })).toBe(false);
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

  it("accepts every curated theme, now that all of them have a quiz", () => {
    // Previously only 5 of 52 themes defined a game and the rest could never be
    // solved. All 52 are authored now, so a real slug must never be rejected.
    expect(isCorrectGuess("rain-soaked-cinema", 0)).toBe(true);
  });

  it("returns true for a real theme's correct index", () => {
    // secretly-same-story defines connectionGame with correctIndex 0.
    expect(isCorrectGuess("secretly-same-story", 0)).toBe(true);
  });

  it("returns false for a real theme's wrong index", () => {
    expect(isCorrectGuess("secretly-same-story", 1)).toBe(false);
  });

  it("returns false for a peek, even on a theme with a game", () => {
    expect(isCorrectGuess("secretly-same-story", null)).toBe(false);
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

  it("returns 200 { solved: true } and records correct:true on a right guess", async () => {
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ solved: true });

    const insert = currentDb.calls.find((c) => c.method === "insert");
    expect(insert?.table).toBe("marquee_solves");
    expect(insert?.args[0]).toEqual({
      user_id: "u-1",
      theme_slug: "secretly-same-story",
      correct: true,
    });
  });

  it("STILL RECORDS a wrong guess, so the attempt is spent", async () => {
    // The old handler returned early on a wrong guess without writing anything.
    // That left the try unspent: clear localStorage and you could come back and
    // claim the badge on a second go.
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 2 });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ solved: false });

    const insert = currentDb.calls.find((c) => c.method === "insert");
    expect(insert?.args[0]).toEqual({
      user_id: "u-1",
      theme_slug: "secretly-same-story",
      correct: false,
    });
  });

  it("records a peek (null guessIndex) as a spent, incorrect attempt", async () => {
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: null });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ solved: false });
    expect((currentDb.calls[0]?.args[0] as { correct: boolean }).correct).toBe(false);
  });

  it("cannot be brute-forced: only the first of four guesses is recorded", async () => {
    // The quiz has four options. Before the primary key backed this endpoint, a
    // client could simply POST 0,1,2,3 and be guaranteed a recorded solve.
    const outcomes = [];
    for (const guessIndex of [3, 2, 1, 0]) {
      const res = await post({ themeSlug: "secretly-same-story", guessIndex });
      outcomes.push(await res.json());
    }

    // First attempt (index 3) is wrong and is the one that lands.
    expect(outcomes[0]).toEqual({ solved: false });
    // Every later attempt is rejected — including index 0, the right answer.
    expect(outcomes.slice(1)).toEqual([
      { solved: false, alreadyAttempted: true },
      { solved: false, alreadyAttempted: true },
      { solved: false, alreadyAttempted: true },
    ]);

    // Exactly one row was ever written, and it records the failure.
    const written = currentDb.calls.filter((c) => c.method === "insert");
    expect(written).toHaveLength(4); // all four were attempted...
    expect(
      written.filter((c) => (c.args[0] as { correct: boolean }).correct === true),
    ).toHaveLength(1); // ...but the only correct one was refused by the key.
  });

  it("does not leak the verdict on a replay after the attempt is spent", async () => {
    await post({ themeSlug: "secretly-same-story", guessIndex: 1 });
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    // Right answer, but reported as unsolved: the endpoint must not become an
    // oracle that confirms the answer for someone who already had their go.
    await expect(res.json()).resolves.toEqual({ solved: false, alreadyAttempted: true });
  });

  it("returns 429 once the rate limit is exhausted", async () => {
    let last: Response | undefined;
    for (let i = 0; i < 12; i++) {
      last = await post({ themeSlug: `theme-${i}`, guessIndex: 0 });
    }
    expect(last?.status).toBe(429);
  });

  it("returns 500 when the database write fails for any other reason", async () => {
    currentDb.writeResult = { error: { message: "db down" } };
    const res = await post({ themeSlug: "secretly-same-story", guessIndex: 0 });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "could not record solve" });
  });
});
