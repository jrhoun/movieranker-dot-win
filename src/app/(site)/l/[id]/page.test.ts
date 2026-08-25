import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; method: string; args: unknown[] };

let calls: Call[];

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => client),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("notFound");
  },
}));

vi.mock("@/components/list/ListViews", () => ({ default: () => null }));
vi.mock("@/components/MarqueeHeading", () => ({ default: () => null }));
vi.mock("@/components/list/OwnerControls", () => ({ default: () => null }));
vi.mock("@/components/ParticipantChips", () => ({ default: () => null }));
vi.mock("@/components/ShareButton", () => ({ default: () => null }));

process.env.NEXT_PUBLIC_SITE_URL ??= "https://movieranker.win";

const OWNER_ID = "u-owner";
const LIST_ID = "L123456789";

const LIST_ROW = {
  id: LIST_ID,
  title: "Space Movies",
  description: null,
  participants: [],
  status: "done",
  owner_id: OWNER_ID,
  theme_slug: "space",
};

function makeClient() {
  calls = [];
  const from = (table: string) => {
    let sawMaybeSingle = false;
    const obj: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "order", "maybeSingle"]) {
      obj[method] = (...args: unknown[]) => {
        if (method === "maybeSingle") sawMaybeSingle = true;
        calls.push({ table, method, args });
        return obj;
      };
    }
    obj.then = (
      onFulfilled?: (v: unknown) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => {
      let data: unknown = [];
      if (table === "lists") data = sawMaybeSingle ? LIST_ROW : [LIST_ROW];
      return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
    };
    return obj;
  };
  return {
    auth: { getUser: async () => ({ data: { user: { id: OWNER_ID } }, error: null }) },
    from,
  };
}

let client: ReturnType<typeof makeClient>;

beforeEach(() => {
  client = makeClient();
});

describe("PublicListPage themed verdict query", () => {
  it("scopes themed-room aggregation to unlisted/public for signed-in owners", async () => {
    const Page = (await import("./page")).default;
    await Page({ params: Promise.resolve({ id: LIST_ID }) });

    // The themed lists fetch (theme_slug + status='done') must also exclude private rows.
    const themedCall = [...calls]
      .reverse()
      .find((c) => c.table === "lists" && c.method === "eq" && c.args[0] === "theme_slug");
    expect(themedCall).toBeDefined();
    const afterThemed = calls.slice(calls.indexOf(themedCall!));
    expect(afterThemed.map((c) => `${c.table}:${c.method}:${c.args[0]}`)).toContain(
      'lists:eq:status',
    );
    expect(
      calls.some(
        (c) =>
          c.table === "lists" &&
          c.method === "in" &&
          c.args[0] === "visibility" &&
          JSON.stringify(c.args[1]) === JSON.stringify(["unlisted", "public"]),
      ),
    ).toBe(true);
  });
});
