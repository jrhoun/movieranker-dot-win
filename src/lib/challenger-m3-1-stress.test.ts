import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  type AchievementStats,
} from "./gamification";
import { CATALOGUE, itemById } from "./cosmetics/catalogue";
import { ownedItemIds, canEquip } from "./cosmetics/ownership";
import { droppablePool, drawFrom } from "./cosmetics/canister";
import { FRAMES } from "./cosmetics/frames";
import { FRAME_CLASS } from "./cosmetics/classes";
import { FRAME_STYLE } from "./og-card";
import { TAGLINES, resolveTaglineText, taglineById } from "./cosmetics/taglines";
import { AVATARS } from "./cosmetics/avatars";
import BetaWalkthroughCard from "@/components/beta/BetaWalkthroughCard";

// Mock next/navigation for component rendering
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    push: vi.fn(),
  }),
}));

// Setup mock database for PATCH /api/profile
type Call = { table: string; method: string; args: unknown[] };
type DbResult = { data?: unknown; error?: { code?: string; message: string } | null };

let currentDb: {
  client: unknown;
  calls: Call[];
  row?: unknown | null;
  rowsByTable?: Record<string, unknown | null>;
  writeResult?: DbResult;
  rpcResult?: DbResult;
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => currentDb.client),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseSecretKey: () =>
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "sb_secret_test",
  supabaseAdmin: () => ({
    rpc: async (fn: string, params: { p_user_id: string; p_showcase: unknown }) => {
      currentDb.calls.push({ table: "profiles", method: "rpc", args: [fn, params] });
      return currentDb.rpcResult ?? { data: params.p_showcase, error: null };
    },
  }),
}));

function makeDb(opts: { user?: { id: string } | null }) {
  const calls: Call[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: opts.user ?? null }, error: null }),
    },
    from(table: string) {
      const obj: Record<string, unknown> = {};
      const eqFilters: { field: string; val: unknown }[] = [];
      let isWrite = false;
      const track = (method: string) => (...args: unknown[]) => {
        calls.push({ table, method, args });
        if (method === "eq" && typeof args[0] === "string") {
          eqFilters.push({ field: args[0], val: args[1] });
        }
        return obj;
      };
      obj.select = track("select");
      obj.eq = track("eq");
      obj.order = track("order");
      obj.in = track("in");
      obj.limit = track("limit");
      obj.not = track("not");
      obj.update = (...args: unknown[]) => {
        isWrite = true;
        return track("update")(...args);
      };
      obj.maybeSingle = async () =>
        isWrite
          ? (currentDb.writeResult ?? { data: null, error: null })
          : {
              data:
                table in (currentDb.rowsByTable ?? {})
                  ? currentDb.rowsByTable![table]
                  : (currentDb.row ?? null),
              error: null,
            };
      obj.upsert = async (...args: unknown[]) => {
        calls.push({ table, method: "upsert", args });
        return currentDb.writeResult ?? { data: null, error: null };
      };
      obj.then = (resolveCb: (v: DbResult) => void) => {
        let rawData: unknown =
          table in (currentDb.rowsByTable ?? {}) ? currentDb.rowsByTable![table] : undefined;
        if (Array.isArray(rawData)) {
          for (const f of eqFilters) {
            if (f.field === "status") {
              rawData = (rawData as Record<string, unknown>[]).filter((r) => r.status === f.val);
            }
          }
        }
        resolveCb({
          data: rawData,
          error: null,
        });
      };
      return obj;
    },
  };
  return { client, calls };
}

describe("Milestone M3 Empirical Challenger: Pioneer Challenge & Beta Canister Suite", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    currentDb = { ...makeDb({ user: { id: "u-beta-test" } }), row: null };
  });

  // ==========================================================================
  // SUITE 1: Pioneer Challenge Evaluation Edge Cases (beta_pioneer check)
  // ==========================================================================
  describe("Suite 1: Pioneer Challenge (beta_pioneer) Evaluation Edge Cases", () => {
    const betaPioneerAchievement = ACHIEVEMENTS.find((a) => a.key === "beta_pioneer");

    it("exists in ACHIEVEMENTS with exact required contract specifications", () => {
      expect(betaPioneerAchievement).toBeDefined();
      expect(betaPioneerAchievement?.key).toBe("beta_pioneer");
      expect(betaPioneerAchievement?.name).toBe("Beta Test Screener");
      expect(betaPioneerAchievement?.icon).toBe("📼");
      expect(betaPioneerAchievement?.rarity).toBe("legendary");
      expect(betaPioneerAchievement?.challenge).toBe(true);
      // Project invariant: Achievement descriptions must never end in a trailing period
      expect(betaPioneerAchievement?.description.endsWith(".")).toBe(false);
      expect(betaPioneerAchievement?.description).toBe(
        "Signed up, claimed a handle, and contributed a public ranking during public beta"
      );
    });

    const baseStats: AchievementStats = {
      doneLists: 0,
      moviesRanked: 0,
      publicDoneLists: 0,
      hasHandle: false,
      isSignedIn: false,
    };

    it("evaluates to false when all 3 criteria are false/zero", () => {
      const evaluated = evaluateAchievements(baseStats);
      const pioneer = evaluated.find((a) => a.key === "beta_pioneer");
      expect(pioneer?.unlocked).toBe(false);
    });

    describe("Edge cases for Criterion 1: publicDoneLists", () => {
      it("fails when publicDoneLists is 0 (even if hasHandle and isSignedIn are true)", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: 0,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("fails when publicDoneLists is undefined (treated as 0)", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: undefined,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("fails when publicDoneLists is negative (-1, -100)", () => {
        const statsNeg1: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: -1,
        };
        expect(betaPioneerAchievement?.check(statsNeg1)).toBe(false);

        const statsNeg100: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: -100,
        };
        expect(betaPioneerAchievement?.check(statsNeg100)).toBe(false);
      });

      it("fails when publicDoneLists is fractional < 1 (0.5, 0.99)", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: 0.99,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("passes when publicDoneLists is exactly 1 (with handle and signed in)", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(true);
      });

      it("passes when publicDoneLists is > 1 (e.g. 2, 10, 1000)", () => {
        for (const count of [2, 5, 25, 100, 1000]) {
          const stats: AchievementStats = {
            ...baseStats,
            hasHandle: true,
            isSignedIn: true,
            publicDoneLists: count,
          };
          expect(betaPioneerAchievement?.check(stats)).toBe(true);
        }
      });
    });

    describe("Edge cases for Criterion 2: hasHandle", () => {
      it("fails when hasHandle is false", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: false,
          isSignedIn: true,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("fails when hasHandle is undefined", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: undefined,
          isSignedIn: true,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("passes when hasHandle is true", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(true);
      });
    });

    describe("Edge cases for Criterion 3: isSignedIn", () => {
      it("fails when isSignedIn is false", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: false,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("fails when isSignedIn is undefined", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: undefined,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(false);
      });

      it("passes when isSignedIn is true", () => {
        const stats: AchievementStats = {
          ...baseStats,
          hasHandle: true,
          isSignedIn: true,
          publicDoneLists: 1,
        };
        expect(betaPioneerAchievement?.check(stats)).toBe(true);
      });
    });

    describe("Exhaustive 8-State Truth Table for the 3 Criteria", () => {
      const states = [
        { signedIn: false, handle: false, publicLists: 0, expected: false },
        { signedIn: false, handle: false, publicLists: 1, expected: false },
        { signedIn: false, handle: true,  publicLists: 0, expected: false },
        { signedIn: false, handle: true,  publicLists: 1, expected: false },
        { signedIn: true,  handle: false, publicLists: 0, expected: false },
        { signedIn: true,  handle: false, publicLists: 1, expected: false },
        { signedIn: true,  handle: true,  publicLists: 0, expected: false },
        { signedIn: true,  handle: true,  publicLists: 1, expected: true }, // ONLY this one!
      ];

      for (const [index, { signedIn, handle, publicLists, expected }] of states.entries()) {
        it(`State #${index + 1}: (signedIn=${signedIn}, handle=${handle}, publicLists=${publicLists}) => ${expected}`, () => {
          const stats: AchievementStats = {
            doneLists: publicLists,
            moviesRanked: publicLists * 10,
            publicDoneLists: publicLists,
            hasHandle: handle,
            isSignedIn: signedIn,
          };
          const evaluated = evaluateAchievements(stats);
          const pioneer = evaluated.find((a) => a.key === "beta_pioneer")!;
          expect(pioneer.unlocked).toBe(expected);
        });
      }
    });
  });

  // ==========================================================================
  // SUITE 2: Beta Canister Cosmetics Unlock Gate & Integrity
  // ==========================================================================
  describe("Suite 2: Beta Canister Cosmetics Unlock Gate & Integrity", () => {
    const BETA_ITEMS = ["frame.beta", "tagline.betamax", "avatar.gen.beta-reel"] as const;

    it("verifies all 3 items exist in CATALOGUE with challenge: beta_pioneer unlock", () => {
      for (const itemId of BETA_ITEMS) {
        const item = itemById(itemId);
        expect(item, `Item ${itemId} must exist in CATALOGUE`).toBeDefined();
        expect(item?.unlock).toEqual({ kind: "challenge", key: "beta_pioneer" });
        expect(item?.rarity).toBe("legendary");
      }
    });

    it("unlocks ALL 3 items when beta_pioneer achievement is unlocked", () => {
      const owned = ownedItemIds({
        userId: "user-1",
        level: 1,
        unlockedAchievementKeys: ["beta_pioneer"],
        finishedThemeSlugs: [],
      });

      for (const itemId of BETA_ITEMS) {
        expect(owned.has(itemId), `${itemId} should be owned`).toBe(true);
        expect(canEquip(itemId, owned)).toBe(true);
      }
    });

    it("locks ALL 3 items when beta_pioneer achievement is NOT in unlockedAchievementKeys", () => {
      const owned = ownedItemIds({
        userId: "user-1",
        level: 100, // Even at max level
        unlockedAchievementKeys: ["first_premiere", "marathoner", "centurion"], // other achievements
        finishedThemeSlugs: ["noir", "western", "sci-fi"],
      });

      for (const itemId of BETA_ITEMS) {
        expect(owned.has(itemId), `${itemId} must NOT be owned`).toBe(false);
        expect(canEquip(itemId, owned)).toBe(false);
      }
    });

    it("ensures Beta items NEVER exist in droppablePool(owned)", () => {
      const emptyPool = droppablePool(new Set());
      for (const item of emptyPool) {
        expect(BETA_ITEMS).not.toContain(item.id);
      }
    });

    it("verifies canister drop determinism is completely preserved regardless of beta_pioneer unlock", () => {
      const themeSlugs = ["theme-1", "theme-2", "theme-3", "theme-4", "theme-5"];
      
      // Simulate 20 users
      for (let u = 1; u <= 20; u++) {
        const userId = `user-replay-${u}`;

        const ownedWithoutPioneer = ownedItemIds({
          userId,
          level: 5,
          unlockedAchievementKeys: ["first_premiere"],
          finishedThemeSlugs: themeSlugs,
        });

        const ownedWithPioneer = ownedItemIds({
          userId,
          level: 5,
          unlockedAchievementKeys: ["first_premiere", "beta_pioneer"],
          finishedThemeSlugs: themeSlugs,
        });

        // The droppable/drop-derived items in owned must be identical
        for (const id of ownedWithoutPioneer) {
          expect(ownedWithPioneer.has(id)).toBe(true);
        }
        // The ONLY difference between the two sets must be the 3 beta items
        const diff = [...ownedWithPioneer].filter((x) => !ownedWithoutPioneer.has(x));
        expect(diff.sort()).toEqual([...BETA_ITEMS].sort());
      }
    });

    describe("Cosmetic Twin Contracts & Asset Invariants", () => {
      it("verifies frame.beta in FRAMES matches FRAME_CLASS and globals.css", () => {
        const frame = FRAMES.find((f) => f.id === "frame.beta");
        expect(frame).toBeDefined();
        expect(frame?.name).toBe("Beta Cassette");
        expect(frame?.slot).toBe("frame");

        const cssClass = FRAME_CLASS["frame.beta"];
        expect(cssClass).toBe("cf-beta");

        // Read globals.css and verify .cf-beta definition
        const globalsCssPath = resolve(process.cwd(), "src/app/globals.css");
        const globalsCss = readFileSync(globalsCssPath, "utf-8");
        expect(globalsCss).toContain(".cf-beta");
        expect(globalsCss).toContain("#f5c518"); // Cinema gold accent
      });

      it("verifies frame.beta twin in FRAME_STYLE (og-card.tsx) for Satori social cards", () => {
        const style = FRAME_STYLE["frame.beta"];
        expect(style).toBeDefined();
        expect(style.backgroundColor).toBe("#12131a");
        expect(style.boxShadow).toContain("#f5c518");
      });

      it("verifies tagline.betamax in TAGLINES and resolveTaglineText", () => {
        const tagline = taglineById("tagline.betamax");
        expect(tagline).toBeDefined();
        expect(tagline?.name).toBe("Betamax");
        expect(tagline?.text).toBe("Betamax was better");
        expect(tagline?.set).toBe("Beta Test Screener");
        expect(tagline?.rights).toBe("owned");

        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: true,
          isSignedIn: true,
        };
        expect(resolveTaglineText("tagline.betamax", stats)).toBe("Betamax was better");
      });

      it("verifies public/avatars/beta-reel.svg asset exists and has valid SVG markup", () => {
        const svgPath = resolve(process.cwd(), "public/avatars/beta-reel.svg");
        expect(existsSync(svgPath)).toBe(true);

        const svgContent = readFileSync(svgPath, "utf-8");
        expect(svgContent).toContain("<svg");
        expect(svgContent).toContain("</svg>");
        expect(svgContent).toContain("viewBox");
        // Verify cassette artwork markers
        expect(svgContent).toContain("<rect");
        expect(svgContent).toContain("<circle");

        const avatar = AVATARS.find((a) => a.id === "avatar.gen.beta-reel");
        expect(avatar).toBeDefined();
        expect(avatar?.name).toBe("Beta Reel");
      });
    });
  });

  // ==========================================================================
  // SUITE 3: Server-Side Authorization (PATCH /api/profile) Stress Testing
  // ==========================================================================
  describe("Suite 3: Server-Side Authorization (PATCH /api/profile)", () => {
    async function patchProfile(payload: { showcase?: unknown; visibility?: unknown }) {
      const { PATCH } = await import("@/app/api/profile/route");
      return PATCH(
        new Request("http://localhost/api/profile", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        })
      );
    }

    it("returns 401 Unauthenticated when session user is null", async () => {
      currentDb = { ...makeDb({ user: null }), row: null };
      const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("unauthenticated");
    });

    it("returns 409 'claim a handle first' when profiles row is null", async () => {
      currentDb.row = null;
      const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
      expect(res.status).toBe(409);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("claim a handle first");
    });

    describe("Unearned Equip Rejection (HTTP 403 Forbidden)", () => {
      it("refuses frame.beta when user has 0 lists", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        currentDb.rowsByTable = { lists: [] };
        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(403);
        const body = (await res.json()) as { error: string };
        expect(body.error).toContain('You have not unlocked "frame.beta"');
      });

      it("refuses frame.beta when user has 1 UNLISTED done list", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        currentDb.rowsByTable = {
          lists: [
            {
              theme_slug: null,
              status: "done",
              visibility: "unlisted", // Not public!
              list_movies: [{ tmdb_id: 101, poster_path: "/101.jpg" }],
            },
          ],
        };
        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(403);
      });

      it("refuses frame.beta when user has 10 UNLISTED and 5 PRIVATE done lists", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        const unlistedLists = Array.from({ length: 10 }, (_, i) => ({
          theme_slug: null,
          status: "done",
          visibility: "unlisted",
          list_movies: [{ tmdb_id: 200 + i, poster_path: `/20${i}.jpg` }],
        }));
        const privateLists = Array.from({ length: 5 }, (_, i) => ({
          theme_slug: null,
          status: "done",
          visibility: "private",
          list_movies: [{ tmdb_id: 300 + i, poster_path: `/30${i}.jpg` }],
        }));

        currentDb.rowsByTable = { lists: [...unlistedLists, ...privateLists] };
        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(403);
      });

      it("refuses frame.beta when user has a public list that is DRAFT or ABANDONED (not done)", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        currentDb.rowsByTable = {
          lists: [
            {
              theme_slug: null,
              status: "draft", // Not done!
              visibility: "public",
              list_movies: [{ tmdb_id: 401, poster_path: "/401.jpg" }],
            },
            {
              theme_slug: null,
              status: "abandoned", // Not done!
              visibility: "public",
              list_movies: [{ tmdb_id: 402, poster_path: "/402.jpg" }],
            },
          ],
        };
        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(403);
      });

      it("refuses tagline.betamax when user has 0 public done lists", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        currentDb.rowsByTable = {
          lists: [{ theme_slug: null, status: "done", visibility: "unlisted", list_movies: [] }],
        };
        const res = await patchProfile({ showcase: { equipped: { tagline: "tagline.betamax" } } });
        expect(res.status).toBe(403);
        const body = (await res.json()) as { error: string };
        expect(body.error).toContain('You have not unlocked "tagline.betamax"');
      });

      it("refuses avatar.gen.beta-reel when user has 0 public done lists", async () => {
        currentDb.row = { id: "u-beta-test", handle: "curator1", showcase: {} };
        currentDb.rowsByTable = {
          lists: [{ theme_slug: null, status: "done", visibility: "unlisted", list_movies: [] }],
        };
        const res = await patchProfile({ showcase: { equipped: { avatar: "avatar.gen.beta-reel" } } });
        expect(res.status).toBe(403);
        const body = (await res.json()) as { error: string };
        expect(body.error).toContain('You have not unlocked "avatar.gen.beta-reel"');
      });

      it("refuses when user has a public done list but handle is null/empty", async () => {
        currentDb.row = { id: "u-beta-test", handle: null, showcase: {} };
        currentDb.rowsByTable = {
          lists: [{ theme_slug: null, status: "done", visibility: "public", list_movies: [] }],
        };
        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(403);
      });
    });

    describe("Earned Equip Allowance (HTTP 200 OK)", () => {
      const validProfile = { id: "u-beta-test", handle: "curator1", showcase: {} };
      const validDoneLists = [
        {
          theme_slug: null,
          status: "done",
          visibility: "public", // Done AND public!
          list_movies: [{ tmdb_id: 501, poster_path: "/501.jpg" }],
        },
      ];

      it("permits equipping frame.beta once all criteria are met", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({ showcase: { equipped: { frame: "frame.beta" } } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.frame).toBe("frame.beta");
      });

      it("permits equipping tagline.betamax and resolves taglineText server-side", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({ showcase: { equipped: { tagline: "tagline.betamax" } } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.tagline).toBe("tagline.betamax");
        expect(body.showcase.equipped?.taglineText).toBe("Betamax was better");
      });

      it("permits equipping avatar.gen.beta-reel once all criteria are met", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({ showcase: { equipped: { avatar: "avatar.gen.beta-reel" } } });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.avatar).toBe("avatar.gen.beta-reel");
      });

      it("permits equipping all 3 Beta Canister items simultaneously", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({
          showcase: {
            equipped: {
              frame: "frame.beta",
              tagline: "tagline.betamax",
              avatar: "avatar.gen.beta-reel",
            },
          },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.frame).toBe("frame.beta");
        expect(body.showcase.equipped?.tagline).toBe("tagline.betamax");
        expect(body.showcase.equipped?.taglineText).toBe("Betamax was better");
        expect(body.showcase.equipped?.avatar).toBe("avatar.gen.beta-reel");
      });

      it("strips forged client-sent taglineText and replaces it with server-derived value", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({
          showcase: {
            equipped: {
              tagline: "tagline.betamax",
              taglineText: "<script>alert('pwned')</script>", // Attacker injection attempt
            },
          },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.taglineText).toBe("Betamax was better");
        expect(body.showcase.equipped?.taglineText).not.toContain("<script>");
      });

      it("refuses cross-slot equip attacks (e.g. frame.beta into avatar slot)", async () => {
        currentDb.row = validProfile;
        currentDb.rowsByTable = { lists: validDoneLists };

        const res = await patchProfile({
          showcase: {
            equipped: {
              avatar: "frame.beta", // Cross-slot injection attempt
            },
          },
        });
        expect(res.status).toBe(403);
      });

      it("properly clears equipped beta items when passed null", async () => {
        currentDb.row = {
          id: "u-beta-test",
          handle: "curator1",
          showcase: {
            equipped: {
              frame: "frame.beta",
              tagline: "tagline.betamax",
              taglineText: "Betamax was better",
            },
          },
        };
        currentDb.rowsByTable = { lists: validDoneLists };
        currentDb.writeResult = { data: { id: "u-beta-test" }, error: null };

        const res = await patchProfile({
          showcase: {
            equipped: {
              tagline: null, // Clear tagline
            },
          },
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as { showcase: { equipped?: Record<string, unknown> } };
        expect(body.showcase.equipped?.frame).toBe("frame.beta");
        expect(body.showcase.equipped?.tagline).toBeUndefined();
        expect(body.showcase.equipped?.taglineText).toBeUndefined(); // Also cleared!
      });
    });
  });

  // ==========================================================================
  // SUITE 4: UI Walkthrough Component Edge Cases (BetaWalkthroughCard)
  // ==========================================================================
  describe("Suite 4: UI Walkthrough Component Edge Cases (BetaWalkthroughCard)", () => {
    it("renders correctly with 0/3 steps complete (signed out, no handle, 0 lists)", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: false,
          hasHandle: false,
          publicDoneLists: 0,
        })
      );
      expect(html).toContain("0 / 3");
      expect(html).toContain("Sign In →");
      expect(html).toContain("Claim Handle →");
      expect(html).toContain("Start Ranking →");
      expect(html).not.toContain("Challenge Complete!");
      expect(html).not.toContain("Claim Beta Canister");
    });

    it("renders correctly with 1/3 steps complete (signed in only)", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: true,
          hasHandle: false,
          publicDoneLists: 0,
        })
      );
      expect(html).toContain("1 / 3");
      expect(html).toContain("Signed in &amp; authenticated");
      expect(html).toContain("Claim Handle →");
      expect(html).toContain("Start Ranking →");
      expect(html).not.toContain("Challenge Complete!");
    });

    it("renders correctly with 2/3 steps complete (signed in + claimed handle)", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: true,
          hasHandle: true,
          publicDoneLists: 0,
        })
      );
      expect(html).toContain("2 / 3");
      expect(html).toContain("Curator handle claimed");
      expect(html).toContain("Start Ranking →");
      expect(html).not.toContain("Challenge Complete!");
    });

    it("renders correctly with 3/3 steps complete (all done)", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: true,
          hasHandle: true,
          publicDoneLists: 1,
        })
      );
      expect(html).toContain("3 / 3");
      expect(html).toContain("1 public ranking settled");
      expect(html).toContain("Challenge Complete!");
      expect(html).toContain("Claim Beta Canister");
    });

    it("handles pluralization for multiple public rankings settled", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: true,
          hasHandle: true,
          publicDoneLists: 7,
        })
      );
      expect(html).toContain("3 / 3");
      expect(html).toContain("7 public rankings settled");
    });

    it("renders reward cards and active equipped states when beta item is equipped", () => {
      const html = renderToStaticMarkup(
        h(BetaWalkthroughCard, {
          isSignedIn: true,
          hasHandle: true,
          publicDoneLists: 1,
          equipped: {
            avatar: "avatar.gen.beta-reel",
            frame: "frame.beta",
            tagline: "tagline.betamax",
          },
        })
      );
      expect(html).toContain("Beta Canister Cosmetics Unlocked");
      expect(html).toContain("Beta Reel");
      expect(html).toContain("Beta Cassette");
      expect(html).toContain("Betamax");
      // All 3 items should show Equipped ✓
      const equippedCount = (html.match(/Equipped ✓/g) || []).length;
      expect(equippedCount).toBe(3);
    });

    it("handles missing/undefined props gracefully without crashing", () => {
      const html = renderToStaticMarkup(h(BetaWalkthroughCard, {}));
      expect(html).toBeDefined();
      expect(html).toContain("Beta Test Screening");
    });
  });

  // ==========================================================================
  // SUITE 5: Exact Dispatch Scenarios & End-to-End Derivation Pipeline
  // ==========================================================================
  describe("Suite 5: Exact Dispatch Scenarios & Derivation Pipeline", () => {
    describe("Prompt Scenario A: User with 0 public lists vs 1 unlisted list vs 1 public list", () => {
      it("Case 1: User with 0 public lists (0 lists total) -> beta_pioneer LOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 0,
          moviesRanked: 0,
          publicDoneLists: 0,
          hasHandle: true,
          isSignedIn: true,
        };
        const pioneer = evaluateAchievements(stats).find((a) => a.key === "beta_pioneer");
        expect(pioneer?.unlocked).toBe(false);
      });

      it("Case 2: User with 1 unlisted list (0 public lists) -> beta_pioneer LOCKED", () => {
        // User finished 1 list, but it was unlisted (publicDoneLists is 0)
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 0, // Unlisted does NOT increment publicDoneLists
          hasHandle: true,
          isSignedIn: true,
        };
        const pioneer = evaluateAchievements(stats).find((a) => a.key === "beta_pioneer");
        expect(pioneer?.unlocked).toBe(false);
      });

      it("Case 3: User with 1 public list -> beta_pioneer UNLOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1, // Public ranking contributed!
          hasHandle: true,
          isSignedIn: true,
        };
        const pioneer = evaluateAchievements(stats).find((a) => a.key === "beta_pioneer");
        expect(pioneer?.unlocked).toBe(true);
      });
    });

    describe("Prompt Scenario B: User with handle vs without handle", () => {
      it("Case 1: User without handle (handle is undefined) -> beta_pioneer LOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: false,
          isSignedIn: true,
        };
        expect(evaluateAchievements(stats).find((a) => a.key === "beta_pioneer")?.unlocked).toBe(false);
      });

      it("Case 2: User without handle (handle is null/empty string mapped via Boolean) -> beta_pioneer LOCKED", () => {
        for (const rawHandle of [null, undefined, ""]) {
          const stats: AchievementStats = {
            doneLists: 1,
            moviesRanked: 10,
            publicDoneLists: 1,
            hasHandle: Boolean(rawHandle),
            isSignedIn: true,
          };
          expect(evaluateAchievements(stats).find((a) => a.key === "beta_pioneer")?.unlocked).toBe(false);
        }
      });

      it("Case 3: User with handle (handle is claimed) -> beta_pioneer UNLOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: Boolean("cinephile_99"),
          isSignedIn: true,
        };
        expect(evaluateAchievements(stats).find((a) => a.key === "beta_pioneer")?.unlocked).toBe(true);
      });
    });

    describe("Prompt Scenario C: User signed in vs signed out", () => {
      it("Case 1: User signed out (isSignedIn = false) -> beta_pioneer LOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: true,
          isSignedIn: false,
        };
        expect(evaluateAchievements(stats).find((a) => a.key === "beta_pioneer")?.unlocked).toBe(false);
      });

      it("Case 2: User signed in (isSignedIn = true) -> beta_pioneer UNLOCKED", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: true,
          isSignedIn: true,
        };
        expect(evaluateAchievements(stats).find((a) => a.key === "beta_pioneer")?.unlocked).toBe(true);
      });
    });

    describe("Prompt Scenario D: Beta Canister items unlocked ONLY when all 3 criteria satisfied", () => {
      const allThreeItems = ["frame.beta", "tagline.betamax", "avatar.gen.beta-reel"] as const;

      const subcombinations = [
        { desc: "0/3: none", signedIn: false, handle: false, publicLists: 0 },
        { desc: "1/3: signedIn only", signedIn: true, handle: false, publicLists: 0 },
        { desc: "1/3: handle only", signedIn: false, handle: true, publicLists: 0 },
        { desc: "1/3: publicList only", signedIn: false, handle: false, publicLists: 1 },
        { desc: "2/3: signedIn + handle (missing public list)", signedIn: true, handle: true, publicLists: 0 },
        { desc: "2/3: signedIn + publicList (missing handle)", signedIn: true, handle: false, publicLists: 1 },
        { desc: "2/3: handle + publicList (missing signedIn)", signedIn: false, handle: true, publicLists: 1 },
      ];

      for (const sub of subcombinations) {
        it(`Criteria test (${sub.desc}): None of the 3 Beta Canister items are unlocked`, () => {
          const stats: AchievementStats = {
            doneLists: sub.publicLists,
            moviesRanked: sub.publicLists * 10,
            publicDoneLists: sub.publicLists,
            hasHandle: sub.handle,
            isSignedIn: sub.signedIn,
          };
          const unlockedKeys = evaluateAchievements(stats)
            .filter((a) => a.unlocked)
            .map((a) => a.key);

          expect(unlockedKeys).not.toContain("beta_pioneer");

          const owned = ownedItemIds({
            userId: "u-test",
            level: 1,
            unlockedAchievementKeys: unlockedKeys,
            finishedThemeSlugs: [],
          });

          for (const item of allThreeItems) {
            expect(owned.has(item), `${item} must be locked for ${sub.desc}`).toBe(false);
          }
        });
      }

      it("Criteria test (3/3: all satisfied): ALL 3 Beta Canister items are unlocked simultaneously", () => {
        const stats: AchievementStats = {
          doneLists: 1,
          moviesRanked: 10,
          publicDoneLists: 1,
          hasHandle: true,
          isSignedIn: true,
        };
        const unlockedKeys = evaluateAchievements(stats)
          .filter((a) => a.unlocked)
          .map((a) => a.key);

        expect(unlockedKeys).toContain("beta_pioneer");

        const owned = ownedItemIds({
          userId: "u-test",
          level: 1,
          unlockedAchievementKeys: unlockedKeys,
          finishedThemeSlugs: [],
        });

        for (const item of allThreeItems) {
          expect(owned.has(item), `${item} must be owned`).toBe(true);
        }
      });
    });
  });
});

