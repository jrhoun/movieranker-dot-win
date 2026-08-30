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
};

/** The `.ca-*` class for a gradient avatar id, or undefined if it is not one. */
export function gradientAvatarClass(id: string): string | undefined {
  return id.startsWith("avatar.grad.") ? id.replace("avatar.grad.", "ca-") : undefined;
}
