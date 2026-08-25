import type { TmdbMovieCredit } from "@/lib/tmdb";

/** Dedupe-safe merge into the candidate tray, kept title-sorted like single adds. */
export function mergeCandidates(
  current: TmdbMovieCredit[],
  incoming: TmdbMovieCredit[],
): TmdbMovieCredit[] {
  const known = new Set(current.map((c) => c.tmdbId));
  return [...current, ...incoming.filter((m) => !known.has(m.tmdbId))].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
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
