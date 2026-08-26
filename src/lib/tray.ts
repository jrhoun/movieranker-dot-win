import type { TmdbMovieCredit } from "@/lib/tmdb";

/** Hard cap on movies per list: rankings beyond this take unrealistic time. */
export const MAX_LIST_SIZE = 100;
/** Crossing this size triggers a one-time gentle split-the-list hint. */
export const SOFT_WARN_AT = 40;

/** Dedupe-safe merge into the candidate tray, kept title-sorted like single adds.
 *  Silently truncates at MAX_LIST_SIZE so every add path (single pick, hero fan,
 *  shift+click range, "Add all") stops at the cap without extra caller logic. */
export function mergeCandidates(
  current: TmdbMovieCredit[],
  incoming: TmdbMovieCredit[],
): TmdbMovieCredit[] {
  const known = new Set(current.map((c) => c.tmdbId));
  const merged = [
    ...current,
    ...incoming.filter((m) => !known.has(m.tmdbId)),
  ].slice(0, MAX_LIST_SIZE);
  return merged.sort((a, b) => a.title.localeCompare(b.title));
}

/** Dedupe-safe batch removal: drops every candidate whose tmdbId appears in incoming. */
export function removeCandidates(
  current: TmdbMovieCredit[],
  incoming: TmdbMovieCredit[],
): TmdbMovieCredit[] {
  const gone = new Set(incoming.map((m) => m.tmdbId));
  return current.filter((c) => !gone.has(c.tmdbId));
}

/** Inclusive index range between two positions, either order: (0,3)->[0,1,2,3], (4,2)->[2,3,4]. */
export function rangeIndices(a: number, b: number): number[] {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

/** Comma-separated participant entry: "Dave, Sarah" -> ["Dave", "Sarah"]. */
export function parseParticipantNames(draft: string): string[] {
  const names: string[] = [];
  for (const raw of draft.split(",")) {
    const name = raw.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
