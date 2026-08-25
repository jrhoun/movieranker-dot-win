import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

const deleteUser = vi.fn<() => Promise<{ data: unknown; error: unknown }>>(
  async () => ({ data: null, error: null }),
);

let currentDb: { client: unknown; calls: Call[] };

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

vi.mock("@/lib/supabase/admin", () => ({
  // Service-role client stub: deleteUser is what the route must call.
  supabaseAdmin: () => ({ auth: { admin: { deleteUser } } }),
}));

function makeDb(opts: { user?: { id: string } | null; failOn?: (c: Call) => boolean }) {
  const calls: Call[] = [];
  const resolve = async () => {
    const last = calls[calls.length - 1];
    if (opts.failOn?.(last))
      return { data: null, error: { code: "42501", message: "row-level security" } };
    return { data: null, error: null };
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
      signOut: vi.fn(async () => ({})),
    },
    from(table: string) {
      const obj: Record<string, unknown> = {};
      for (const method of ["delete", "eq"]) {
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

beforeEach(() => {
  deleteUser.mockClear();
  currentDb = makeDb({ user: { id: "u-9" } });
});

describe("POST /api/account/delete", () => {
  it("returns 401 and touches nothing when unauthenticated", async () => {
    currentDb = makeDb({ user: null });
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(401);
    expect(currentDb.calls).toHaveLength(0);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes owned lists then removes the auth user via service role", async () => {
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(200);

    // RLS-scoped delete of the caller's proposals (FK would block deleteUser).
    const delCalls = currentDb.calls.filter((c) => c.method === "delete");
    expect(delCalls.map((c) => c.table)).toEqual([
      "shortlist_proposals",
      "lists",
    ]);
    expect(
      currentDb.calls.find((c) => c.method === "eq")?.args,
    ).toEqual(["proposer_id", "u-9"]);

    // Then the auth-user removal via the admin API.
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith("u-9");

    // Signed out, redirected home with ?bye=1.
    const body = (await res.json()) as { ok: boolean; redirect: string };
    expect(body.ok).toBe(true);
    expect(body.redirect).toBe("/?bye=1");
    const signOut = (
      currentDb.client as { auth: { signOut: ReturnType<typeof vi.fn> } }
    ).auth.signOut;
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("does not touch the auth user when the list delete fails", async () => {
    currentDb = makeDb({
      user: { id: "u-9" },
      failOn: (c) => c.table === "lists",
    });
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(403);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("returns 500 without sign-out when the admin deletion fails", async () => {
    deleteUser.mockResolvedValueOnce({
      data: null,
      error: { message: "user not found" },
    });
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("user not found");
    const signOut = (
      currentDb.client as { auth: { signOut: ReturnType<typeof vi.fn> } }
    ).auth.signOut;
    expect(signOut).not.toHaveBeenCalled();
  });
});
