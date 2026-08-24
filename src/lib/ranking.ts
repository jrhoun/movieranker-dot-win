export interface RankedMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  elo: number;
  comparisons: number;
  parked: boolean;
}

const K = 32;

function expectedScore(winnerElo: number, loserElo: number): number {
  return 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
}

export function applyWin(
  movies: RankedMovie[],
  winnerTmdbId: number,
  loserTmdbId: number,
): RankedMovie[] {
  const winner = movies.find((m) => m.tmdbId === winnerTmdbId);
  const loser = movies.find((m) => m.tmdbId === loserTmdbId);
  if (!winner || !loser) throw new Error("winner and loser must exist in movies");

  const expected = expectedScore(winner.elo, loser.elo);
  const delta = K * (1 - expected);
  return movies.map((m) => {
    if (m.tmdbId === winnerTmdbId)
      return { ...m, elo: Math.max(1, m.elo + delta), comparisons: m.comparisons + 1 };
    if (m.tmdbId === loserTmdbId)
      return { ...m, elo: Math.max(1, m.elo - delta), comparisons: m.comparisons + 1 };
    return m;
  });
}

export function nextMatchup(movies: RankedMovie[]): [RankedMovie, RankedMovie] {
  const active = movies.filter((m) => !m.parked);
  if (active.length < 2) throw new Error("nextMatchup needs at least 2 active movies");

  // "least-recently-compared" = lowest comparisons count
  const minComparisons = Math.min(...active.map((m) => m.comparisons));
  let pool = active.filter((m) => m.comparisons === minComparisons);

  // ponytail: odd rotation leaves a single least-compared movie; pair it with its closest-rated peer instead of tracking timestamps
  if (pool.length < 2) {
    const rest = active.filter((m) => m.comparisons !== minComparisons);
    const other = rest.reduce((a, b) => {
      const da = Math.abs(a.elo - pool[0].elo);
      const db = Math.abs(b.elo - pool[0].elo);
      return db < da || (db === da && b.tmdbId < a.tmdbId) ? b : a;
    });
    pool = [pool[0], other];
  }

  // closest-rated pair in pool; ties broken by tmdbId ascending via the (elo, tmdbId) sort
  const sorted = [...pool].sort((a, b) => a.elo - b.elo || a.tmdbId - b.tmdbId);
  let best = 0;
  for (let i = 1; i < sorted.length - 1; i++) {
    if (sorted[i + 1].elo - sorted[i].elo < sorted[best + 1].elo - sorted[best].elo) best = i;
  }
  return [sorted[best], sorted[best + 1]];
}
