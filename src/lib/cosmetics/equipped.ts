import { starterFor } from "./catalogue";
import { canEquip } from "./ownership";
import type { Slot } from "./types";

export interface Equipped {
  avatarTmdbId?: number;
  avatarPosterPath?: string;
  /**
   * `null` (only ever transient, on a raw patch) means "clear this slot" —
   * see `parseEquipped` and `mergeShowcase`. A value read back out of
   * storage is never `null`; `mergeShowcase` deletes the key instead.
   */
  frame?: string | null;
  background?: string | null;
  overlay?: string | null;
  tagline?: string | null;
  /**
   * The tagline's resolved display text, stored as a SNAPSHOT at equip time
   * — never recomputed from `tagline` on read. A viewer of /u/[handle]
   * (including the owner themselves, since that page filters by visibility
   * unconditionally) cannot always re-derive it: RLS scopes `marquee_solves`
   * to its own reader, and that page's achievement stats come from public
   * done lists only, so a challenge earned partly through private lists
   * (e.g. centurion) would under-count there and the line would silently
   * vanish. Resolved and written once, server-side, by whoever holds the
   * real owner's full-access stats — see the strip + recompute in
   * /api/profile's PATCH handler. Never client-writable. `null` on a raw
   * patch clears it, same as the four id fields above.
   */
  taglineText?: string | null;
}

export const ID_FIELDS = ["frame", "background", "overlay", "tagline"] as const;

/**
 * Fields where `null`, on a raw patch, means "clear this" — the read/write
 * null-stripping loops in public-profile.ts share this list so a cleared
 * tagline's stored text is deleted alongside its id, and neither ever
 * round-trips through storage as a literal `null`. A superset of
 * `ID_FIELDS`: `taglineText` is resolved display text, not a catalogue id,
 * so it deliberately stays out of `ID_FIELDS` itself — equip-guard's
 * per-field ownership loop iterates exactly that list, and must never try
 * to look `taglineText` up as a catalogue item.
 */
export const NULLABLE_FIELDS = [...ID_FIELDS, "taglineText"] as const;

/**
 * Ample for every static and earned tagline text in the catalogue today;
 * anything longer is rejected rather than silently truncated, since a
 * client is never supposed to be sending this field at all (see the doc
 * comment on `Equipped.taglineText`) — a wildly long value is a sign
 * something upstream is confused, not a normal-sized tagline to accept.
 */
const TAGLINE_TEXT_MAX_LEN = 120;

/**
 * TMDB poster paths look like "/abc123XYZ.jpg" — a leading slash, an
 * alphanumeric id, and a real image extension. This is the only thing
 * standing between a client-authored `avatarPosterPath` and an unquoted CSS
 * `url(...)` in ProfileCanvas: without it, a value like
 * "x.jpg), url(https://evil.example/track.gif" is valid comma-separated CSS
 * and fetches a third-party URL for every viewer of the profile.
 */
const POSTER_PATH = /^\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp)$/;

/** Shape validation only. Ownership is a separate question, asked later. */
export function parseEquipped(input: unknown): Equipped | null {
  if (input === undefined) return {};
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const out: Equipped = {};

  for (const field of ID_FIELDS) {
    const v = o[field];
    if (v === undefined) continue;
    // `null` explicitly requests clearing the slot; anything else must be a string.
    if (v !== null && typeof v !== "string") return null;
    out[field] = v;
  }
  if (o.avatarTmdbId !== undefined) {
    if (typeof o.avatarTmdbId !== "number" || !Number.isInteger(o.avatarTmdbId)) return null;
    out.avatarTmdbId = o.avatarTmdbId;
  }
  if (o.avatarPosterPath !== undefined) {
    if (typeof o.avatarPosterPath !== "string" || !POSTER_PATH.test(o.avatarPosterPath)) return null;
    out.avatarPosterPath = o.avatarPosterPath;
  }
  if (o.taglineText !== undefined) {
    const v = o.taglineText;
    // `null` clears it, same as the four id fields; anything else must be a
    // reasonably-sized string. This function only validates shape — it does
    // not know or care that a client is never supposed to send this field at
    // all; that trust boundary lives in /api/profile's PATCH handler.
    if (v !== null && (typeof v !== "string" || v.length > TAGLINE_TEXT_MAX_LEN)) return null;
    out.taglineText = v;
  }
  return out;
}

/**
 * What to actually render. Any id the user no longer owns is replaced by the
 * slot's starter, so a profile is never half-dressed and a threshold change
 * cannot strand someone with a broken header.
 */
export function resolveEquipped(
  equipped: Equipped | undefined,
  owned: Set<string>,
): Required<Pick<Equipped, "frame" | "background" | "overlay">> & Equipped {
  const e = equipped ?? {};
  const pick = (slot: Slot, id: string | null | undefined) =>
    id && canEquip(id, owned) ? id : starterFor(slot).id;

  return {
    ...e,
    frame: pick("frame", e.frame),
    background: pick("background", e.background),
    overlay: pick("overlay", e.overlay),
    // A tagline is optional — no starter is forced on anyone.
    tagline: e.tagline && canEquip(e.tagline, owned) ? e.tagline : undefined,
  };
}
