/**
 * Catalogue id -> CSS class, in one place.
 *
 * These maps were previously private to ProfileCanvas. The collection gallery
 * and the customise modal have to draw the SAME items, and a second copy would
 * drift the moment a cosmetic is added — the gallery would quietly render a
 * grey box for an item the profile draws correctly, which is precisely the
 * failure a browsable collection cannot afford.
 *
 * A missing entry is a real state, not an error: it means "no class", and every
 * consumer falls back to a plain surface.
 */
export const FRAME_CLASS: Record<string, string> = {
  "frame.brass": "cf-brass",
  "frame.perforation": "cf-perforation",
  "frame.projector": "cf-projector",
  "frame.toxic": "cf-toxic",
  "frame.neon-cyan": "cf-neon-cyan",
  "frame.neon-magenta": "cf-neon-magenta",
  "frame.vhs": "cf-vhs",
  "frame.prism": "cf-prism",
};

export const OVERLAY_CLASS: Record<string, string> = {
  "overlay.grain": "co-grain",
  "overlay.vhs": "co-vhs",
  "overlay.flicker": "co-flicker",
  "overlay.dust": "co-dust",
};

/**
 * Backgrounds are composited from several layers on a real profile (posters, a
 * scrim, sprocket holes, a beam), which cannot be reproduced in a 78px chip.
 * These are single-class STAND-INS for the gallery only — deliberately not the
 * same classes the canvas uses, so nobody mistakes one for the other.
 */
export const BACKGROUND_PREVIEW_CLASS: Record<string, string> = {
  "background.filmstrip": "cbp-filmstrip",
  "background.spotlight": "cbp-spotlight",
  "background.velvet": "cbp-velvet",
  "background.projector-booth": "cbp-projector-booth",
  "background.marquee-night": "cbp-marquee-night",
  "background.nitrate": "cbp-nitrate",
  "background.midnight": "cbp-midnight",
};

/**
 * The ANIMATED layer classes each background paints, by id.
 *
 * A background is composited from several elements, so unlike a frame or an
 * overlay its motion does not live on a class derivable from its id — the
 * filmstrip's drift is on `.cb-strip`, nothing on `.cb-filmstrip`. That is
 * precisely how a page-wide loop could ship with no `prefers-reduced-motion`
 * rule and nothing would notice: the reduced-motion test derived `cf-`/`co-`
 * class names from ids and had no way to guess these. Declared here so the
 * test can assert them, so ADD A BACKGROUND'S MOVING CLASSES HERE when you add
 * one — an unlisted class is an unchecked class, and motion.test.ts also
 * requires every `animated` background to have an entry.
 *
 * Not a render map: ProfileBackdrop applies these itself, alongside the static
 * layers. Listing a class here that nothing paints is harmless; omitting one
 * that does is the bug.
 */
export const BACKGROUND_MOTION_CLASSES: Record<string, string[]> = {
  "background.filmstrip": ["cb-strip"],
  "background.spotlight": ["cb-beam-sweep"],
  "background.velvet": ["cb-folds", "cb-lightpass"],
  "background.projector-booth": ["cb-motes-1", "cb-motes-2", "cb-motes-3"],
  "background.marquee-night": ["cb-bulb-chase"],
  "background.nitrate": ["cb-scratch-1", "cb-scratch-2", "cb-scratch-3", "cb-nitrate-flick"],
  "background.midnight": ["cb-bokeh-1", "cb-bokeh-2", "cb-bokeh-3"],
};

/** The `.ca-*` class for a gradient avatar id, or undefined if it is not one. */
export function gradientAvatarClass(id: string): string | undefined {
  return id.startsWith("avatar.grad.") ? id.replace("avatar.grad.", "ca-") : undefined;
}
