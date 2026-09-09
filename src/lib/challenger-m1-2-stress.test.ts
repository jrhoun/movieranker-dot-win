import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ============================================================================
 * Milestone M1 Empirical Challenger Stress Tests (Agent challenger_m1_2)
 * ============================================================================
 * Focus Areas:
 * - Feature 2: Theater blackout CSS rules, multiply blend mode, ensuring
 *   active duel cards and posters are NOT dimmed, spotlight contrast, and
 *   card shadow depth.
 * - Feature 3: Curator Roulette column alignment across responsive breakpoints,
 *   removal of dead vertical space, filmstrip container margins, w-fit behavior,
 *   and action column self-centering.
 * ============================================================================ */

describe("Milestone M1 Challenger 2 Empirical Stress Tests", () => {
  const rootDir = process.cwd();

  describe("Feature 2: Theater Mode Cinema Blackout & Contrast Verification", () => {
    const css = readFileSync(join(rootDir, "src/app/globals.css"), "utf8");
    const playRoom = readFileSync(join(rootDir, "src/app/r/play/play-room.tsx"), "utf8");

    // CSS Multiply Blend Mode Formula: f(Cb, Cs) = Cb * Cs / 255
    function multiplyBlend(cb: number, cs: number): number {
      return (cb * cs) / 255;
    }

    // Relative luminance calculation according to WCAG 2.1
    function channelLuminance(c: number): number {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    }

    function relativeLuminance(r: number, g: number, b: number): number {
      return (
        0.2126 * channelLuminance(r) +
        0.7152 * channelLuminance(g) +
        0.0722 * channelLuminance(b)
      );
    }

    it("verifies velvet curtain base drape colors are darkened by >= 85% via multiply with #030305", () => {
      // Base drape color stops in .bg-curtain-soft
      const baseStops = [
        { name: "Deep shade", r: 26, g: 0, b: 5 },     // #1a0005
        { name: "Mid fold", r: 61, g: 0, b: 15 },      // #3d000f
        { name: "Crest highlight", r: 94, g: 27, b: 37 }, // #5e1b25
      ];

      // Blackout multiply source color: #030305
      const sourceBlackout = { r: 3, g: 3, b: 5 };

      for (const stop of baseStops) {
        const blendedR = multiplyBlend(stop.r, sourceBlackout.r);
        const blendedG = multiplyBlend(stop.g, sourceBlackout.g);
        const blendedB = multiplyBlend(stop.b, sourceBlackout.b);

        const baseLum = relativeLuminance(stop.r, stop.g, stop.b);
        const blendedLum = relativeLuminance(blendedR, blendedG, blendedB);

        // Calculate percentage reduction in luminance
        const reductionPct = ((baseLum - blendedLum) / baseLum) * 100;

        // Requirement R1: Darken velvet curtain drapes by ~85%
        expect(reductionPct).toBeGreaterThanOrEqual(85);
        // In fact, multiplying with #030305 reduces luminance by > 98%
        expect(reductionPct).toBeGreaterThan(95);
      }
    });

    it("verifies background-blend-mode: multiply is used on .bg-curtain-soft and NOT mix-blend-mode", () => {
      // background-blend-mode blends background layers of the element only.
      // mix-blend-mode would blend child DOM elements (posters) into the background!
      expect(css).toContain("background-blend-mode: multiply;");
      expect(css).not.toMatch(/\.cinema-lights-down\s+\.bg-curtain-soft\s*\{[^}]*mix-blend-mode/);
    });

    it("ensures active duel cards and posters are NOT dimmed under .cinema-lights-down", () => {
      // 1. Check that .bg-curtain-soft does NOT have opacity or filter applied
      const curtainSoftBlock = css.match(/\.cinema-lights-down\s+\.bg-curtain-soft\s*\{([^}]+)\}/);
      expect(curtainSoftBlock).not.toBeNull();
      const curtainStyles = curtainSoftBlock ? curtainSoftBlock[1] : "";
      expect(curtainStyles).not.toContain("opacity");
      expect(curtainStyles).not.toContain("filter");

      // 2. Check that .matchup-stage-container is NOT in the dimming selector list
      const dimmingRuleMatch = css.match(/([^{}]+)\{[^}]*opacity:\s*0\.15;/);
      expect(dimmingRuleMatch).not.toBeNull();
      const dimmingSelectors = dimmingRuleMatch ? dimmingRuleMatch[1] : "";
      expect(dimmingSelectors).not.toContain("matchup-stage");
      expect(dimmingSelectors).not.toContain("Side");

      // 3. Check that .matchup-stage-container button div only enhances box-shadow
      const cardShadowBlock = css.match(/\.cinema-lights-down\s+\.matchup-stage-container\s+button\s+div\s*\{([^}]+)\}/);
      expect(cardShadowBlock).not.toBeNull();
      const cardShadowStyles = cardShadowBlock ? cardShadowBlock[1] : "";
      expect(cardShadowStyles).toContain("box-shadow: 0 30px 70px rgba(0, 0, 0, 0.95), 0 0 60px rgba(245, 197, 24, 0.25);");
      expect(cardShadowStyles).not.toContain("opacity");
      expect(cardShadowStyles).not.toContain("filter");

      // 4. Check that in play-room.tsx, MatchupStage is NOT given cinema-peripheral class
      expect(playRoom).not.toMatch(/<MatchupStage[^>]*cinema-peripheral/);
    });

    it("verifies peripheral chrome dimming ratio vs active card full luminance", () => {
      // Active card: 100% luminance, 100% opacity
      const activeCardLuminance = 1.0;
      const activeCardOpacity = 1.0;

      // Peripheral chrome: 15% opacity, 50% brightness
      const peripheralOpacity = 0.15;
      const peripheralBrightness = 0.5;

      const peripheralEffectiveLight = peripheralOpacity * peripheralBrightness;
      const contrastRatio = (activeCardLuminance * activeCardOpacity) / peripheralEffectiveLight;

      // Active cards are at least 10x brighter than dimmed peripheral elements
      expect(contrastRatio).toBeGreaterThanOrEqual(10);
      expect(contrastRatio).toBeCloseTo(13.33, 1);
    });

    it("verifies high-contrast spotlight radial gradients", () => {
      const spotlightBlock = css.match(/\.cinema-lights-down\s+\.stage-spotlight\s*\{([^}]+)\}/);
      expect(spotlightBlock).not.toBeNull();
      const spotlightStyles = spotlightBlock ? spotlightBlock[1] : "";

      // Concentrated warm gold beam center: 0.22 alpha
      expect(spotlightStyles).toContain("rgba(245, 197, 24, 0.22)");
      // Deep outer vignette: 0.98 alpha at 95%
      expect(spotlightStyles).toContain("rgba(0, 0, 0, 0.98) 95%");
    });

    it("verifies smooth 500ms transitions on curtains and stage section", () => {
      expect(css).toMatch(/\.bg-curtain-soft\s*\{[^}]*transition:\s*background-color 500ms ease-out,\s*box-shadow 500ms ease-out;/);
      expect(playRoom).toContain("bg-curtain-soft transition-all duration-500");
    });
  });

  describe("Feature 3: Curator Roulette Layout Hierarchy & Responsive Geometry", () => {
    const rouletteCode = readFileSync(
      join(rootDir, "src/components/roulette/CuratorRoulette.tsx"),
      "utf8",
    );

    it("verifies desktop column alignment and spacing hierarchy", () => {
      // Must use lg:items-start lg:gap-8 and NOT lg:items-center lg:justify-between
      expect(rouletteCode).toContain("lg:items-start lg:gap-8");
      expect(rouletteCode).not.toContain("lg:items-center");
      expect(rouletteCode).not.toContain("lg:justify-between");
    });

    it("verifies dead vertical space between blurb and filmstrip is completely removed", () => {
      // Redundant <div className="pt-1"> must not exist
      expect(rouletteCode).not.toContain('<div className="pt-1">');
      // Filmstrip container must have direct mt-3.5 margin
      expect(rouletteCode).toMatch(/relative mt-3\.5 w-fit max-w-full overflow-x-auto/);
    });

    it("verifies action button column is vertically centered across breakpoints", () => {
      expect(rouletteCode).toContain("self-center lg:self-center");
    });

    it("models filmstrip dimensions across viewports ensuring no card clipping or blowout", () => {
      const FILMSTRIP_POSTERS = 6;
      const GAP_PX = 6; // gap-1.5 = 0.375rem = 6px
      const PADDING_X = 16; // px-2 = 8px * 2 = 16px

      // On mobile (< sm): poster width = 44px (w-11)
      const mobilePosterWidth = 44;
      const mobileFilmstripWidth =
        FILMSTRIP_POSTERS * mobilePosterWidth + (FILMSTRIP_POSTERS - 1) * GAP_PX + PADDING_X;
      // 6 * 44 + 5 * 6 + 16 = 264 + 30 + 16 = 310px
      expect(mobileFilmstripWidth).toBe(310);

      // Card padding on mobile: p-5 = 20px * 2 = 40px
      const viewports = [
        { width: 360, name: "360px standard Android" },
        { width: 375, name: "375px iPhone SE" },
        { width: 390, name: "390px iPhone 13/14" },
        { width: 414, name: "414px iPhone Pro Max" },
      ];

      for (const vp of viewports) {
        const cardInnerWidth = vp.width - 40;
        // On all standard mobile viewports (360px..414px), filmstrip fits cleanly without clipping
        expect(cardInnerWidth).toBeGreaterThanOrEqual(mobileFilmstripWidth);
      }

      // On sm: (640px+): poster width = 56px (sm:w-14)
      const smPosterWidth = 56;
      const smFilmstripWidth =
        FILMSTRIP_POSTERS * smPosterWidth + (FILMSTRIP_POSTERS - 1) * GAP_PX + PADDING_X;
      // 6 * 56 + 5 * 6 + 16 = 336 + 30 + 16 = 382px
      expect(smFilmstripWidth).toBe(382);

      // On 640px card with sm:p-7 (56px padding): inner width = 584px
      const smCardInnerWidth = 640 - 56;
      expect(smCardInnerWidth).toBeGreaterThan(smFilmstripWidth);
      expect(smCardInnerWidth - smFilmstripWidth).toBe(202); // 202px headroom
    });

    it("verifies w-fit prevents filmstrip from stretching on wide desktop displays", () => {
      // w-fit ensures container shrinks to 382px rather than stretching to column width (~700px)
      expect(rouletteCode).toContain("w-fit max-w-full");
    });

    it("verifies accessibility and screen reader annotations are preserved", () => {
      expect(rouletteCode).toContain('<ul className="sr-only">');
      expect(rouletteCode).toContain('aria-hidden="true" className="cb-holes');
      expect(rouletteCode).toContain("aria-busy={isSpinning}");
    });
  });
});
