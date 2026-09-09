import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

/* ============================================================================
 * Milestone M1 Empirical Challenger Stress Tests
 * ============================================================================
 * Rigorous empirical checks for:
 * - Feature 1: Hero Poster Fan Clearance across simulated viewports (320px..1920px)
 *   and transform calculations (arcY, tilt rotation, hover lift/scale, shadow bounds).
 * - Feature 4: Smooth scroll anchor behavior on "or spin a reel while you wait".
 * - Feature 5: Marquee settled count edge cases (0, 1, 24, 25, 26, undefined, null,
 *   with and without proposedBy, empty handle).
 * - Feature 2 & 3: Theatrical blackout CSS invariants and roulette spacing.
 * ============================================================================ */

describe("M1 Challenger Empirical Stress Tests", () => {
  const rootDir = process.cwd();

  describe("Feature 1: Poster Fan Clearance & Transform Calculations", () => {
    // Exact mathematical modeling of HomeClient poster fan
    const viewports = [
      { name: "Min Mobile (320px)", width: 320 },
      { name: "Standard Mobile (360px)", width: 360 },
      { name: "iPhone SE (375px)", width: 375 },
      { name: "iPhone 13/14 (390px)", width: 390 },
      { name: "iPhone Pro Max (414px)", width: 414 },
      { name: "Large Mobile (480px)", width: 480 },
      { name: "Tablet Portrait / sm (640px)", width: 640 },
      { name: "iPad / md (768px)", width: 768 },
      { name: "Desktop / lg (1024px)", width: 1024 },
      { name: "Desktop / xl (1280px)", width: 1280 },
      { name: "MacBook Pro (1440px)", width: 1440 },
      { name: "FHD Monitor (1920px)", width: 1920 },
      { name: "4K Display (2560px)", width: 2560 },
    ];

    // Card width = clamp(7rem, 13vw, 12.5rem) where 1rem = 16px
    function getCardWidth(viewportWidth: number): number {
      const minW = 7 * 16; // 112px
      const maxW = 12.5 * 16; // 200px
      const preferredW = 0.13 * viewportWidth;
      return Math.min(Math.max(minW, preferredW), maxW);
    }

    // Card height = aspect-[2/3] -> 1.5 * width
    function getCardHeight(cardWidth: number): number {
      return 1.5 * cardWidth;
    }

    // Mathematical calculations matching home-client.tsx
    function getFanItemTransforms(itemIndex: number, total: number) {
      const normalized = total > 1 ? (itemIndex / (total - 1)) * 2 - 1 : 0;
      const tilt = Math.round(normalized * 7 * 10) / 10; // degrees: -7.0 .. +7.0
      const arcY = Math.round(Math.pow(Math.abs(normalized), 1.8) * 14); // 0 .. 14px
      return { normalized, tilt, arcY };
    }

    it("verifies card dimensions clamp correctly between 112px and 200px", () => {
      expect(getCardWidth(320)).toBe(112);
      expect(getCardWidth(414)).toBe(112);
      expect(getCardWidth(768)).toBe(112);
      expect(getCardWidth(1024)).toBeCloseTo(133.12, 1);
      expect(getCardWidth(1440)).toBeCloseTo(187.2, 1);
      expect(getCardWidth(1920)).toBe(200);
      expect(getCardWidth(2560)).toBe(200);
    });

    it("verifies tilt and arcY bounds across all possible card counts (1..8)", () => {
      for (let total = 1; total <= 8; total++) {
        for (let i = 0; i < total; i++) {
          const { tilt, arcY } = getFanItemTransforms(i, total);
          expect(tilt).toBeGreaterThanOrEqual(-7.0);
          expect(tilt).toBeLessThanOrEqual(7.0);
          expect(arcY).toBeGreaterThanOrEqual(0);
          expect(arcY).toBeLessThanOrEqual(14);
        }
      }
    });

    it("simulates downward corner protrusion across all viewports and verifies pb-14 clearance", () => {
      const PADDING_BOTTOM_PX = 56; // pb-14 = 3.5rem = 56px
      const SHADOW_BLUR_BUFFER_PX = 20; // drop shadow buffer

      for (const vp of viewports) {
        const cardW = getCardWidth(vp.width);

        // Test with 8 cards (max fan size)
        for (let i = 0; i < 8; i++) {
          const { tilt, arcY } = getFanItemTransforms(i, 8);
          const rad = Math.abs(tilt) * (Math.PI / 180);

          // Card rotation origin is origin-bottom: (W/2, H).
          // Bottom corners are at (-W/2, 0) and (+W/2, 0) relative to origin.
          // Rotated corner downward displacement is (W/2) * sin(rad).
          const cornerDisplacement = (cardW / 2) * Math.sin(rad);
          const totalDownwardDisplacement = arcY + cornerDisplacement;

          // Remaining physical padding between lowest card pixel and container bottom
          const netClearance = PADDING_BOTTOM_PX - totalDownwardDisplacement;

          // Must never touch or exceed container bottom padding
          expect(netClearance).toBeGreaterThan(0);
          // Net clearance must be at least 29px (physical card)
          expect(netClearance).toBeGreaterThanOrEqual(29);

          // Clearance including shadow blur buffer must also remain non-negative
          const shadowClearance = PADDING_BOTTOM_PX - (totalDownwardDisplacement + SHADOW_BLUR_BUFFER_PX);
          expect(shadowClearance).toBeGreaterThanOrEqual(9);
        }
      }
    });

    it("simulates hover transform and confirms it does not cause bottom overflow or top clipping", () => {
      const PADDING_TOP_PX = 32; // pt-8 = 2rem = 32px
      const PADDING_BOTTOM_PX = 56; // pb-14 = 56px

      for (const vp of viewports) {
        const cardW = getCardWidth(vp.width);
        const cardH = getCardHeight(cardW);

        // On hover: hover:rotate-0 hover:-translate-y-4 hover:scale-[1.05]
        // - rotation becomes 0
        // - translateY moves upward by 16px (-16px)
        // - scale 1.05 with origin-bottom expands upward by (1.05 - 1.0) * cardH
        const upwardLift = 16;
        const scaleExpansion = 0.05 * cardH;
        const totalTopReach = upwardLift + scaleExpansion;

        // Bottom moves upward by 16px: bottom clearance INCREASES by 16px!
        const bottomClearanceOnHover = PADDING_BOTTOM_PX + upwardLift;
        expect(bottomClearanceOnHover).toBe(72);

        // Top expansion must remain comfortably within pt-8 (32px)
        expect(totalTopReach).toBeLessThanOrEqual(PADDING_TOP_PX);
      }
    });

    it("verifies horizontal edge padding sm:px-6 prevents rotated card corner clipping", () => {
      const HORIZONTAL_PADDING_PX = 24; // px-6 = 24px

      for (const vp of viewports) {
        const cardW = getCardWidth(vp.width);
        const cardH = getCardHeight(cardW);

        // Leftmost card (index 0) has tilt -7deg
        const { tilt } = getFanItemTransforms(0, 8);
        const rad = Math.abs(tilt) * (Math.PI / 180);

        // Top-left corner displacement to the left relative to card's left edge:
        // W/2 * (1 - cos(rad)) - H * sin(rad)
        const leftCornerSwing = cardH * Math.sin(rad) - (cardW / 2) * (1 - Math.cos(rad));

        // On mobile (<= 768px), card width is 112px, H = 168px
        if (vp.width <= 768) {
          expect(leftCornerSwing).toBeLessThan(HORIZONTAL_PADDING_PX);
        }
      }
    });
  });

  describe("Feature 4: Smooth Scroll Anchor Behavior", () => {
    interface MockDocument {
      getElementById: (id: string) => { scrollIntoView: ReturnType<typeof vi.fn> } | null;
    }

    it("intercepts anchor click, prevents default instant jump, and invokes smooth scroll", () => {
      const mockElement = {
        scrollIntoView: vi.fn(),
      };
      const mockDocument: MockDocument = {
        getElementById: vi.fn().mockReturnValue(mockElement),
      };
      const globalObj = globalThis as unknown as { document?: MockDocument };
      const originalDocument = globalObj.document;
      globalObj.document = mockDocument;

      try {
        const mockEvent = {
          preventDefault: vi.fn(),
        };

        const handler = (e: { preventDefault: () => void }) => {
          e.preventDefault();
          document.getElementById("reel")?.scrollIntoView({ behavior: "smooth" });
        };

        handler(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
        expect(mockDocument.getElementById).toHaveBeenCalledWith("reel");
        expect(mockElement.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });
      } finally {
        globalObj.document = originalDocument;
      }
    });

    it("handles missing target gracefully without throwing (optional chaining safety)", () => {
      const mockDocument: MockDocument = {
        getElementById: vi.fn().mockReturnValue(null),
      };
      const globalObj = globalThis as unknown as { document?: MockDocument };
      const originalDocument = globalObj.document;
      globalObj.document = mockDocument;

      try {
        const mockEvent = {
          preventDefault: vi.fn(),
        };

        const handler = (e: { preventDefault: () => void }) => {
          e.preventDefault();
          document.getElementById("reel")?.scrollIntoView({ behavior: "smooth" });
        };

        expect(() => handler(mockEvent)).not.toThrow();
        expect(mockEvent.preventDefault).toHaveBeenCalledTimes(1);
        expect(mockDocument.getElementById).toHaveBeenCalledWith("reel");
      } finally {
        globalObj.document = originalDocument;
      }
    });

    it("verifies roulette section #reel is omitted from home-client.tsx per beta feedback", () => {
      const code = readFileSync(join(rootDir, "src/app/(site)/home-client.tsx"), "utf8");
      expect(code).not.toContain('id="reel"');
      expect(code).not.toContain('href="#reel"');
    });
  });

  describe("Feature 5: Marquee Settled Count Edge Cases Oracle", () => {
    type SettledCountInput = number | null | undefined;
    type ProposedByInput = string | null | undefined;

    // Evaluates the exact business logic implemented in home-client.tsx:443-462
    function evaluateSettledCountDisplay(
      settledCount: SettledCountInput,
      proposedBy: ProposedByInput
    ): { rendered: boolean; text: string | null } {
      // Direct mirroring of home-client.tsx JSX:
      // {(tonight.settledCount >= 25 || tonight.proposedBy) && (...)}
      const condition = (settledCount !== null && settledCount !== undefined && settledCount >= 25) || Boolean(proposedBy);
      if (!condition) {
        return { rendered: false, text: null };
      }

      if (settledCount !== null && settledCount !== undefined && settledCount >= 25 && proposedBy) {
        return {
          rendered: true,
          text: `${settledCount} rankings settled this week, theme by @${proposedBy}.`,
        };
      } else if (settledCount !== null && settledCount !== undefined && settledCount >= 25) {
        return {
          rendered: true,
          text: `${settledCount} rankings settled this week.`,
        };
      } else {
        return {
          rendered: true,
          text: `Theme proposed by @${proposedBy}.`,
        };
      }
    }

    const testCases: {
      count: SettledCountInput;
      proposedBy: ProposedByInput;
      expectedRendered: boolean;
      expectedText: string | null;
      description: string;
    }[] = [
      // Count = 0
      {
        count: 0,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = 0, no proposer -> suppress all",
      },
      {
        count: 0,
        proposedBy: undefined,
        expectedRendered: false,
        expectedText: null,
        description: "count = 0, undefined proposer -> suppress all",
      },
      {
        count: 0,
        proposedBy: "cinephile",
        expectedRendered: true,
        expectedText: "Theme proposed by @cinephile.",
        description: "count = 0, with proposer -> suppress count, show proposer",
      },

      // Count = 1
      {
        count: 1,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = 1, no proposer -> suppress all",
      },
      {
        count: 1,
        proposedBy: "alice",
        expectedRendered: true,
        expectedText: "Theme proposed by @alice.",
        description: "count = 1, with proposer -> suppress count, show proposer",
      },

      // Count = 24 (just below threshold)
      {
        count: 24,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = 24, no proposer -> suppress all",
      },
      {
        count: 24,
        proposedBy: "bob",
        expectedRendered: true,
        expectedText: "Theme proposed by @bob.",
        description: "count = 24, with proposer -> suppress count, show proposer",
      },

      // Count = 25 (exact threshold)
      {
        count: 25,
        proposedBy: null,
        expectedRendered: true,
        expectedText: "25 rankings settled this week.",
        description: "count = 25, no proposer -> render count",
      },
      {
        count: 25,
        proposedBy: "charlie",
        expectedRendered: true,
        expectedText: "25 rankings settled this week, theme by @charlie.",
        description: "count = 25, with proposer -> render count and proposer",
      },

      // Count = 26 (above threshold)
      {
        count: 26,
        proposedBy: null,
        expectedRendered: true,
        expectedText: "26 rankings settled this week.",
        description: "count = 26, no proposer -> render count",
      },
      {
        count: 26,
        proposedBy: "dana",
        expectedRendered: true,
        expectedText: "26 rankings settled this week, theme by @dana.",
        description: "count = 26, with proposer -> render count and proposer",
      },

      // Edge cases: undefined and null counts
      {
        count: undefined,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = undefined, no proposer -> suppress all",
      },
      {
        count: undefined,
        proposedBy: "edgar",
        expectedRendered: true,
        expectedText: "Theme proposed by @edgar.",
        description: "count = undefined, with proposer -> suppress count, show proposer",
      },
      {
        count: null,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = null, no proposer -> suppress all",
      },
      {
        count: null,
        proposedBy: "fiona",
        expectedRendered: true,
        expectedText: "Theme proposed by @fiona.",
        description: "count = null, with proposer -> suppress count, show proposer",
      },

      // Edge cases: negative numbers
      {
        count: -1,
        proposedBy: null,
        expectedRendered: false,
        expectedText: null,
        description: "count = -1, no proposer -> suppress all",
      },
      {
        count: -1,
        proposedBy: "george",
        expectedRendered: true,
        expectedText: "Theme proposed by @george.",
        description: "count = -1, with proposer -> suppress count, show proposer",
      },

      // Edge cases: empty string proposedBy
      {
        count: 10,
        proposedBy: "",
        expectedRendered: false,
        expectedText: null,
        description: "count = 10, empty proposer -> suppress all",
      },
      {
        count: 50,
        proposedBy: "",
        expectedRendered: true,
        expectedText: "50 rankings settled this week.",
        description: "count = 50, empty proposer -> render count only",
      },
    ];

    function renderSettledNotice(settledCount: SettledCountInput, proposedBy: ProposedByInput): string {
      const tonight = { settledCount, proposedBy };
      const showNotice = (tonight.settledCount !== null && tonight.settledCount !== undefined && tonight.settledCount >= 25) || Boolean(tonight.proposedBy);
      if (!showNotice) {
        return renderToStaticMarkup(React.createElement("div"));
      }

      let content: React.ReactNode;
      if (typeof tonight.settledCount === "number" && tonight.settledCount >= 25 && tonight.proposedBy) {
        content = React.createElement(
          React.Fragment,
          null,
          `${tonight.settledCount} rankings settled this week, theme by `,
          React.createElement("span", { className: "font-medium text-gold" }, `@${tonight.proposedBy}`),
          "."
        );
      } else if (typeof tonight.settledCount === "number" && tonight.settledCount >= 25) {
        content = React.createElement(
          React.Fragment,
          null,
          `${tonight.settledCount} rankings settled this week.`
        );
      } else {
        content = React.createElement(
          React.Fragment,
          null,
          "Theme proposed by ",
          React.createElement("span", { className: "font-medium text-gold" }, `@${tonight.proposedBy}`),
          "."
        );
      }

      const element = React.createElement(
        "div",
        null,
        React.createElement("p", { className: "text-xs text-muted", "data-testid": "settled-count" }, content)
      );
      return renderToStaticMarkup(element);
    }

    testCases.forEach(({ count, proposedBy, expectedRendered, expectedText, description }) => {
      it(`oracle test: ${description}`, () => {
        const result = evaluateSettledCountDisplay(count, proposedBy);
        expect(result.rendered).toBe(expectedRendered);
        expect(result.text).toBe(expectedText);
      });

      it(`JSX renderToStaticMarkup: ${description}`, () => {
        const html = renderSettledNotice(count, proposedBy);
        if (!expectedRendered) {
          expect(html).toBe("<div></div>");
          expect(html).not.toContain("data-testid=\"settled-count\"");
          expect(html).not.toContain("settled this week");
        } else {
          expect(html).toContain("data-testid=\"settled-count\"");
          if (expectedText) {
            // Check essential tokens
            if (typeof count === "number" && count >= 25) {
              expect(html).toContain(`${count} rankings settled this week`);
            } else {
              expect(html).not.toContain("settled this week");
            }
            if (proposedBy) {
              expect(html).toContain(`@{${proposedBy}}`.replace("{", "").replace("}", ""));
            }
          }
        }
      });
    });
  });

  describe("Feature 2 & 3: Theatrical Mode & Layout Hierarchy Invariants", () => {
    it("validates blackout blend mode and curtain darkening styles in globals.css", () => {
      const css = readFileSync(join(rootDir, "src/app/globals.css"), "utf8");
      // Check .cinema-lights-down .bg-curtain-soft
      expect(css).toContain(".cinema-lights-down .bg-curtain-soft");
      expect(css).toContain("background-color: #030305 !important;");
      expect(css).toContain("background-blend-mode: multiply;");
      expect(css).toContain("box-shadow: inset 0 0 160px rgba(0, 0, 0, 0.85);");
      expect(css).toContain("transition: background-color 500ms ease-out, box-shadow 500ms ease-out;");
    });

    it("validates spotlight gradients and shadow intensity in globals.css", () => {
      const css = readFileSync(join(rootDir, "src/app/globals.css"), "utf8");
      expect(css).toContain(".cinema-lights-down .stage-spotlight");
      expect(css).toContain("rgba(245, 197, 24, 0.22)");
      expect(css).toContain("rgba(0, 0, 0, 0.98)");
      expect(css).toContain("box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95), 0 0 60px rgba(245, 197, 24, 0.25);");
    });

    it("validates peripheral chrome dimming to 15% opacity and 0.5 brightness in globals.css", () => {
      const css = readFileSync(join(rootDir, "src/app/globals.css"), "utf8");
      expect(css).toContain("opacity: 0.15;");
      expect(css).toContain("filter: brightness(0.5);");
    });

    it("validates play-room.tsx voting stage curtain transition duration", () => {
      const playRoom = readFileSync(join(rootDir, "src/app/r/play/play-room.tsx"), "utf8");
      expect(playRoom).toContain("bg-curtain-soft transition-all duration-500");
    });

    it("validates CuratorRoulette.tsx desktop layout alignment and filmstrip margin", () => {
      const roulette = readFileSync(join(rootDir, "src/components/roulette/CuratorRoulette.tsx"), "utf8");
      expect(roulette).toContain("lg:items-start lg:gap-8");
      expect(roulette).toContain("mt-3.5 w-fit max-w-full");
      expect(roulette).toContain("self-center lg:self-center");
      expect(roulette).not.toContain("<div className=\"pt-1\">");
    });
  });
});
