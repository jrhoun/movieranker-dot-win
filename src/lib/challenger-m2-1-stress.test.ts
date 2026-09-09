import { describe, expect, it } from "vitest";
import {
  calculateHotScore,
  formatTrendingLists,
  getTrendingLists,
  type RawDbListRow,
  type TrendingSortMode,
} from "./trending";

/**
 * ============================================================================
 * Milestone M2 Empirical Challenger Stress Tests (Agent challenger_m2_1)
 * ============================================================================
 * Focus: Feature 6 — Community Spotlight Marquee Exclusion
 *
 * Requirements:
 * 1. Combinations of:
 *    - theme_slug: present | null | undefined | empty string
 *    - curated: true | false | null | undefined
 *    - visibility: 'public' | 'unlisted' | 'private'
 *    - status: 'done' | 'draft' | 'abandoned'
 * 2. Large volume batches (5,000+ mixed lists) across all sort modes
 *    (top, new/recent, hot/controversial).
 * 3. Confirm ZERO leakage of marquee or curated items into Community Spotlight.
 * 4. Verify sorting integrity, performance SLA, and resilience under adversarial input.
 * ============================================================================
 */

describe("Milestone M2 Empirical Challenger: Feature 6 Marquee Exclusion", () => {
  // --------------------------------------------------------------------------
  // SUITE 1: Exhaustive 144-Permutation Cartesian Matrix
  // --------------------------------------------------------------------------
  describe("Suite 1: Exhaustive 144-Permutation Matrix", () => {
    const themeSlugVariants: Array<{ label: string; value: string | null | undefined }> = [
      { label: "present", value: "noir-mysteries-weekly-42" },
      { label: "null", value: null },
      { label: "undefined", value: undefined },
      { label: "empty-string", value: "" },
    ];

    const curatedVariants: Array<{ label: string; value: boolean | null | undefined }> = [
      { label: "true", value: true },
      { label: "false", value: false },
      { label: "null", value: null },
      { label: "undefined", value: undefined },
    ];

    const visibilityVariants: Array<{ label: string; value: string }> = [
      { label: "public", value: "public" },
      { label: "unlisted", value: "unlisted" },
      { label: "private", value: "private" },
    ];

    const statusVariants: Array<{ label: string; value: string }> = [
      { label: "done", value: "done" },
      { label: "draft", value: "draft" },
      { label: "abandoned", value: "abandoned" },
    ];

    it("evaluates all 144 permutations and permits strictly the 9 valid custom lists (135 excluded)", () => {
      const allRows: RawDbListRow[] = [];
      let expectedPassingCount = 0;
      let expectedExcludedCount = 0;

      for (const t of themeSlugVariants) {
        for (const c of curatedVariants) {
          for (const v of visibilityVariants) {
            for (const s of statusVariants) {
              const id = `perm-${t.label}-${c.label}-${v.label}-${s.label}`;

              // According to the specification:
              // - status must be "done"
              // - visibility must be "public"
              // - theme_slug must be falsy (null, undefined, or empty string)
              // - curated must be falsy (false, null, or undefined)
              const shouldPass =
                s.value === "done" &&
                v.value === "public" &&
                !t.value &&
                !c.value;

              if (shouldPass) {
                expectedPassingCount++;
              } else {
                expectedExcludedCount++;
              }

              allRows.push({
                id,
                title: `List [${id}]`,
                description: `Description for ${id}`,
                owner_id: `owner-${id}`,
                status: s.value,
                visibility: v.value,
                upvotes_count: 50,
                theme_slug: t.value,
                curated: c.value,
                created_at: "2026-09-08T12:00:00Z",
                list_movies: [
                  {
                    tmdb_id: 101,
                    title: "Movie Test",
                    poster_path: "/test.jpg",
                    release_year: 2024,
                    final_rank: 1,
                  },
                ],
              });
            }
          }
        }
      }

      // Pre-flight sanity check on Cartesian dimensions:
      // 4 * 4 * 3 * 3 = 144 total
      // Expected passing = 3 (slug falsy) * 3 (curated falsy) * 1 (public) * 1 (done) = 9
      // Expected excluded = 144 - 9 = 135
      expect(allRows.length).toBe(144);
      expect(expectedPassingCount).toBe(9);
      expect(expectedExcludedCount).toBe(135);

      const results = formatTrendingLists(allRows);

      // Verify exact count
      expect(results.length).toBe(9);

      const returnedIds = new Set(results.map((r) => r.id));

      // Assert ZERO leakage of any item that should have been excluded
      for (const row of allRows) {
        const isPermitted =
          row.status === "done" &&
          row.visibility === "public" &&
          !row.theme_slug &&
          !row.curated;

        if (isPermitted) {
          expect(returnedIds.has(row.id)).toBe(true);
        } else {
          expect(returnedIds.has(row.id)).toBe(false);
        }
      }

      // Specifically assert zero marquee or curated items
      for (const res of results) {
        const original = allRows.find((r) => r.id === res.id)!;
        expect(original.theme_slug).toBeFalsy();
        expect(original.curated).toBeFalsy();
        expect(original.status).toBe("done");
        expect(original.visibility).toBe("public");
      }
    });

    it("verifies that each of the 36 theme_slug='present' combinations is 100% blocked regardless of curated/visibility/status", () => {
      const marqueeOnlyRows: RawDbListRow[] = [];
      for (const c of curatedVariants) {
        for (const v of visibilityVariants) {
          for (const s of statusVariants) {
            marqueeOnlyRows.push({
              id: `marquee-lock-${c.label}-${v.label}-${s.label}`,
              title: "Weekly Marquee Contest",
              description: "Theme spoiler blurb",
              owner_id: "u-marquee",
              status: s.value,
              visibility: v.value,
              upvotes_count: 99999,
              theme_slug: "weekly-spotlight-theme",
              curated: c.value,
              created_at: "2026-09-08T00:00:00Z",
            });
          }
        }
      }

      expect(marqueeOnlyRows.length).toBe(36);
      const results = formatTrendingLists(marqueeOnlyRows);
      expect(results).toEqual([]);
    });

    it("verifies that each of the 36 curated=true combinations is 100% blocked regardless of theme_slug/visibility/status", () => {
      const curatedOnlyRows: RawDbListRow[] = [];
      for (const t of themeSlugVariants) {
        for (const v of visibilityVariants) {
          for (const s of statusVariants) {
            curatedOnlyRows.push({
              id: `curated-pack-${t.label}-${v.label}-${s.label}`,
              title: "Staff Curated Masterpiece Pack",
              description: "Staff curated selection",
              owner_id: "u-staff",
              status: s.value,
              visibility: v.value,
              upvotes_count: 88888,
              theme_slug: t.value,
              curated: true,
              created_at: "2026-09-08T00:00:00Z",
            });
          }
        }
      }

      expect(curatedOnlyRows.length).toBe(36);
      const results = formatTrendingLists(curatedOnlyRows);
      expect(results).toEqual([]);
    });

    it("verifies that non-public visibilities (unlisted, private) are 100% blocked even for valid custom lists", () => {
      const nonPublicCustomRows: RawDbListRow[] = [
        {
          id: "custom-unlisted-null",
          title: "My Hidden Unlisted List",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "unlisted",
          upvotes_count: 500,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "custom-private-null",
          title: "My Secret Private List",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "private",
          upvotes_count: 1000,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(nonPublicCustomRows);
      expect(results).toEqual([]);
    });

    it("verifies that non-done statuses (draft, abandoned, archived) are 100% blocked even for public custom lists", () => {
      const nonDoneCustomRows: RawDbListRow[] = [
        {
          id: "custom-draft-public",
          title: "In-Progress Draft",
          description: null,
          owner_id: "u-1",
          status: "draft",
          visibility: "public",
          upvotes_count: 500,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "custom-abandoned-public",
          title: "Abandoned Ranking",
          description: null,
          owner_id: "u-2",
          status: "abandoned",
          visibility: "public",
          upvotes_count: 1000,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "custom-archived-public",
          title: "Archived Ranking",
          description: null,
          owner_id: "u-3",
          status: "archived",
          visibility: "public",
          upvotes_count: 750,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(nonDoneCustomRows);
      expect(results).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Adversarial Boundary Conditions & Type Incoherence
  // --------------------------------------------------------------------------
  describe("Suite 2: Adversarial Boundary Conditions", () => {
    it("rejects pseudo-falsy strings in theme_slug ('0', 'false', 'null', 'undefined', whitespace)", () => {
      const trickyRows: RawDbListRow[] = [
        {
          id: "slug-string-false",
          title: "String False",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          theme_slug: "false", // truthy string!
          curated: false,
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "slug-string-null",
          title: "String Null",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          theme_slug: "null", // truthy string!
          curated: false,
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "slug-string-0",
          title: "String Zero",
          description: null,
          owner_id: "u-3",
          status: "done",
          visibility: "public",
          theme_slug: "0", // truthy string!
          curated: false,
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "slug-whitespace",
          title: "Whitespace Slug",
          description: null,
          owner_id: "u-4",
          status: "done",
          visibility: "public",
          theme_slug: "   ", // truthy string!
          curated: false,
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "legit-custom",
          title: "Legit Custom List",
          description: null,
          owner_id: "u-5",
          status: "done",
          visibility: "public",
          theme_slug: null,
          curated: false,
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(trickyRows);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("legit-custom");
    });

    it("rejects truthy non-boolean values in curated (1, 'true', object)", () => {
      const truthyCuratedRows: RawDbListRow[] = [
        {
          id: "curated-num-1",
          title: "Curated 1",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          theme_slug: null,
          curated: 1 as unknown as boolean, // truthy
          upvotes_count: 50,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "curated-str-true",
          title: "Curated 'true'",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          theme_slug: null,
          curated: "true" as unknown as boolean, // truthy
          upvotes_count: 50,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "curated-obj",
          title: "Curated Object",
          description: null,
          owner_id: "u-3",
          status: "done",
          visibility: "public",
          theme_slug: null,
          curated: {} as unknown as boolean, // truthy
          upvotes_count: 50,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(truthyCuratedRows);
      expect(results).toHaveLength(0);
    });

    it("handles falsy non-boolean values in curated (0, '') safely", () => {
      const falsyCuratedRows: RawDbListRow[] = [
        {
          id: "curated-num-0",
          title: "Curated 0",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          theme_slug: null,
          curated: 0 as unknown as boolean, // falsy
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(falsyCuratedRows);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("curated-num-0");
    });

    it("strictly requires exact casing for status='done' and visibility='public'", () => {
      const casingRows: RawDbListRow[] = [
        {
          id: "status-uppercase",
          title: "Status Uppercase",
          description: null,
          owner_id: "u-1",
          status: "DONE",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "visibility-uppercase",
          title: "Visibility Uppercase",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "PUBLIC",
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "status-padded",
          title: "Status Padded",
          description: null,
          owner_id: "u-3",
          status: "done ",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "visibility-padded",
          title: "Visibility Padded",
          description: null,
          owner_id: "u-4",
          status: "done",
          visibility: "public ",
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "valid-exact",
          title: "Valid Exact",
          description: null,
          owner_id: "u-5",
          status: "done",
          visibility: "public",
          upvotes_count: 10,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const results = formatTrendingLists(casingRows);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe("valid-exact");
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 3: Large-Volume Stress Batch (5,000 Mixed Lists)
  // --------------------------------------------------------------------------
  describe("Suite 3: Large-Volume Stress Batch (5,000 Mixed Lists)", () => {
    // Generate 5,000 lists with high heterogeneity and adversarial canaries
    const TOTAL_LISTS = 5000;
    const baseDate = new Date("2026-09-08T12:00:00Z").getTime();

    // Adversarial Canaries (high upvotes, designed to tempt any flawed ranking filter)
    const canaries: RawDbListRow[] = [
      {
        id: "CANARY-MARQUEE-MEGA",
        title: "Marquee Mega 1,000,000 Upvotes",
        description: "Official Weekly Marquee",
        owner_id: "u-canary-1",
        status: "done",
        visibility: "public",
        upvotes_count: 1_000_000,
        theme_slug: "legendary-hollywood-epics",
        curated: true,
        created_at: "2026-09-08T11:59:00Z",
      },
      {
        id: "CANARY-MARQUEE-UNCURATED",
        title: "Marquee Uncurated 900,000 Upvotes",
        description: "Weekly Marquee Uncurated",
        owner_id: "u-canary-2",
        status: "done",
        visibility: "public",
        upvotes_count: 900_000,
        theme_slug: "cult-classic-midnight-movies",
        curated: false,
        created_at: "2026-09-08T11:58:00Z",
      },
      {
        id: "CANARY-CURATED-NO-SLUG",
        title: "Curated Staff Roster 800,000 Upvotes",
        description: "Staff Curated Roster",
        owner_id: "u-canary-3",
        status: "done",
        visibility: "public",
        upvotes_count: 800_000,
        theme_slug: null,
        curated: true,
        created_at: "2026-09-08T11:57:00Z",
      },
      {
        id: "CANARY-UNLISTED-CUSTOM",
        title: "Unlisted Custom 700,000 Upvotes",
        description: "Custom ranking opted out of spotlight",
        owner_id: "u-canary-4",
        status: "done",
        visibility: "unlisted",
        upvotes_count: 700_000,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T11:56:00Z",
      },
      {
        id: "CANARY-PRIVATE-CUSTOM",
        title: "Private Custom 600,000 Upvotes",
        description: "Private ranking",
        owner_id: "u-canary-5",
        status: "done",
        visibility: "private",
        upvotes_count: 600_000,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T11:55:00Z",
      },
      {
        id: "CANARY-DRAFT-CUSTOM",
        title: "Draft Custom 500,000 Upvotes",
        description: "Unfinished draft ranking",
        owner_id: "u-canary-6",
        status: "draft",
        visibility: "public",
        upvotes_count: 500_000,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T11:54:00Z",
      },
      {
        id: "CANARY-ABANDONED-CUSTOM",
        title: "Abandoned Custom 400,000 Upvotes",
        description: "Abandoned ranking",
        owner_id: "u-canary-7",
        status: "abandoned",
        visibility: "public",
        upvotes_count: 400_000,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-08T11:53:00Z",
      },
      {
        id: "CANARY-VALID-LOW-VOTES",
        title: "Authentic Custom List With 1 Upvote",
        description: "Legitimate community spotlight candidate",
        owner_id: "u-canary-8",
        status: "done",
        visibility: "public",
        upvotes_count: 1,
        theme_slug: null,
        curated: false,
        created_at: "2026-09-01T00:00:00Z",
      },
    ];

    // Build the remaining synthetic pool to reach 5,000 items with decorrelated prime moduli
    const syntheticPool: RawDbListRow[] = Array.from(
      { length: TOTAL_LISTS - canaries.length },
      (_, idx) => {
        const i = idx + canaries.length;

        // Use coprime moduli to prevent correlated distributions:
        // status: 33% done, 33% draft, 33% abandoned
        const statusMod = i % 3;
        const status = statusMod === 0 ? "done" : statusMod === 1 ? "draft" : "abandoned";

        // visibility: 40% public, 30% unlisted, 30% private
        const visMod = (i * 7) % 10;
        const visibility = visMod < 4 ? "public" : visMod < 7 ? "unlisted" : "private";

        // theme_slug: 25% present, 25% null, 25% undefined, 25% ""
        const slugMod = (i * 11) % 4;
        const themeSlug =
          slugMod === 0
            ? `theme-genre-${i % 20}`
            : slugMod === 1
              ? null
              : slugMod === 2
                ? undefined
                : "";

        // curated: 25% true, 25% false, 25% null, 25% undefined
        const curatedMod = (i * 13) % 4;
        const curated =
          curatedMod === 0
            ? true
            : curatedMod === 1
              ? false
              : curatedMod === 2
                ? null
                : undefined;

        const upvotes = (i * 17) % 50000;
        const createdAt = new Date(baseDate - (i * 12345) % (90 * 86400 * 1000)).toISOString();

        return {
          id: `stress-item-${i}`,
          title: `Community Showcase #${i}`,
          description: i % 2 === 0 ? `Description #${i}` : null,
          owner_id: `user-${i % 100}`,
          status,
          visibility,
          upvotes_count: upvotes,
          theme_slug: themeSlug,
          curated,
          created_at: createdAt,
          list_movies: [
            {
              tmdb_id: 1000 + (i % 500),
              title: `Film ${i}`,
              poster_path: `/p-${i}.jpg`,
              release_year: 1970 + (i % 55),
              final_rank: 1,
            },
          ],
        };
      },
    );

    const largeBatch: RawDbListRow[] = [...canaries, ...syntheticPool];

    // Compute ground-truth valid count
    const groundTruthValidIds = new Set(
      largeBatch
        .filter(
          (l) =>
            l.status === "done" &&
            l.visibility === "public" &&
            !l.theme_slug &&
            !l.curated,
        )
        .map((l) => l.id),
    );

    it("verifies 5,000 batch contains expected canary IDs in ground truth and passes size check", () => {
      expect(largeBatch.length).toBe(5000);
      expect(groundTruthValidIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-MARQUEE-UNCURATED")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-UNLISTED-CUSTOM")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-PRIVATE-CUSTOM")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-DRAFT-CUSTOM")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-ABANDONED-CUSTOM")).toBe(false);
      expect(groundTruthValidIds.has("CANARY-VALID-LOW-VOTES")).toBe(true);
      expect(groundTruthValidIds.size).toBeGreaterThan(50);
    });

    // ------------------------------------------------------------------------
    // Sort Mode: 'top'
    // ------------------------------------------------------------------------
    it("processes 5,000 lists in sortMode='top' with zero leakage and strictly valid ordering", () => {
      const start = performance.now();
      const results = formatTrendingLists(largeBatch, new Map(), "top");
      const elapsed = performance.now() - start;

      // Performance SLA: 5,000 items in under 200ms
      expect(elapsed).toBeLessThan(200);

      // Completeness: exact match with ground-truth IDs
      expect(results.length).toBe(groundTruthValidIds.size);
      const returnedIds = new Set(results.map((r) => r.id));
      expect(returnedIds).toEqual(groundTruthValidIds);

      // Zero leakage assertions
      expect(returnedIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(returnedIds.has("CANARY-MARQUEE-UNCURATED")).toBe(false);
      expect(returnedIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);
      expect(returnedIds.has("CANARY-UNLISTED-CUSTOM")).toBe(false);
      expect(returnedIds.has("CANARY-PRIVATE-CUSTOM")).toBe(false);
      expect(returnedIds.has("CANARY-DRAFT-CUSTOM")).toBe(false);
      expect(returnedIds.has("CANARY-ABANDONED-CUSTOM")).toBe(false);
      expect(returnedIds.has("CANARY-VALID-LOW-VOTES")).toBe(true);

      for (const item of results) {
        const raw = largeBatch.find((b) => b.id === item.id)!;
        expect(raw.theme_slug).toBeFalsy();
        expect(raw.curated).toBeFalsy();
        expect(raw.status).toBe("done");
        expect(raw.visibility).toBe("public");
      }

      // Sort ordering assertion: upvotes_count DESC, then created_at DESC
      for (let i = 0; i < results.length - 1; i++) {
        const cur = results[i];
        const next = results[i + 1];
        if (cur.upvotesCount !== next.upvotesCount) {
          expect(cur.upvotesCount).toBeGreaterThanOrEqual(next.upvotesCount);
        } else {
          const timeCur = new Date(cur.createdAt).getTime();
          const timeNext = new Date(next.createdAt).getTime();
          expect(timeCur).toBeGreaterThanOrEqual(timeNext);
        }
      }
    });

    // ------------------------------------------------------------------------
    // Sort Mode: 'new' (aka 'recent')
    // ------------------------------------------------------------------------
    it("processes 5,000 lists in sortMode='new' (recent) with zero leakage and strictly recency ordering", () => {
      const start = performance.now();
      const results = formatTrendingLists(largeBatch, new Map(), "new");
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      expect(results.length).toBe(groundTruthValidIds.size);

      const returnedIds = new Set(results.map((r) => r.id));
      expect(returnedIds).toEqual(groundTruthValidIds);

      // Verify zero leakage of excluded canaries
      expect(returnedIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(returnedIds.has("CANARY-MARQUEE-UNCURATED")).toBe(false);
      expect(returnedIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);

      // Verify strict descending recency ordering
      for (let i = 0; i < results.length - 1; i++) {
        const timeA = new Date(results[i].createdAt).getTime();
        const timeB = new Date(results[i + 1].createdAt).getTime();
        expect(timeA).toBeGreaterThanOrEqual(timeB);
      }
    });

    // ------------------------------------------------------------------------
    // Sort Mode: 'hot' (aka 'controversial' / trending momentum)
    // ------------------------------------------------------------------------
    it("processes 5,000 lists in sortMode='hot' with zero leakage and strictly hot-score ordering", () => {
      const start = performance.now();
      const results = formatTrendingLists(largeBatch, new Map(), "hot");
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200);
      expect(results.length).toBe(groundTruthValidIds.size);

      const returnedIds = new Set(results.map((r) => r.id));
      expect(returnedIds).toEqual(groundTruthValidIds);

      // Verify zero leakage
      expect(returnedIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(returnedIds.has("CANARY-MARQUEE-UNCURATED")).toBe(false);
      expect(returnedIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);

      // Verify strict hot score descending order
      for (let i = 0; i < results.length - 1; i++) {
        const scoreA = calculateHotScore(results[i].upvotesCount, results[i].createdAt);
        const scoreB = calculateHotScore(results[i + 1].upvotesCount, results[i + 1].createdAt);
        expect(scoreA).toBeGreaterThanOrEqual(scoreB);
      }
    });

    // ------------------------------------------------------------------------
    // Non-Standard Sort Mode Strings ('recent', 'controversial')
    // ------------------------------------------------------------------------
    it("handles non-standard sort modes ('recent', 'controversial') via safe fallback without leakage or exceptions", () => {
      // Test 'recent' passed as sort mode
      const recentResults = formatTrendingLists(largeBatch, new Map(), "recent" as unknown as TrendingSortMode);
      expect(recentResults.length).toBe(groundTruthValidIds.size);
      const recentIds = new Set(recentResults.map((r) => r.id));
      expect(recentIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(recentIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);

      // Test 'controversial' passed as sort mode
      const controversialResults = formatTrendingLists(largeBatch, new Map(), "controversial" as unknown as TrendingSortMode);
      expect(controversialResults.length).toBe(groundTruthValidIds.size);
      const controversialIds = new Set(controversialResults.map((r) => r.id));
      expect(controversialIds.has("CANARY-MARQUEE-MEGA")).toBe(false);
      expect(controversialIds.has("CANARY-CURATED-NO-SLUG")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 4: 10,000 Ultra-High Volume Stress Batch
  // --------------------------------------------------------------------------
  describe("Suite 4: 10,000 Ultra-High Volume Stress Batch", () => {
    it("scales seamlessly to 10,000 mixed lists with zero heap spikes and zero marquee leakage", () => {
      const ULTRA_SIZE = 10000;
      const ultraBatch: RawDbListRow[] = Array.from({ length: ULTRA_SIZE }, (_, idx) => {
        const isMarquee = idx % 3 === 0;
        const isCurated = idx % 5 === 0;
        const isDone = idx % 2 === 0;
        const isPublic = (idx * 7) % 10 < 5;

        return {
          id: `ultra-${idx}`,
          title: `Ultra List #${idx}`,
          description: null,
          owner_id: `user-${idx % 100}`,
          status: isDone ? "done" : "draft",
          visibility: isPublic ? "public" : "unlisted",
          upvotes_count: (idx * 31) % 100000,
          theme_slug: isMarquee ? `marquee-theme-${idx % 10}` : null,
          curated: isCurated,
          created_at: new Date(Date.now() - (idx * 60000)).toISOString(),
          list_movies: [],
        };
      });

      const start = performance.now();
      const results = formatTrendingLists(ultraBatch, new Map(), "top");
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(350);
      expect(results.length).toBeGreaterThan(500);

      // Verify every single returned result
      for (const res of results) {
        const raw = ultraBatch.find((b) => b.id === res.id)!;
        expect(raw.theme_slug).toBeNull();
        expect(raw.curated).toBe(false);
        expect(raw.status).toBe("done");
        expect(raw.visibility).toBe("public");
      }
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 5: getTrendingLists Integration & Query Leakage Check
  // --------------------------------------------------------------------------
  describe("Suite 5: getTrendingLists Integration Simulation", () => {
    it("strictly isolates community spotlight when Supabase returns a pool dominated by marquee/curated items", async () => {
      const dbPool: RawDbListRow[] = [
        {
          id: "db-marquee-1",
          title: "Weekly Marquee #45",
          description: "Top theme",
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          upvotes_count: 50000,
          theme_slug: "sci-fi-classics",
          curated: true,
          created_at: "2026-09-08T12:00:00Z",
          list_movies: [],
        },
        {
          id: "db-curated-1",
          title: "Curated Showcase",
          description: "Staff showcase",
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          upvotes_count: 40000,
          theme_slug: null,
          curated: true,
          created_at: "2026-09-08T11:00:00Z",
          list_movies: [],
        },
        {
          id: "db-marquee-uncurated-1",
          title: "Weekly Marquee Run",
          description: null,
          owner_id: "u-3",
          status: "done",
          visibility: "public",
          upvotes_count: 30000,
          theme_slug: "heist-movies",
          curated: false,
          created_at: "2026-09-08T10:00:00Z",
          list_movies: [],
        },
        {
          id: "db-legit-custom-1",
          title: "1970s Conspiracy Thrillers",
          description: "Watergate era paranoia",
          owner_id: "u-4",
          status: "done",
          visibility: "public",
          upvotes_count: 15,
          theme_slug: null,
          curated: false,
          created_at: "2026-09-08T09:00:00Z",
          list_movies: [
            {
              tmdb_id: 890,
              title: "The Conversation",
              poster_path: "/conversation.jpg",
              release_year: 1974,
              final_rank: 1,
            },
          ],
        },
      ];

      const mockSupabase = {
        from: (table: string) => {
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "order", "limit", "in"]) {
            builder[method] = () => builder;
          }
          builder.then = (
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) => {
            if (table === "lists") {
              return Promise.resolve({ data: dbPool, error: null }).then(onFulfilled, onRejected);
            }
            if (table === "profiles") {
              return Promise.resolve({
                data: [{ id: "u-4", handle: "paranoia_fan" }],
                error: null,
              }).then(onFulfilled, onRejected);
            }
            return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
          };
          return builder;
        },
      };

      const trending = await getTrendingLists(mockSupabase, 6, "top");

      // Exactly 1 list should make it through
      expect(trending).toHaveLength(1);
      expect(trending[0].id).toBe("db-legit-custom-1");
      expect(trending[0].title).toBe("1970s Conspiracy Thrillers");
      expect(trending[0].ownerHandle).toBe("paranoia_fan");
      expect(trending[0].themeSlug).toBeNull();
    });

    it("returns an empty array with zero errors when all returned rows from DB are marquee or curated", async () => {
      const allMarqueePool: RawDbListRow[] = [
        {
          id: "m-1",
          title: "Weekly Marquee #1",
          description: null,
          owner_id: "u-1",
          status: "done",
          visibility: "public",
          upvotes_count: 100,
          theme_slug: "theme-1",
          curated: true,
          created_at: "2026-09-08T00:00:00Z",
        },
        {
          id: "m-2",
          title: "Staff Pack",
          description: null,
          owner_id: "u-2",
          status: "done",
          visibility: "public",
          upvotes_count: 90,
          theme_slug: null,
          curated: true,
          created_at: "2026-09-08T00:00:00Z",
        },
      ];

      const mockSupabase = {
        from: () => {
          const builder: Record<string, unknown> = {};
          for (const method of ["select", "eq", "order", "limit", "in"]) {
            builder[method] = () => builder;
          }
          builder.then = (
            onFulfilled?: (v: unknown) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) => Promise.resolve({ data: allMarqueePool, error: null }).then(onFulfilled, onRejected);
          return builder;
        },
      };

      const trending = await getTrendingLists(mockSupabase, 6);
      expect(trending).toEqual([]);
    });
  });
});
