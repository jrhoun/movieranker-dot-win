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

/** Comma-separated participant entry: "Dave, Sarah" -> ["Dave", "Sarah"]. */
export function parseParticipantNames(draft: string): string[] {
  const names: string[] = [];
  for (const raw of draft.split(",")) {
    const name = raw.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
