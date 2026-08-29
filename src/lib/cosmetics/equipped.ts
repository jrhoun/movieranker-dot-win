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
}

export const ID_FIELDS = ["frame", "background", "overlay", "tagline"] as const;

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
