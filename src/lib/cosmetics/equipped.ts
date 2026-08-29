import { starterFor } from "./catalogue";
import { canEquip } from "./ownership";
import type { Slot } from "./types";

export interface Equipped {
  avatarTmdbId?: number;
  avatarPosterPath?: string;
  frame?: string;
  background?: string;
  overlay?: string;
  tagline?: string;
}

const ID_FIELDS = ["frame", "background", "overlay", "tagline"] as const;

/** Shape validation only. Ownership is a separate question, asked later. */
export function parseEquipped(input: unknown): Equipped | null {
  if (input === undefined) return {};
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const out: Equipped = {};

  for (const field of ID_FIELDS) {
    const v = o[field];
    if (v === undefined) continue;
    if (typeof v !== "string") return null;
    out[field] = v;
  }
  if (o.avatarTmdbId !== undefined) {
    if (typeof o.avatarTmdbId !== "number" || !Number.isInteger(o.avatarTmdbId)) return null;
    out.avatarTmdbId = o.avatarTmdbId;
  }
  if (o.avatarPosterPath !== undefined) {
    if (typeof o.avatarPosterPath !== "string") return null;
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
  const pick = (slot: Slot, id: string | undefined) =>
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
