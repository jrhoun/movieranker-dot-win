import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

interface MockDbOptions {
  user?: { id: string } | null;
  list?: {
    id: string;
    owner_id: string;
    status: string;
    visibility: string;
    upvotes_count: number | null;
  } | null;
  upvote?: { id: number } | null;
  failOn?: (call: Call) => { code?: string; message: string } | null;
}

interface MockDb {
  client: unknown;
  calls: Call[];
  state: {
    hasUpvote: boolean;
    upvotesCount: number;
  };
}

let currentDb: MockDb;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

function makeMockDb(opts: MockDbOptions): MockDb {
  const calls: Call[] = [];
  const state = {
    hasUpvote: !!opts.upvote,
    upvotesCount: opts.list?.upvotes_count ?? 0,
  };

  const resolve = async () => {
    const last = calls[calls.length - 1];
    const failure = opts.failOn?.(last);
    if (failure) {
      return {
        data: null,
        error: failure,
      };
    }
    if (last?.table === "lists") {
      if (!opts.list) return { data: null, error: null };
      return {
        data: {
          ...opts.list,
          upvotes_count: state.upvotesCount,
        },
        error: null,
      };
    }
    if (last?.table === "list_upvotes") {
      if (last.method === "delete") {
        state.hasUpvote = false;
        return { data: null, error: null };
      }
      if (last.method === "insert") {
        state.hasUpvote = true;
        return { data: null, error: null };
      }
      return { data: state.hasUpvote ? { id: 123 } : null, error: null };
    }
    return { data: null, error: null };
  };

  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      const obj: Record<string, unknown> = {};
      for (const method of ["select", "eq", "single", "maybeSingle", "insert", "delete"]) {
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

  return { client, calls, state };
}

const { GET, POST } = await import("./route");

describe("upvote route.ts Empirical Stress Testing", () => {
  beforeEach(() => {
    currentDb = makeMockDb({
      user: { id: "user-stress-1" },
      list: {
        id: "list-stress-100",
        owner_id: "user-owner",
        status: "done",
        visibility: "public",
        upvotes_count: 10,
      },
      upvote: null,
    });
  });

  // ---------------------------------------------------------------------------
  // 1. RATE LIMIT BURSTS & SLIDING WINDOW ISOLATION
  // ---------------------------------------------------------------------------
  describe("1. Rate Limiting Bursts & User Isolation", () => {
    it("permits exactly 30 requests per user and blocks 31st with 429 and Retry-After header", async () => {
      const uniqueUserId = `user-burst-${Date.now()}`;
      currentDb = makeMockDb({
        user: { id: uniqueUserId },
        list: {
          id: "list-burst",
          owner_id: "user-owner",
          status: "done",
          visibility: "public",
          upvotes_count: 5,
        },
      });

      // 30 requests should succeed
      for (let i = 0; i < 30; i++) {
        const res = await POST(
          new Request("http://localhost/api/lists/list-burst/upvote", { method: "POST" }),
          { params: Promise.resolve({ id: "list-burst" }) },
        );
        expect(res.status).toBe(200);
      }

      // 31st request must be rate limited
      const rateLimitedRes = await POST(
        new Request("http://localhost/api/lists/list-burst/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-burst" }) },
      );
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.headers.get("Retry-After")).toBeDefined();
      const body = await rateLimitedRes.json();
      expect(body.error).toBe("too many requests");
    });

    it("isolates rate limits between different users", async () => {
      const userA = `user-a-${Date.now()}`;
      const userB = `user-b-${Date.now()}`;

      // Max out user A
      for (let i = 0; i < 30; i++) {
        currentDb = makeMockDb({
          user: { id: userA },
          list: { id: "list-shared", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 0 },
        });
        const res = await POST(
          new Request("http://localhost/api/lists/list-shared/upvote", { method: "POST" }),
          { params: Promise.resolve({ id: "list-shared" }) },
        );
        expect(res.status).toBe(200);
      }

      // User A is blocked
      currentDb = makeMockDb({
        user: { id: userA },
        list: { id: "list-shared", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 0 },
      });
      const blockedRes = await POST(
        new Request("http://localhost/api/lists/list-shared/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-shared" }) },
      );
      expect(blockedRes.status).toBe(429);

      // User B is fresh and can still toggle upvotes
      currentDb = makeMockDb({
        user: { id: userB },
        list: { id: "list-shared", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 0 },
      });
      const userBRes = await POST(
        new Request("http://localhost/api/lists/list-shared/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-shared" }) },
      );
      expect(userBRes.status).toBe(200);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. UNAUTHORIZED TOGGLE ATTEMPTS & GUEST ACCESS
  // ---------------------------------------------------------------------------
  describe("2. Unauthorized Attempts & Guest Access", () => {
    it("POST returns 401 unauthenticated for guest", async () => {
      currentDb = makeMockDb({
        user: null,
        list: { id: "list-1", owner_id: "u-1", status: "done", visibility: "public", upvotes_count: 3 },
      });

      const res = await POST(
        new Request("http://localhost/api/lists/list-1/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-1" }) },
      );
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("unauthenticated");
    });

    it("GET returns 200 with hasUpvoted=false for unauthenticated guest", async () => {
      currentDb = makeMockDb({
        user: null,
        list: { id: "list-1", owner_id: "u-1", status: "done", visibility: "public", upvotes_count: 42 },
      });

      const res = await GET(
        new Request("http://localhost/api/lists/list-1/upvote"),
        { params: Promise.resolve({ id: "list-1" }) },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.upvotesCount).toBe(42);
      expect(json.hasUpvoted).toBe(false);
      expect(json.userUpvoted).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. PRIVATE, DRAFT, AND UNLISTED LIST GUARDS
  // ---------------------------------------------------------------------------
  describe("3. Private, Draft, and Unlisted List Access", () => {
    it("rejects POST on draft list with 403", async () => {
      currentDb = makeMockDb({
        user: { id: "u-random" },
        list: { id: "l-draft", owner_id: "u-other", status: "draft", visibility: "public", upvotes_count: 0 },
      });

      const res = await POST(
        new Request("http://localhost/api/lists/l-draft/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-draft" }) },
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("cannot upvote draft or private list");
    });

    it("rejects POST on private list by stranger with 403", async () => {
      currentDb = makeMockDb({
        user: { id: "u-stranger" },
        list: { id: "l-priv", owner_id: "u-owner", status: "done", visibility: "private", upvotes_count: 0 },
      });

      const res = await POST(
        new Request("http://localhost/api/lists/l-priv/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-priv" }) },
      );
      expect(res.status).toBe(403);
    });

    it("allows POST on unlisted done list", async () => {
      currentDb = makeMockDb({
        user: { id: `u-unlisted-${Date.now()}` },
        list: { id: "l-unlisted", owner_id: "u-owner", status: "done", visibility: "unlisted", upvotes_count: 0 },
      });

      const res = await POST(
        new Request("http://localhost/api/lists/l-unlisted/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-unlisted" }) },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.hasUpvoted).toBe(true);
      expect(json.upvotesCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. UNDERFLOW & CONCURRENCY IDEMPOTENCY
  // ---------------------------------------------------------------------------
  describe("4. Underflow & Count Invariants", () => {
    it("never lets upvote count drop below zero even if count was 0", async () => {
      const user = { id: `u-underflow-${Date.now()}` };
      currentDb = makeMockDb({
        user,
        list: { id: "l-zero", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 0 },
        upvote: { id: 999 }, // user has an existing upvote record despite 0 count
      });

      const res = await POST(
        new Request("http://localhost/api/lists/l-zero/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-zero" }) },
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.hasUpvoted).toBe(false);
      expect(json.upvotesCount).toBe(0);
      expect(json.count).toBe(0);
    });

    it("maps RLS policy errors to 403 forbidden and network/server errors to 500", async () => {
      // 1. RLS error
      currentDb = makeMockDb({
        user: { id: `u-rlserr-${Date.now()}` },
        list: { id: "l-rls", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 5 },
        failOn: (call) =>
          call.table === "list_upvotes" && call.method === "insert"
            ? { code: "42501", message: "new row violates row-level security policy" }
            : null,
      });

      const rlsRes = await POST(
        new Request("http://localhost/api/lists/l-rls/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-rls" }) },
      );
      expect(rlsRes.status).toBe(403);
      const rlsJson = await rlsRes.json();
      expect(rlsJson.error).toBe("forbidden");

      // 2. Generic DB error (e.g. connection timeout)
      currentDb = makeMockDb({
        user: { id: `u-dberr-${Date.now()}` },
        list: { id: "l-err", owner_id: "u-owner", status: "done", visibility: "public", upvotes_count: 5 },
        failOn: (call) =>
          call.table === "list_upvotes" && call.method === "insert"
            ? { code: "57P01", message: "terminating connection due to administrator command" }
            : null,
      });

      const dbRes = await POST(
        new Request("http://localhost/api/lists/l-err/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "l-err" }) },
      );
      expect(dbRes.status).toBe(500);
      const dbJson = await dbRes.json();
      expect(dbJson.error).toBe("terminating connection due to administrator command");
    });
  });
});
