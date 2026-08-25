// Public profile shaping: derives showcase data from a user's PUBLIC done lists.
// Private/unlisted rows must never leak into stats or the card grid.
import { ACHIEVEMENTS, type Level, levelFor } from "./gamification";
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
}

export const EMPTY_SHOWCASE: ProfileShowcase = { achievementKeys: [], favoriteListId: null };

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
  return { achievementKeys: keys, favoriteListId: fav };
}

/**
 * Validate a showcase PATCH payload against the currently stored value.
 * Both fields are optional in the patch; the other field is preserved.
 * Returns the merged full showcase, or null when the payload is malformed.
 */
export function mergeShowcase(
  current: unknown,
  patch: { achievementKeys?: unknown; favoriteListId?: unknown },
): ProfileShowcase | null {
  if (typeof patch !== "object" || patch === null || Array.isArray(patch)) return null;
  const base = parseShowcase(current) ?? EMPTY_SHOWCASE;
  let { achievementKeys, favoriteListId } = base;
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
  return { achievementKeys, favoriteListId };
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
export function shapePublicProfile(rows: DbPublicList[]): {
  cards: PublicListCardData[];
  moviesRanked: number;
  level: Level;
} {
  // ponytail: filters again even though the DB query does NOT scope to public+done
  // (RLS on lists is broader); this JS filter is the actual guarantee — keep it.
  // Defense-in-depth at the trust boundary so stats can't leak via query drift.
  const pub = rows.filter((l) => l.status === "done" && l.visibility === "public");
  const moviesRanked = pub.reduce((n, l) => n + (l.list_movies?.length ?? 0), 0);
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
    level: levelFor(moviesRanked),
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
