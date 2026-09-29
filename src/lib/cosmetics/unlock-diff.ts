import { itemById, SLOTS } from "./catalogue";
import { SLOT_LABEL } from "./categories";
import { labelFor } from "./labels";
import type { CosmeticItem, Slot, Unlock } from "./types";
import { rankForLevel, UNLOCKS, type Unlock as LevelUnlock } from "../gamification";

/**
 * What changed between two ownership snapshots.
 *
 * Ownership, level and achievements are all DERIVED on read (see the note atop
 * ownership.ts), so nothing ever records "you just got this". The only honest
 * way to announce a reward is the same trick completion.ts uses for
 * achievements: resolve ownership twice — once against the totals minus the
 * thing just finished, once against the totals — and subtract. This is that
 * subtraction for cosmetics and levels, kept pure so the card that reads it
 * can be tested without a database.
 */

export interface OwnershipSnapshot {
  /** Item ids the user owns, exactly as `ownedItemIds` resolves them. */
  owned: Set<string>;
  level: number;
}

export interface NewCosmetic {
  id: string;
  slot: Slot;
  /** The catalogue name, e.g. "Sprocket". For a tagline this is the line itself. */
  name: string;
  /**
   * What to print. `name` for every slot but taglines; for a tagline it is the
   * quoted line, or "An earned line" when the caller could not resolve the
   * text (see `labelFor` — earned lines carry a "{count}" template).
   */
  label: string;
  /**
   * How it was obtained, so a caller can say "from this week's Marquee" for a
   * Marquee drop or a theme souvenir and "yours now" for a level or
   * achievement item without knowing any ids.
   */
  unlock: Unlock["kind"];
}

export interface NewCosmeticGroup {
  slot: Slot;
  /** The dressing-room pane's title, e.g. "Frames" or "Atmosphere". */
  title: string;
  items: NewCosmetic[];
}

export interface LevelUp {
  from: number;
  to: number;
  /** Career rank at the new level, e.g. "Film Buff". */
  rank: string;
  /** Every UNLOCKS entry crossed on the way up, lowest level first. */
  unlocks: LevelUnlock[];
}

export interface UnlockDiff {
  /** Newly owned items grouped by slot, in catalogue slot order. Empty groups are omitted. */
  cosmetics: NewCosmeticGroup[];
  /** Null unless the level went up. */
  levelUp: LevelUp | null;
}

/**
 * `taglineTexts` maps a tagline id to its display text, for earned lines whose
 * catalogue entry is a template. A missing entry prints as "An earned line",
 * never as the raw template — that rule lives in `labelFor` and is reused here.
 */
export function diffUnlocks(
  before: OwnershipSnapshot,
  after: OwnershipSnapshot,
  taglineTexts: Record<string, string> = {},
): UnlockDiff {
  const fresh: CosmeticItem[] = [];
  for (const id of after.owned) {
    if (before.owned.has(id)) continue;
    const item = itemById(id);
    if (item) fresh.push(item);
  }

  const cosmetics: NewCosmeticGroup[] = SLOTS.map((slot) => ({
    slot,
    title: SLOT_LABEL[slot],
    items: fresh
      .filter((i) => i.slot === slot)
      .map((i) => ({
        id: i.id,
        slot,
        name: i.name,
        label: labelFor(i, taglineTexts),
        unlock: i.unlock.kind,
      })),
  })).filter((g) => g.items.length > 0);

  const levelUp: LevelUp | null =
    after.level > before.level
      ? {
          from: before.level,
          to: after.level,
          rank: rankForLevel(after.level),
          unlocks: UNLOCKS.filter((u) => u.atLevel > before.level && u.atLevel <= after.level).sort(
            (a, b) => a.atLevel - b.atLevel,
          ),
        }
      : null;

  return { cosmetics, levelUp };
}

/** True when the diff has anything to say. */
export function hasUnlocks(diff: UnlockDiff): boolean {
  return diff.cosmetics.length > 0 || diff.levelUp !== null;
}
