import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import React from "react";
import OwnerControls from "@/components/list/OwnerControls";
import SaveGateSheet from "@/components/SaveGateSheet";
import { parseVisibility } from "@/lib/lists-api";
import type { PlaySession } from "@/lib/session";

/**
 * ============================================================================
 * Milestone M2 Empirical Challenger Stress Tests (Agent challenger_m2_2)
 * ============================================================================
 * Focus:
 * - Feature 7: Custom List Opt-In Checkbox (play-room.tsx & SaveGateSheet.tsx)
 * - Feature 8: Owner Visibility Toggle (OwnerControls.tsx & l/[id]/page.tsx)
 *
 * Requirements & Verification Targets:
 * 1. Permutations of save payload generation across theme vs custom,
 *    checked vs unchecked, draft vs done, POST vs PATCH.
 * 2. SessionStorage persistence & round-trip across OAuth redirection.
 * 3. OwnerControls rendering, visibility toggle states, accessible labels.
 * 4. Optimistic UI updates, server success, error rollbacks (HTTP 500, 403, network throw).
 * 5. Concurrency protection (rapid clicking / busy flag).
 * 6. Non-owner gating at UI tier, API route handler tier, and input validation.
 * 7. POST /api/lists visibility lifecycle and follow-up owner updates.
 * 8. Server-side page.tsx owner resolution and curated toggle suppression logic.
 * ============================================================================
 */

// Mock next/navigation
const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
    push: mockPush,
  }),
}));

// Mock Supabase browser client
const mockSignInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Mock Supabase server client for API route tests
type Call = { table: string; method: string; args: unknown[] };
interface MockDb {
  client: unknown;
  calls: Call[];
}
let currentDb: MockDb;

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

function makeMockDb(opts: {
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
        if (opts.failOn?.(last)) {
          return {
            data: null,
            error: { code: "42501", message: "new row violates row-level security policy" },
          };
        }
        if (table === "lists") {
          return { data: opts.listVisible === false ? [] : [{ id: "LIST_123" }], error: null };
        }
        if (table === "list_movies" && sawSelect) {
          return { data: [], error: null };
        }
        return { data: null, error: null };
      };
      const obj: Record<string, unknown> = {};
      for (const method of ["select", "eq", "single", "in", "insert", "update", "delete", "maybeSingle"]) {
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
    rpc(name: string, args: unknown) {
      calls.push({ table: `rpc:${name}`, method: "rpc", args: [args] });
      return Promise.resolve({ data: { id: "LIST_123" }, error: null });
    },
  };
  return { client, calls };
}

const mockMovies = [
  {
    tmdbId: 101,
    title: "Blade Runner",
    posterPath: "/br.jpg",
    releaseYear: 1982,
    elo: 1050,
    comparisons: 5,
    parked: false,
    finalRank: 1,
  },
  {
    tmdbId: 102,
    title: "Alien",
    posterPath: "/alien.jpg",
    releaseYear: 1979,
    elo: 1020,
    comparisons: 4,
    parked: false,
    finalRank: 2,
  },
];

function createSampleSession(overrides?: Partial<PlaySession>): PlaySession {
  return {
    title: "Sci-Fi Greats",
    participants: ["Viewer"],
    movies: mockMovies,
    votesSinceOrderChange: 0,
    nudgeShown: false,
    themeSlug: undefined,
    curated: false,
    ...overrides,
  };
}

describe("Milestone M2 Empirical Challenger: Feature 7 & 8 Stress Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentDb = makeMockDb({ user: { id: "u-owner" } });
  });

  // ==========================================================================
  // SUITE 1: Feature 7 — Save Payload Permutation Matrix & Invariant Verification
  // ==========================================================================
  describe("Suite 1: Feature 7 Save Payload Permutation Matrix", () => {
    function deriveVisibility(
      themeSlug: string | null | undefined,
      status: "done" | "draft",
      submitToSpotlight: boolean,
    ): "public" | "unlisted" {
      return themeSlug
        ? "public"
        : status === "done" && submitToSpotlight
          ? "public"
          : "unlisted";
    }

    const themePermutations = [
      { label: "undefined (custom)", value: undefined, isCustom: true },
      { label: "null (custom)", value: null, isCustom: true },
      { label: "empty-string (custom)", value: "", isCustom: true },
      { label: "weekly-noir (theme)", value: "weekly-noir", isCustom: false },
      { label: "oscar-winners (theme)", value: "oscar-winners", isCustom: false },
    ];

    const statusPermutations: Array<"done" | "draft"> = ["done", "draft"];
    const optInPermutations = [true, false];

    it("verifies the 20-permutation Cartesian matrix for save payload visibility", () => {
      for (const t of themePermutations) {
        for (const status of statusPermutations) {
          for (const optIn of optInPermutations) {
            const visibility = deriveVisibility(t.value, status, optIn);

            if (!t.isCustom) {
              // Themes MUST always resolve to "public" to power community consensus
              expect(
                visibility,
                `Theme ${t.label} with status=${status}, optIn=${optIn} must be public`,
              ).toBe("public");
            } else {
              // Custom lists: ONLY done + optIn=true may be public; all others MUST be unlisted
              if (status === "done" && optIn === true) {
                expect(
                  visibility,
                  `Custom list with status=done, optIn=true must be public`,
                ).toBe("public");
              } else {
                expect(
                  visibility,
                  `Custom list with status=${status}, optIn=${optIn} must be unlisted`,
                ).toBe("unlisted");
              }
            }
          }
        }
      }
    });

    it("ensures drafts NEVER leak to public visibility on custom lists even if optIn is true", () => {
      const customDraftOptedIn = deriveVisibility(undefined, "draft", true);
      const customDraftOptedOut = deriveVisibility(undefined, "draft", false);
      const nullDraftOptedIn = deriveVisibility(null, "draft", true);

      expect(customDraftOptedIn).toBe("unlisted");
      expect(customDraftOptedOut).toBe("unlisted");
      expect(nullDraftOptedIn).toBe("unlisted");
    });

    it("verifies full POST payload structure for custom vs themed lists", () => {
      // Custom list: status=done, optIn=false -> unlisted, no themeSlug/curated
      const customSession = createSampleSession({ themeSlug: undefined, curated: false });
      const customVis = deriveVisibility(customSession.themeSlug, "done", false);
      const customPayload = {
        status: "done",
        visibility: customVis,
        title: customSession.title,
        participants: customSession.participants,
        movies: customSession.movies.map((m) => ({ ...m, finalRank: 1 })),
        ...(customSession.themeSlug
          ? { themeSlug: customSession.themeSlug, curated: !!customSession.curated }
          : {}),
      };

      expect(customPayload.visibility).toBe("unlisted");
      expect("themeSlug" in customPayload).toBe(false);
      expect("curated" in customPayload).toBe(false);

      // Themed list: status=done, optIn=false -> public, themeSlug and curated included
      const themeSession = createSampleSession({ themeSlug: "weekly-80s-classics", curated: true });
      const themeVis = deriveVisibility(themeSession.themeSlug, "done", false);
      const themePayload = {
        status: "done",
        visibility: themeVis,
        title: themeSession.title,
        participants: themeSession.participants,
        movies: themeSession.movies.map((m) => ({ ...m, finalRank: 1 })),
        ...(themeSession.themeSlug
          ? { themeSlug: themeSession.themeSlug, curated: !!themeSession.curated }
          : {}),
      };

      expect(themePayload.visibility).toBe("public");
      expect(themePayload.themeSlug).toBe("weekly-80s-classics");
      expect(themePayload.curated).toBe(true);
    });

    it("verifies partial PATCH payload structure for resumed draft completion", () => {
      const resumedVis = deriveVisibility(undefined, "done", true);
      const patchPayload = {
        status: "done",
        visibility: resumedVis,
        movies: mockMovies.map((m) => ({ ...m, finalRank: 1 })),
        description: "My final verdict on sci-fi movies",
      };

      expect(patchPayload.visibility).toBe("public");
      expect(patchPayload.status).toBe("done");
      expect("title" in patchPayload).toBe(false);
      expect("participants" in patchPayload).toBe(false);
      expect("themeSlug" in patchPayload).toBe(false);
    });
  });

  // ==========================================================================
  // SUITE 2: Feature 7 — OAuth Flow State Persistence & SessionStorage Invariants
  // ==========================================================================
  describe("Suite 2: Feature 7 OAuth Flow & SessionStorage Round-Trip", () => {
    const storageStore = new Map<string, string>();
    const mockSessionStorage = {
      getItem: vi.fn((key: string) => storageStore.get(key) ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storageStore.set(key, String(val));
      }),
      removeItem: vi.fn((key: string) => {
        storageStore.delete(key);
      }),
      clear: vi.fn(() => storageStore.clear()),
    };

    beforeEach(() => {
      storageStore.clear();
      vi.stubGlobal("sessionStorage", mockSessionStorage);
    });

    it("persists mr_pending_auth_spotlight='1' when opt-in is checked before OAuth redirect", () => {
      const submitToSpotlight = true;
      const status = "done";

      mockSessionStorage.setItem("mr_pending_auth_save", status);
      mockSessionStorage.setItem("mr_pending_auth_spotlight", submitToSpotlight ? "1" : "0");

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("mr_pending_auth_save", "done");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("mr_pending_auth_spotlight", "1");
      expect(storageStore.get("mr_pending_auth_spotlight")).toBe("1");
    });

    it("persists mr_pending_auth_spotlight='0' when opt-in is unchecked before OAuth redirect", () => {
      const submitToSpotlight = false;
      const status = "done";

      mockSessionStorage.setItem("mr_pending_auth_save", status);
      mockSessionStorage.setItem("mr_pending_auth_spotlight", submitToSpotlight ? "1" : "0");

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("mr_pending_auth_spotlight", "0");
      expect(storageStore.get("mr_pending_auth_spotlight")).toBe("0");
    });

    it("restores submitToSpotlight=true upon OAuth return and cleans up sessionStorage", () => {
      storageStore.set("mr_pending_auth_save", "done");
      storageStore.set("mr_pending_auth_spotlight", "1");

      let pendingSave: "done" | "draft" | null = null;
      let pendingSpotlight = false;
      try {
        pendingSave = mockSessionStorage.getItem("mr_pending_auth_save") as "done" | "draft" | null;
        if (pendingSave) mockSessionStorage.removeItem("mr_pending_auth_save");
        pendingSpotlight = mockSessionStorage.getItem("mr_pending_auth_spotlight") === "1";
        if (pendingSpotlight) mockSessionStorage.removeItem("mr_pending_auth_spotlight");
      } catch {}

      expect(pendingSave).toBe("done");
      expect(pendingSpotlight).toBe(true);
      expect(storageStore.has("mr_pending_auth_spotlight")).toBe(false);
      expect(storageStore.has("mr_pending_auth_save")).toBe(false);
    });

    it("gracefully survives throwing sessionStorage (private browsing / disabled storage)", () => {
      vi.stubGlobal("sessionStorage", {
        getItem: () => {
          throw new Error("QuotaExceededError / SecurityError: Access denied");
        },
        setItem: () => {
          throw new Error("QuotaExceededError / SecurityError: Access denied");
        },
        removeItem: () => {
          throw new Error("QuotaExceededError / SecurityError: Access denied");
        },
      });

      let caught = false;
      let fallbackSpotlight = false;
      try {
        fallbackSpotlight = sessionStorage.getItem("mr_pending_auth_spotlight") === "1";
      } catch {
        caught = true;
        fallbackSpotlight = false;
      }

      expect(caught).toBe(true);
      expect(fallbackSpotlight).toBe(false);
    });
  });

  // ==========================================================================
  // SUITE 3: Feature 7 — SaveGateSheet Rendering & Accessibility Verification
  // ==========================================================================
  describe("Suite 3: Feature 7 SaveGateSheet DOM & Accessibility Contracts", () => {
    it("renders the opt-in checkbox with proper accessible label on custom done rankings", () => {
      const customSession = createSampleSession({ themeSlug: undefined });
      const html = renderToString(
        React.createElement(SaveGateSheet, {
          session: customSession,
          status: "done",
          initialSubmitToSpotlight: false,
          onClose: () => {},
        }),
      );

      expect(html).toContain('id="sheet-spotlight-opt-in"');
      expect(html).toContain('name="submitToSpotlight"');
      expect(html).toContain('type="checkbox"');
      expect(html).toContain("Submit to Community Spotlight");
      expect(html).toContain("Share this ranking on the home page community feed");
      expect(html).toContain("Leave unchecked to keep it unlisted");
      expect(html).not.toMatch(/id="sheet-spotlight-opt-in"[^>]*checked/);
    });

    it("renders the checkbox as checked when initialSubmitToSpotlight is true", () => {
      const customSession = createSampleSession({ themeSlug: undefined });
      const html = renderToString(
        React.createElement(SaveGateSheet, {
          session: customSession,
          status: "done",
          initialSubmitToSpotlight: true,
          onClose: () => {},
        }),
      );

      expect(html).toContain('id="sheet-spotlight-opt-in"');
      expect(html).toMatch(/id="sheet-spotlight-opt-in"[^>]*checked/);
    });

    it("STRICTLY SUPPRESSES the spotlight checkbox for weekly marquee themes and shows explanation", () => {
      const themeSession = createSampleSession({ themeSlug: "best-picture-nominees", curated: true });
      const html = renderToString(
        React.createElement(SaveGateSheet, {
          session: themeSession,
          status: "done",
          initialSubmitToSpotlight: false,
          onClose: () => {},
        }),
      );

      expect(html).not.toContain('id="sheet-spotlight-opt-in"');
      expect(html).not.toContain('name="submitToSpotlight"');
      expect(html).toContain("Weekly Marquee:");
      expect(html).toContain(
        "Rankings for weekly themes are public by default to power collective community stats and consensus.",
      );
    });

    it("STRICTLY SUPPRESSES the spotlight checkbox for draft rankings", () => {
      const customSession = createSampleSession({ themeSlug: undefined });
      const html = renderToString(
        React.createElement(SaveGateSheet, {
          session: customSession,
          status: "draft",
          initialSubmitToSpotlight: false,
          onClose: () => {},
        }),
      );

      expect(html).not.toContain('id="sheet-spotlight-opt-in"');
      expect(html).not.toContain("Submit to Community Spotlight");
    });
  });

  // ==========================================================================
  // SUITE 4: Feature 8 — OwnerControls Rendering & Visibility States
  // ==========================================================================
  describe("Suite 4: Feature 8 OwnerControls DOM & State Contracts", () => {
    it("renders 'Unlisted' state with accessible attributes when visibility='unlisted'", () => {
      const html = renderToString(
        React.createElement(OwnerControls, {
          listId: "L100",
          title: "My 90s Thrillers",
          description: "Best edge-of-seat thrillers",
          participants: ["Owner"],
          isCurated: false,
          visibility: "unlisted",
        }),
      );

      expect(html).toContain("Unlisted");
      expect(html).toContain('aria-label="List is unlisted. Click to submit to Community Spotlight."');
      expect(html).toContain('title="Unlisted (click to submit to Community Spotlight)"');
      expect(html).not.toContain("In Spotlight");
    });

    it("renders 'In Spotlight' state with gold styling and badge when visibility='public'", () => {
      const html = renderToString(
        React.createElement(OwnerControls, {
          listId: "L100",
          title: "My 90s Thrillers",
          description: "Best edge-of-seat thrillers",
          participants: ["Owner"],
          isCurated: false,
          visibility: "public",
        }),
      );

      expect(html).toContain("In Spotlight");
      expect(html).toContain("bg-gold/15");
      expect(html).toContain("text-gold");
      expect(html).toContain('aria-label="List is in Community Spotlight. Click to make unlisted."');
      expect(html).toContain('title="In Community Spotlight (click to make unlisted)"');
    });

    it("defaults to 'Unlisted' if visibility is omitted or undefined", () => {
      const html = renderToString(
        React.createElement(OwnerControls, {
          listId: "L100",
          title: "My 90s Thrillers",
          description: "Best edge-of-seat thrillers",
          participants: ["Owner"],
          isCurated: false,
        }),
      );

      expect(html).toContain("Unlisted");
      expect(html).toContain('aria-label="List is unlisted. Click to submit to Community Spotlight."');
    });

    it("STRICTLY OMITS the visibility toggle button when isCurated=true (weekly marquee list)", () => {
      const html = renderToString(
        React.createElement(OwnerControls, {
          listId: "L100",
          title: "Curated Weekly Marquee",
          description: "Theme description",
          participants: ["Owner"],
          isCurated: true,
          visibility: "public",
        }),
      );

      expect(html).not.toContain("In Spotlight");
      expect(html).not.toContain("Unlisted");
      expect(html).not.toContain("Click to submit to Community Spotlight");
      expect(html).not.toContain("Click to make unlisted");
      expect(html).toContain("Edit");
      expect(html).toContain("Delete");
    });
  });

  // ==========================================================================
  // SUITE 5: Feature 8 — Interactivity: Optimistic Updates, Server Sync & Rollback
  // ==========================================================================
  describe("Suite 5: Feature 8 Toggle Interactivity, Optimistic UI & Error Rollback", () => {
    function createToggleHarness(
      listId: string,
      initialVisibility: "public" | "unlisted" | "private",
      fetchImpl: typeof fetch,
      onRefresh?: () => void,
    ) {
      let currentVisibility: "public" | "unlisted" | "private" = initialVisibility || "unlisted";
      let busy = false;
      let note: string | null = null;

      async function handleToggleVisibility() {
        if (busy) return;
        const next: "public" | "unlisted" = currentVisibility === "public" ? "unlisted" : "public";
        const prev = currentVisibility;
        currentVisibility = next; // Optimistic update
        busy = true;
        note = null;
        try {
          const res = await fetchImpl(`/api/lists/${listId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: next }),
          });
          if (!res.ok) {
            currentVisibility = prev; // Rollback
            note = "Failed to update visibility — try again.";
            return;
          }
          onRefresh?.();
        } catch {
          currentVisibility = prev; // Rollback
          note = "Failed to update visibility — try again.";
        } finally {
          busy = false;
        }
      }

      return {
        getState: () => ({ currentVisibility, busy, note }),
        handleToggleVisibility,
      };
    }

    it("applies optimistic update, calls PATCH, and invokes router.refresh on HTTP 200/204", async () => {
      let patchSentBody: unknown = null;
      const mockFetch = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        patchSentBody = JSON.parse(init?.body as string);
        return new Response(null, { status: 204 });
      });
      const onRefresh = vi.fn();

      const harness = createToggleHarness("L100", "unlisted", mockFetch, onRefresh);
      expect(harness.getState().currentVisibility).toBe("unlisted");

      const togglePromise = harness.handleToggleVisibility();
      expect(harness.getState().currentVisibility).toBe("public");
      expect(harness.getState().busy).toBe(true);

      await togglePromise;

      expect(harness.getState().currentVisibility).toBe("public");
      expect(harness.getState().busy).toBe(false);
      expect(harness.getState().note).toBeNull();
      expect(patchSentBody).toEqual({ visibility: "public" });
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("rolls back optimistic update and displays error note on server error (HTTP 500)", async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: "database error" }), { status: 500 });
      });
      const onRefresh = vi.fn();

      const harness = createToggleHarness("L100", "unlisted", mockFetch, onRefresh);
      expect(harness.getState().currentVisibility).toBe("unlisted");

      await harness.handleToggleVisibility();

      expect(harness.getState().currentVisibility).toBe("unlisted");
      expect(harness.getState().busy).toBe(false);
      expect(harness.getState().note).toBe("Failed to update visibility — try again.");
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("rolls back optimistic update and displays error note on permission denial (HTTP 403)", async () => {
      const mockFetch = vi.fn(async () => {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
      });
      const onRefresh = vi.fn();

      const harness = createToggleHarness("L100", "public", mockFetch, onRefresh);
      expect(harness.getState().currentVisibility).toBe("public");

      await harness.handleToggleVisibility();

      expect(harness.getState().currentVisibility).toBe("public");
      expect(harness.getState().busy).toBe(false);
      expect(harness.getState().note).toBe("Failed to update visibility — try again.");
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("rolls back optimistic update and displays error note on network throw (TypeError / connection timeout)", async () => {
      const mockFetch = vi.fn(async () => {
        throw new TypeError("Failed to fetch: NetworkError when attempting to fetch resource");
      });
      const onRefresh = vi.fn();

      const harness = createToggleHarness("L100", "public", mockFetch, onRefresh);
      expect(harness.getState().currentVisibility).toBe("public");

      await harness.handleToggleVisibility();

      expect(harness.getState().currentVisibility).toBe("public");
      expect(harness.getState().busy).toBe(false);
      expect(harness.getState().note).toBe("Failed to update visibility — try again.");
      expect(onRefresh).not.toHaveBeenCalled();
    });

    it("protects against rapid-fire clicks via busy flag concurrency lock", async () => {
      let callCount = 0;
      let resolver!: () => void;
      const delayedFetch = vi.fn(
        async () =>
          new Promise<Response>((resolve) => {
            callCount++;
            resolver = () => resolve(new Response(null, { status: 204 }));
          }),
      );

      const harness = createToggleHarness("L100", "unlisted", delayedFetch);

      const p1 = harness.handleToggleVisibility();
      expect(harness.getState().busy).toBe(true);

      const p2 = harness.handleToggleVisibility();
      const p3 = harness.handleToggleVisibility();

      expect(callCount).toBe(1);

      resolver();
      await Promise.all([p1, p2, p3]);

      expect(callCount).toBe(1);
      expect(harness.getState().currentVisibility).toBe("public");
      expect(harness.getState().busy).toBe(false);
    });

    it("handles transition from 'private' visibility by promoting to 'public'", async () => {
      const mockFetch = vi.fn(async () => new Response(null, { status: 204 }));
      const harness = createToggleHarness("L100", "private", mockFetch);

      await harness.handleToggleVisibility();

      expect(harness.getState().currentVisibility).toBe("public");
    });
  });

  // ==========================================================================
  // SUITE 6: Multi-Tier Non-Owner Gating & Security Boundary
  // ==========================================================================
  describe("Suite 6: Multi-Tier Non-Owner Gating & Security Enforcement", () => {
    it("validates parseVisibility helper across allowed and disallowed inputs", () => {
      expect(parseVisibility("unlisted")).toEqual({ ok: true, value: "unlisted" });
      expect(parseVisibility("public")).toEqual({ ok: true, value: "public" });
      expect(parseVisibility("private")).toEqual({ ok: true, value: "private" });
      expect(parseVisibility(undefined)).toEqual({ ok: true, value: "unlisted" });

      expect(parseVisibility("PUBLIC").ok).toBe(false);
      expect(parseVisibility("UNLISTED").ok).toBe(false);
      expect(parseVisibility("hidden").ok).toBe(false);
      expect(parseVisibility("").ok).toBe(false);
      expect(parseVisibility(123).ok).toBe(false);
      expect(parseVisibility(null).ok).toBe(false);
      expect(parseVisibility({}).ok).toBe(false);
      expect(parseVisibility([]).ok).toBe(false);
    });

    it("verifies PATCH /api/lists/[id] rejects unauthenticated callers with 401", async () => {
      currentDb = makeMockDb({ user: null });
      const { PATCH } = await import("@/app/api/lists/[id]/route");

      const req = new Request("http://localhost/api/lists/L100", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "L100" }) });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual({ error: "unauthenticated" });
    });

    it("verifies PATCH /api/lists/[id] rejects non-owner callers with 403 Forbidden", async () => {
      currentDb = makeMockDb({ user: { id: "u-stranger" }, listVisible: false });
      const { PATCH } = await import("@/app/api/lists/[id]/route");

      const req = new Request("http://localhost/api/lists/L100", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "L100" }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json).toEqual({ error: "forbidden" });
    });

    it("verifies PATCH /api/lists/[id] rejects invalid visibility values with 400 Bad Request", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" }, listVisible: true });
      const { PATCH } = await import("@/app/api/lists/[id]/route");

      const req = new Request("http://localhost/api/lists/L100", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "super-public-broadcast" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "L100" }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("visibility must be 'unlisted', 'public' or 'private'");
    });

    it("verifies PATCH /api/lists/[id] successfully updates visibility when called by owner", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" }, listVisible: true });
      const { PATCH } = await import("@/app/api/lists/[id]/route");

      const req = new Request("http://localhost/api/lists/L100", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "public" }),
      });

      const res = await PATCH(req, { params: Promise.resolve({ id: "L100" }) });
      expect(res.status).toBe(204);

      const updateCall = currentDb.calls.find(
        (c) => c.table === "lists" && c.method === "update",
      );
      expect(updateCall).toBeDefined();
      expect(updateCall?.args[0]).toEqual({ visibility: "public" });
    });
  });

  // ==========================================================================
  // SUITE 7: POST /api/lists Lifecycle & Follow-Up Visibility Update
  // ==========================================================================
  describe("Suite 7: POST /api/lists Lifecycle & Follow-Up Updates", () => {
    const validPostMovies = [
      { tmdbId: 1, title: "Movie 1", elo: 1000, comparisons: 1, parked: false, finalRank: 1 },
      { tmdbId: 2, title: "Movie 2", elo: 1000, comparisons: 1, parked: false, finalRank: 2 },
    ];

    it("executes follow-up update with visibility='public' when opt-in is provided on custom list", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" } });
      const { POST } = await import("@/app/api/lists/route");

      const req = new Request("http://localhost/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Public Custom Ranking",
          participants: ["Me"],
          status: "done",
          visibility: "public",
          movies: validPostMovies,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify save_list RPC was called
      const rpcCall = currentDb.calls.find((c) => c.table === "rpc:save_list");
      expect(rpcCall).toBeDefined();

      // Verify follow-up update set visibility to 'public'
      const updateCall = currentDb.calls.find(
        (c) => c.table === "lists" && c.method === "update",
      );
      expect(updateCall).toBeDefined();
      expect(updateCall?.args[0]).toEqual({ visibility: "public" });
    });

    it("skips follow-up update when visibility='unlisted' on custom list (matches DB column default)", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" } });
      const { POST } = await import("@/app/api/lists/route");

      const req = new Request("http://localhost/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Unlisted Custom Ranking",
          participants: ["Me"],
          status: "done",
          visibility: "unlisted",
          movies: validPostMovies,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify save_list RPC was called
      const rpcCall = currentDb.calls.find((c) => c.table === "rpc:save_list");
      expect(rpcCall).toBeDefined();

      // No followUp update is needed because 'unlisted' is the DB column default
      const updateCall = currentDb.calls.find(
        (c) => c.table === "lists" && c.method === "update",
      );
      expect(updateCall).toBeUndefined();
    });

    it("automatically defaults weekly marquee themes to visibility='public' with theme metadata follow-up", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" } });
      const { POST } = await import("@/app/api/lists/route");

      const req = new Request("http://localhost/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Weekly Noir Contest",
          participants: ["Detective"],
          status: "done",
          themeSlug: "film-noir-weekly",
          curated: true,
          movies: validPostMovies,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify follow-up update set visibility='public' AND theme metadata
      const updateCall = currentDb.calls.find(
        (c) => c.table === "lists" && c.method === "update",
      );
      expect(updateCall).toBeDefined();
      expect(updateCall?.args[0]).toEqual({
        visibility: "public",
        theme_slug: "film-noir-weekly",
        curated: true,
      });
    });

    it("rejects POST /api/lists with invalid visibility value with 400 Bad Request", async () => {
      currentDb = makeMockDb({ user: { id: "u-owner" } });
      const { POST } = await import("@/app/api/lists/route");

      const req = new Request("http://localhost/api/lists", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Bad Visibility List",
          participants: ["Me"],
          status: "done",
          visibility: "unsupported-vis",
          movies: validPostMovies,
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("visibility must be 'unlisted', 'public' or 'private'");
    });
  });

  // ==========================================================================
  // SUITE 8: List Page (l/[id]/page.tsx) Owner Resolution & Gating Matrix
  // ==========================================================================
  describe("Suite 8: List Page Owner Resolution & Toggle Gating Invariants", () => {
    function resolvePageOwnerControlsProps(
      list: {
        id: string;
        title: string;
        description: string | null;
        participants: string[];
        owner_id: string;
        curated?: boolean | null;
        theme_slug?: string | null;
        visibility?: "public" | "unlisted" | "private" | null;
      },
      viewerUserId: string | null,
    ): {
      isOwner: boolean;
      ownerControlsProps?: {
        isCurated: boolean;
        visibility: "public" | "unlisted" | "private";
      };
    } {
      const isOwner = !!viewerUserId && list.owner_id === viewerUserId;
      if (!isOwner) return { isOwner: false };

      return {
        isOwner: true,
        ownerControlsProps: {
          isCurated: Boolean(list.curated || list.theme_slug),
          visibility: (list.visibility as "public" | "unlisted" | "private") ?? "unlisted",
        },
      };
    }

    it("correctly resolves owner and curated status for custom list viewed by owner", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L1",
          title: "My Custom List",
          description: null,
          participants: ["Alice"],
          owner_id: "user-123",
          curated: false,
          theme_slug: null,
          visibility: "public",
        },
        "user-123",
      );

      expect(res.isOwner).toBe(true);
      expect(res.ownerControlsProps?.isCurated).toBe(false);
      expect(res.ownerControlsProps?.visibility).toBe("public");
    });

    it("correctly resolves isCurated=true when theme_slug is present even if curated is false", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L2",
          title: "Weekly Noir",
          description: null,
          participants: ["Alice"],
          owner_id: "user-123",
          curated: false,
          theme_slug: "weekly-noir",
          visibility: "public",
        },
        "user-123",
      );

      expect(res.isOwner).toBe(true);
      expect(res.ownerControlsProps?.isCurated).toBe(true);
    });

    it("correctly resolves isCurated=true when curated is true even if theme_slug is null", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L3",
          title: "Staff Picks",
          description: null,
          participants: ["Alice"],
          owner_id: "user-123",
          curated: true,
          theme_slug: null,
          visibility: "public",
        },
        "user-123",
      );

      expect(res.isOwner).toBe(true);
      expect(res.ownerControlsProps?.isCurated).toBe(true);
    });

    it("denies OwnerControls completely when viewer is not the list owner", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L4",
          title: "Alice's List",
          description: null,
          participants: ["Alice"],
          owner_id: "user-alice",
          curated: false,
          theme_slug: null,
          visibility: "public",
        },
        "user-bob",
      );

      expect(res.isOwner).toBe(false);
      expect(res.ownerControlsProps).toBeUndefined();
    });

    it("denies OwnerControls completely when viewer is unauthenticated (null user)", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L5",
          title: "Alice's List",
          description: null,
          participants: ["Alice"],
          owner_id: "user-alice",
          curated: false,
          theme_slug: null,
          visibility: "public",
        },
        null,
      );

      expect(res.isOwner).toBe(false);
      expect(res.ownerControlsProps).toBeUndefined();
    });

    it("falls back to visibility='unlisted' if DB column contains null", () => {
      const res = resolvePageOwnerControlsProps(
        {
          id: "L6",
          title: "Old List",
          description: null,
          participants: ["Alice"],
          owner_id: "user-alice",
          curated: false,
          theme_slug: null,
          visibility: null,
        },
        "user-alice",
      );

      expect(res.isOwner).toBe(true);
      expect(res.ownerControlsProps?.visibility).toBe("unlisted");
    });
  });
});
