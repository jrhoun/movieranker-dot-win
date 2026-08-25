/**
 * Community Verdict stats for themed lists (Stage B). Aggregates over all done
 * lists sharing a theme_slug ("rooms") and derives everything app-side from
 * one fetch of those lists' movies. Pure functions — see theme-stats.test.ts.
 */

export interface ThemeRoomMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  elo: number;
  parked: boolean;
  finalRank: number | null;
}

export interface ThemeRoom {
  id: string;
  movies: ThemeRoomMovie[];
}

export interface MovieVerdict {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  /** Rooms containing this movie — denominators are presence-based, not global, so unlocked rosters stay honest. */
  appearances: number;
  firstCount: number;
  parkedCount: number;
  /** 0..1 fraction of rooms containing the movie where it finished ranked #1. */
  pctRankedFirst: number;
  /** 0..1 fraction of rooms containing the movie that parked it (haven't seen). */
  pctHaventSeen: number;
  /** Population stddev of elo across rooms containing it; null below 2 rooms. */
  eloStdDev: number | null;
}

export interface ThemeStats {
  rooms: number;
  /** Sorted by pctRankedFirst desc, then firstCount desc, then title. */
  movies: MovieVerdict[];
  mostDivisiveId: number | undefined;
  championId: number | null;
}

/** Population standard deviation of xs ([] or singleton -> null). Pure. */
function stdDev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - mean) ** 2, 0) / xs.length);
}

/** Aggregate themed rooms into per-movie verdicts plus divisive/champion picks. */
export function computeThemeStats(rooms: ThemeRoom[]): ThemeStats {
  interface Acc extends Omit<MovieVerdict, "pctRankedFirst" | "pctHaventSeen" | "eloStdDev"> {
    elos: number[];
  }
  const byId = new Map<number, Acc>();

  for (const room of rooms) {
    for (const m of room.movies) {
      let acc = byId.get(m.tmdbId);
      if (!acc) {
        acc = {
          tmdbId: m.tmdbId,
          title: m.title,
          posterPath: m.posterPath,
          appearances: 0,
          firstCount: 0,
          parkedCount: 0,
          elos: [],
        };
        byId.set(m.tmdbId, acc);
      }
      acc.appearances += 1;
      if (m.finalRank === 1) acc.firstCount += 1;
      if (m.parked) acc.parkedCount += 1;
      acc.elos.push(m.elo);
    }
  }

  const movies: MovieVerdict[] = [...byId.values()]
    .map((a) => ({
      tmdbId: a.tmdbId,
      title: a.title,
      posterPath: a.posterPath,
      appearances: a.appearances,
      firstCount: a.firstCount,
      parkedCount: a.parkedCount,
      pctRankedFirst: a.firstCount / a.appearances,
      pctHaventSeen: a.parkedCount / a.appearances,
      eloStdDev: stdDev(a.elos),
    }))
    .sort(
      (x, y) =>
        y.pctRankedFirst - x.pctRankedFirst ||
        y.firstCount - x.firstCount ||
        x.title.localeCompare(y.title),
    );

  // Most divisive: highest elo spread across rooms (needs >=2 rooms to mean anything).
  const divisible = movies.filter((m) => m.eloStdDev !== null);
  const mostDivisive = divisible.length
    ? divisible.reduce((best, m) =>
        m.eloStdDev! > best.eloStdDev! ||
        (m.eloStdDev === best.eloStdDev && m.tmdbId < best.tmdbId)
          ? m
          : best,
      )
    : null;

  // Undisputed champion: #1 in every room it appeared in AND present in >=2 rooms.
  // ponytail: 100%-pctRankedFirst ties resolve deterministically by tmdbId (documented,
  // not changed); add an elo-based secondary key if ties should prefer higher-rated picks.
  const eligible = movies.filter((m) => m.appearances >= 2 && m.pctRankedFirst === 1);
  const champion = eligible.length
    ? eligible.reduce((best, m) => {
        if (m.appearances !== best.appearances)
          return m.appearances > best.appearances ? m : best;
        return m.tmdbId < best.tmdbId ? m : best;
      })
    : null;

  return { rooms: rooms.length, movies, mostDivisiveId: mostDivisive?.tmdbId, championId: champion?.tmdbId ?? null };
}
