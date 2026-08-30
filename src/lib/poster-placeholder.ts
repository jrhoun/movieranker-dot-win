import { hashString } from "./seeded-random";

/**
 * The stand-in for a film with no poster art.
 *
 * TMDB genuinely has no image for plenty of shorts, festival films and recent
 * additions, so this is a permanent state and not a loading one. What used to
 * render was the bare card surface with the title floating in it, which reads
 * as a broken image rather than as a film.
 *
 * KEYED ON THE FILM, NOT ITS POSITION. The obvious implementation is
 * `index % COUNT`, and it is wrong twice over: a film's colour would change
 * when its list is reordered, and the same film would wear one gradient in a
 * ranking and a different one in the compare view or the parked strip. The
 * same shape — a positional index over a pool whose order moves — has produced
 * two real bugs in this codebase already (canister drops, and the marquee
 * shortlist). Deriving from the tmdb id makes a film's placeholder its own
 * property, stable everywhere and across reorders.
 *
 * THE TRADE: hashing cannot guarantee two adjacent films differ, which a
 * rotating counter could. Eight variants put the odds of any given neighbour
 * colliding at 1 in 8, and a repeat that stays put is a far smaller problem
 * than a colour that moves every time the list is sorted. Stability won.
 */
export const POSTER_PLACEHOLDER_COUNT = 8;

/**
 * The `.pp-*` class for a film's placeholder.
 *
 * Takes the tmdb id where there is one. Falls back to the title so that search
 * results and other rows without an id still vary rather than all landing on
 * the same colour — a worse failure than a collision, since it is guaranteed.
 */
export function posterPlaceholderClass(key: string | number | null | undefined): string {
  const seed = key === null || key === undefined || key === "" ? "unknown" : String(key);
  return `pp-${hashString(seed) % POSTER_PLACEHOLDER_COUNT}`;
}
