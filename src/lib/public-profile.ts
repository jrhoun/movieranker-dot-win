// Public profile shaping: derives showcase data from a user's PUBLIC done lists.
// Private/unlisted rows must never leak into stats or the card grid.
import {
  ACHIEVEMENTS,
  calculateXpBreakdown,
  countMoviesRanked,
  type Level,
  levelFor,
} from "./gamification";
import { reconcileCareerXp, toXpLists } from "./career-xp";
import { NULLABLE_FIELDS, parseEquipped, type Equipped } from "./cosmetics/equipped";
import {
  chipParticipants,
  type AttributionRow,
  type ParticipantChip,
} from "./participants";

// --- Showcase curation (pinned achievements + one featured ranking) ---

export const MAX_PINNED_ACHIEVEMENTS = 3;

export interface ProfileShowcase {
  achievementKeys: string[];
  favoriteListId: string | null;
  lifetimeXp?: number;
  equipped?: Equipped;
}

export const EMPTY_SHOWCASE: ProfileShowcase = {
  achievementKeys: [],
  favoriteListId: null,
};

function validAchievementKeys(keys: unknown): string[] | null {
  if (!Array.isArray(keys)) return null;
  const allowed = new Set(ACHIEVEMENTS.map((a) => a.key));
  const seen = new Set<string>();
  for (const k of keys) {
    if (typeof k !== "string" || !allowed.has(k) || seen.has(k)) return null;
    seen.add(k);
  }
  return [...seen];
}

/** Parse a stored (jsonb) showcase value; null only when the shape is invalid. */
export function parseShowcase(input: unknown): ProfileShowcase | null {
  if (input == null) return EMPTY_SHOWCASE;
  if (typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string, unknown>;
  const keys = validAchievementKeys(o.achievementKeys ?? []);
  if (!keys || keys.length > MAX_PINNED_ACHIEVEMENTS) return null;
  const fav = o.favoriteListId ?? null;
  if (fav !== null && typeof fav !== "string") return null;
  let lifetimeXp: number | undefined = undefined;
  if (o.lifetimeXp !== undefined) {
    if (
      typeof o.lifetimeXp !== "number" ||
      !Number.isFinite(o.lifetimeXp) ||
      o.lifetimeXp < 0
    ) {
      return null;
    }
    lifetimeXp = Math.floor(o.lifetimeXp);
  }
  // `?? undefined`: a stored `equipped: null` is an absent key, not a
  // malformed one — every other field here tolerates absence the same way.
  const equipped = parseEquipped(o.equipped ?? undefined);
  if (equipped === null) return null;
  // parseEquipped accepts a literal null on a slot field (or taglineText) as
  // mergeShowcase's "clear this" signal — mergeShowcase deletes the key
  // before it's ever persisted, but a row written some other way (or by an
  // older, buggier mergeShowcase) could still carry one. Strip it here too,
  // so a reader never has to treat a stored null as distinct from "absent".
  for (const field of NULLABLE_FIELDS) {
    if (equipped[field] === null) delete equipped[field];
  }
  return {
    achievementKeys: keys,
    favoriteListId: fav,
    ...(lifetimeXp !== undefined ? { lifetimeXp } : {}),
    ...(Object.keys(equipped).length > 0 ? { equipped } : {}),
  };
}

/**
 * Validate a showcase PATCH payload against the currently stored value.
 * Both fields are optional in the patch; the other field is preserved.
 * Returns the merged full showcase, or null when the payload is malformed.
 */
export function mergeShowcase(
  current: unknown,
  patch: {
    achievementKeys?: unknown;
    favoriteListId?: unknown;
    lifetimeXp?: unknown;
    equipped?: unknown;
  },
): ProfileShowcase | null {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) return null;
  const base = parseShowcase(current) ?? EMPTY_SHOWCASE;
  let { achievementKeys, favoriteListId, lifetimeXp, equipped } = base;
  if (patch.achievementKeys !== undefined) {
    const keys = validAchievementKeys(patch.achievementKeys);
    if (!keys || keys.length > MAX_PINNED_ACHIEVEMENTS) return null;
    achievementKeys = keys;
  }
  if (patch.favoriteListId !== undefined) {
    const fav = patch.favoriteListId;
    if (fav !== null && typeof fav !== "string") return null;
    favoriteListId = fav || null;
  }
  if (patch.lifetimeXp !== undefined) {
    if (
      typeof patch.lifetimeXp !== "number" ||
      !Number.isFinite(patch.lifetimeXp) ||
      patch.lifetimeXp < 0
    ) {
      return null;
    }
    // Monotonic ratchet: lifetime XP never decreases
    lifetimeXp = Math.max(lifetimeXp ?? 0, Math.floor(patch.lifetimeXp));
  }
  if (patch.equipped !== undefined) {
    const next = parseEquipped(patch.equipped);
    if (next === null) return null;
    // Merge rather than replace, so equipping a frame does not clear a tagline.
    const combined: Equipped = { ...(equipped ?? {}), ...next };
    // `null` on a slot field (or taglineText) is parseEquipped's "clear
    // this" signal — delete the key rather than persisting a literal null,
    // which nothing downstream (resolveEquipped, ProfileCanvas, the OG
    // card) expects.
    for (const field of NULLABLE_FIELDS) {
      if (combined[field] === null) delete combined[field];
    }
    equipped = combined;
  }
  return {
    achievementKeys,
    favoriteListId,
    ...(lifetimeXp !== undefined ? { lifetimeXp } : {}),
    ...(equipped && Object.keys(equipped).length > 0 ? { equipped } : {}),
  };
}

/** Owner-UI helper: persist one showcase field via PATCH /api/profile. */
export async function patchShowcase(
  patch: Partial<ProfileShowcase>,
): Promise<boolean> {
  try {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showcase: patch }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface DbPublicList {
  id: string;
  title: string;
  participants?: string[] | null;
  theme_slug?: string | null;
  status: string;
  visibility: string | null;
  created_at: string;
  list_movies: { title: string; poster_path: string | null }[] | null;
}

export interface PublicListCardData {
  id: string;
  title: string;
  /** UTC date string, e.g. "Mar 5, 2026". */
  createdAt: string;
  posters: { title: string; posterPath: string | null }[];
  /** Participant chips with attribution markers (linked names when public). */
  chips?: ParticipantChip[];
}

/** Everything the /u/[handle] page renders, derived only from public done lists. */
export function shapePublicProfile(
  rows: DbPublicList[],
  showcase?: ProfileShowcase | null,
): {
  cards: PublicListCardData[];
  moviesRanked: number;
  level: Level;
} {
  // ponytail: filters again even though the DB query does NOT scope to public+done
  // (RLS on lists is broader); this JS filter is the actual guarantee — keep it.
  // Defense-in-depth at the trust boundary so stats can't leak via query drift.
  const pub = rows.filter((l) => l.status === "done" && l.visibility === "public");

  // Two different quantities that used to be one. `moviesRanked` is a count of
  // films; career level is a function of XP. Taking max() across both and then
  // feeding the result to levelFor() meant a banked XP total was being read as
  // a number of movies.
  const publicLists = toXpLists(
    pub.map((l) => ({
      status: l.status,
      theme_slug: l.theme_slug ?? null,
      participants: l.participants,
      movieCount: l.list_movies?.length ?? 0,
    })),
  );
  const moviesRanked = countMoviesRanked(publicLists);
  // Derived from public rows ONLY, and deliberately not from marquee_solves:
  // RLS scopes that table to the reader, so a visitor counts zero solves where
  // the owner counts their own. Feeding it in here would make a public level
  // depend on who is looking. Solves, referrals and unlisted work reach this
  // page through the banked lifetime total instead.
  const { total: careerXp } = reconcileCareerXp(
    calculateXpBreakdown({ lists: publicLists }),
    showcase?.lifetimeXp,
  );
  return {
    cards: pub.map((l) => ({
      id: l.id,
      title: l.title,
      createdAt: new Date(l.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC", // server renders UTC; client must match to avoid hydration mismatch
      }),
      posters: (l.list_movies ?? []).map((m) => ({
        title: m.title,
        posterPath: m.poster_path,
      })),
    })),
    moviesRanked,
    level: levelFor(careerXp),
  };
}

/**
 * Attach participant chips (attribution markers) onto shaped public profile
 * cards. Raw rows supply the participants array; only public-profile handles
 * become links.
 */
export function attachParticipantChips(
  cards: PublicListCardData[],
  rawRows: DbPublicList[],
  attributions: (AttributionRow & { list_id?: string })[],
  publicProfiles: { id: string; handle: string }[],
): PublicListCardData[] {
  const rawById = new Map(rawRows.map((r) => [r.id, r]));
  return cards.map((card) => {
    const row = rawById.get(card.id);
    if (!row) return card;
    const chips = chipParticipants(
      row.participants ?? [],
      attributions.filter((a) => a.list_id === card.id),
      publicProfiles,
    );
    return { ...card, chips };
  });
}
