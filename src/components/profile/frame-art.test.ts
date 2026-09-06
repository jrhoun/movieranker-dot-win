import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FRAME_CLASS } from "@/lib/cosmetics/classes";
import { itemsForSlot } from "@/lib/cosmetics/catalogue";
import FrameArt, { FRAME_ART } from "./FrameArt";

/**
 * Frames are the one cosmetic that is DRAWN rather than declared, so the things
 * that can go wrong with them are structural, not stylistic: art clipped by the
 * SVG's own overflow, art that swallows clicks meant for the avatar, a frame
 * that quietly falls back to brass because its id was mistyped in one of the
 * two maps that have to agree.
 *
 * None of that is visible in a type check and none of it throws. Rendering the
 * markup and asserting on it is the cheapest way to hold the invariants; how
 * the art LOOKS is still only checkable by looking at it.
 */

const AVATAR = h("img", { src: "/poster.jpg", alt: "" });

function render(id: string | null | undefined, className?: string) {
  return renderToStaticMarkup(h(FrameArt, { id, className, children: AVATAR }));
}

/** The ids that draw themselves, in catalogue order. */
const ART_IDS = itemsForSlot("frame")
  .map((i) => i.id)
  .filter((id) => id in FRAME_ART);

describe("FrameArt", () => {
  it("draws every id in FRAME_ART, and every one of them is a real frame", () => {
    const frameIds = new Set(itemsForSlot("frame").map((i) => i.id));
    for (const id of Object.keys(FRAME_ART)) {
      expect(frameIds.has(id), `${id} has art but is not in the catalogue`).toBe(true);
    }
    expect(ART_IDS.length).toBe(Object.keys(FRAME_ART).length);
  });

  it("gives every catalogue frame either art or a CSS ring", () => {
    // A frame with neither renders as a bare span: no ring, no art, no error.
    for (const frame of itemsForSlot("frame")) {
      expect(
        frame.id in FRAME_ART || frame.id in FRAME_CLASS,
        `${frame.id} has no art and no .cf-* class — it renders as nothing`,
      ).toBe(true);
    }
  });

  it("renders the child avatar inside the wrapper for every frame", () => {
    for (const frame of itemsForSlot("frame")) {
      expect(render(frame.id), frame.id).toContain('src="/poster.jpg"');
    }
  });

  describe.each(ART_IDS)("%s", (id) => {
    const html = render(id);

    it("draws inline SVG rather than a CSS ring", () => {
      expect(html).toContain("<svg");
      // The art IS the frame. A `.cf-*` ring underneath would double the border.
      expect(html).not.toMatch(/class="[^"]*\bcf-(?:brass|perforation|projector|toxic|neon-|vhs|prism)/);
    });

    it("hangs the art in the overhang band without an inset that clips it", () => {
      // -inset-[12%] and the matching viewBox are one decision in two places:
      // the box plus a 12% margin on each axis, which is 124 x 186 units for a
      // 100 x 150 box. Change one without the other and the art slides off the
      // avatar's edges.
      expect(html).toContain('viewBox="-12 -18 124 186"');
      expect(html).toContain("-inset-[12%]");
      expect(html).toContain("absolute");
    });

    it("never eats a click aimed at the avatar", () => {
      expect(html).toContain("pointer-events-none");
    });

    it("keeps the wrapper unclipped so the art can overhang", () => {
      expect(html).not.toContain("overflow-hidden");
    });

    it("is hidden from assistive tech — it is decoration around the avatar", () => {
      expect(html).toContain('aria-hidden="true"');
    });
  });

  it("animates only the two frames the catalogue calls animated", () => {
    // The classes are the ONLY motion in the frame slot, and each has a
    // reduced-motion switch in globals.css. A frame that animates without
    // `animated: true` escapes the one-loud-item policy the catalogue enforces.
    const animated = new Set(
      itemsForSlot("frame")
        .filter((i) => i.animated)
        .map((i) => i.id),
    );
    for (const id of ART_IDS) {
      const moves = /\bcf-(?:marquee-bulb|premiere-glint)\b/.test(render(id));
      expect(moves, `${id}: art motion ${moves ? "present" : "absent"}, animated: ${animated.has(id)}`).toBe(
        animated.has(id),
      );
    }
  });

  it("chases the marquee bulbs in three phases so the light travels", () => {
    const html = render("frame.marquee");
    for (const phase of ["cf-marquee-bulb cf-marquee-bulb-0", "cf-marquee-bulb cf-marquee-bulb-1", "cf-marquee-bulb cf-marquee-bulb-2"]) {
      expect(html).toContain(phase);
    }
  });

  it("keeps CSS-only frames on their ring", () => {
    const html = render("frame.neon-cyan");
    expect(html).toContain("cf-neon-cyan");
    expect(html).not.toContain("<svg");
  });

  it("falls back to the starter's art for an unknown or missing id", () => {
    // Not to the starter's old RING: brass is drawn now, and a fallback that
    // renders a different object from the one it names is its own bug.
    const brass = render("frame.brass");
    for (const id of ["frame.does-not-exist", null, undefined]) {
      expect(render(id), String(id)).toBe(brass);
    }
  });

  it("passes className through on both paths", () => {
    expect(render("frame.premiere", "w-32")).toContain("w-32");
    expect(render("frame.neon-cyan", "w-32")).toContain("w-32");
  });
});
