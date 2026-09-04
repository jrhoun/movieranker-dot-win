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
  list?: {
    id: string;
    owner_id: string;
    status: string;
    visibility: string;
    upvotes_count: number;
  } | null;
  upvote?: { id: number } | null;
  failOn?: (call: Call) => boolean;
}): MockDb {
  const calls: Call[] = [];
  const resolve = async () => {
    const last = calls[calls.length - 1];
    if (opts.failOn?.(last)) {
      return {
        data: null,
        error: { code: "42501", message: "new row violates row-level security policy" },
      };
    }
    if (last?.table === "lists") {
      return { data: opts.list ?? null, error: null };
    }
    if (last?.table === "list_upvotes") {
      if (calls.some((c) => c.table === "list_upvotes" && c.method === "delete")) {
        return { data: null, error: null };
      }
      if (calls.some((c) => c.table === "list_upvotes" && c.method === "insert")) {
        return { data: null, error: null };
      }
      return { data: opts.upvote ?? null, error: null };
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
  return { client, calls };
}

const { GET, POST } = await import("./route");

const donePublicList = {
  id: "list-12345",
  owner_id: "u-owner",
  status: "done",
  visibility: "public",
  upvotes_count: 5,
};

beforeEach(() => {
  currentDb = makeDb({
    user: { id: "u-1" },
    list: donePublicList,
    upvote: null,
  });
});

describe("GET /api/lists/[id]/upvote", () => {
  it("returns 200 with upvote count and hasUpvoted=false when user has not upvoted", async () => {
    const res = await GET(new Request("http://localhost/api/lists/list-12345/upvote"), {
      params: Promise.resolve({ id: "list-12345" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upvotesCount).toBe(5);
    expect(json.hasUpvoted).toBe(false);
  });

  it("returns 200 with hasUpvoted=true when user has upvoted", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: donePublicList,
      upvote: { id: 99 },
    });
    const res = await GET(new Request("http://localhost/api/lists/list-12345/upvote"), {
      params: Promise.resolve({ id: "list-12345" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upvotesCount).toBe(5);
    expect(json.hasUpvoted).toBe(true);
  });

  it("returns 200 with hasUpvoted=false for unauthenticated guest", async () => {
    currentDb = makeDb({
      user: null,
      list: donePublicList,
      upvote: null,
    });
    const res = await GET(new Request("http://localhost/api/lists/list-12345/upvote"), {
      params: Promise.resolve({ id: "list-12345" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upvotesCount).toBe(5);
    expect(json.hasUpvoted).toBe(false);
  });

  it("returns 404 when list does not exist", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: null,
    });
    const res = await GET(new Request("http://localhost/api/lists/missing/upvote"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 when list is private and requester is not the owner", async () => {
    currentDb = makeDb({
      user: { id: "u-stranger" },
      list: {
        id: "list-priv",
        owner_id: "u-owner",
        status: "done",
        visibility: "private",
        upvotes_count: 0,
      },
    });
    const res = await GET(new Request("http://localhost/api/lists/list-priv/upvote"), {
      params: Promise.resolve({ id: "list-priv" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/lists/[id]/upvote", () => {
  it("returns 401 when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const res = await POST(
      new Request("http://localhost/api/lists/list-12345/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "list-12345" }) },
    );
    expect(res.status).toBe(401);
  });

  it("toggles upvote on (insert) when not yet upvoted", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: donePublicList,
      upvote: null,
    });
    const res = await POST(
      new Request("http://localhost/api/lists/list-12345/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "list-12345" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasUpvoted).toBe(true);
    expect(json.upvotesCount).toBe(6);

    const insertCall = currentDb.calls.find(
      (c) => c.table === "list_upvotes" && c.method === "insert",
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.args[0]).toEqual({ list_id: "list-12345", user_id: "u-1" });
  });

  it("toggles upvote off (delete) when already upvoted", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: donePublicList,
      upvote: { id: 101 },
    });
    const res = await POST(
      new Request("http://localhost/api/lists/list-12345/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "list-12345" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.hasUpvoted).toBe(false);
    expect(json.upvotesCount).toBe(4);

    const deleteCall = currentDb.calls.find(
      (c) => c.table === "list_upvotes" && c.method === "delete",
    );
    expect(deleteCall).toBeDefined();
  });

  it("returns 404 when list does not exist", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: null,
    });
    const res = await POST(
      new Request("http://localhost/api/lists/not-found/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "not-found" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when trying to upvote a draft or private list", async () => {
    currentDb = makeDb({
      user: { id: "u-1" },
      list: {
        id: "list-draft",
        owner_id: "u-stranger",
        status: "draft",
        visibility: "unlisted",
        upvotes_count: 0,
      },
    });
    const res = await POST(
      new Request("http://localhost/api/lists/list-draft/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "list-draft" }) },
    );
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    // Fire requests up to the rate limit
    for (let i = 0; i < 30; i++) {
      await POST(
        new Request("http://localhost/api/lists/list-12345/upvote", { method: "POST" }),
        { params: Promise.resolve({ id: "list-12345" }) },
      );
    }
    const res = await POST(
      new Request("http://localhost/api/lists/list-12345/upvote", { method: "POST" }),
      { params: Promise.resolve({ id: "list-12345" }) },
    );
    expect(res.status).toBe(429);
  });
});
