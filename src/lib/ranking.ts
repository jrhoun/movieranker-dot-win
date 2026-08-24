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

export const STABILITY_VOTES_N = 6;
export const SHARPEN_GAP_THRESHOLD = 50;
/** Pairs within this gap are settled enough to stop the quick phase but close
 * enough to argue about — Sharpen mode exists to separate them. */
export const SHARPEN_COMFORT_GAP = 120;

function expectedScore(winnerElo: number, loserElo: number): number {
  return 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
}

export function applyWin(
  movies: RankedMovie[],
  winnerTmdbId: number,
  loserTmdbId: number,
): RankedMovie[] {
  if (winnerTmdbId === loserTmdbId) throw new Error("winner and loser must differ");
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



/** Adjacent entries whose elo gap is <= this are tie-banded: swapping inside
 * a band is not a significant order change; movement across bands is. */
export const STABLE_ORDER_TOLERANCE = 30;

/** Desc-elo order merged into tie-band blocks: adjacent entries connected by
 * gaps <= STABLE_ORDER_TOLERANCE land in the same block. Signature = sequence
 * of blocks (each block's tmdbIds sorted canonically). Swaps inside a band
 * leave it unchanged; any cross-band movement changes some block's membership. */
function bandSignature(movies: RankedMovie[]): number[][] {
  const sorted = [...movies].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  const bands: number[][] = [];
  let prev: RankedMovie | undefined;
  for (const m of sorted) {
    if (!prev || prev.elo - m.elo > STABLE_ORDER_TOLERANCE) bands.push([m.tmdbId]);
    else bands[bands.length - 1].push(m.tmdbId);
    prev = m;
  }
  return bands.map((ids) => ids.sort((x, y) => x - y));
}

export function recordMatchupResult(
  movies: RankedMovie[],
  winnerId: number,
  loserId: number,
): { movies: RankedMovie[]; orderChanged: boolean } {
  const before = bandSignature(movies);
  const next = applyWin(movies, winnerId, loserId);
  const after = bandSignature(next);
  const same =
    before.length === after.length &&
    before.every(
      (band, i) => band.length === after[i].length && band.every((id, j) => after[i][j] === id),
    );
  return { movies: next, orderChanged: !same };
}

/** Every active movie needs at least this many comparisons before stability
 * can fire — real evidence behind each position. */
export const STABILITY_MIN_COMPARISONS = 3;

/** Quick phase: stability requires (a) every ACTIVE movie has real evidence
 * (comparisons >= STABILITY_MIN_COMPARISONS), (b) the field has DIFFERENTIATED
 * at least once (significant cross-band movement happened — guards against
 * celebrating an insertion-order list where everything is still tied), and
 * (c) no significant movement for STABILITY_VOTES_N consecutive votes.
 * Sharpen phase afterwards is optional gap tightening (sharpenNextPair);
 * finishing early is always available. */
export function isStable(
  movies: RankedMovie[],
  votesSinceOrderChanged: number,
  significantOrderChangedAtLeastOnce: boolean,
): boolean {
  if (votesSinceOrderChanged < STABILITY_VOTES_N) return false;
  if (!significantOrderChangedAtLeastOnce) return false;
  return movies.every((m) => m.parked || m.comparisons >= STABILITY_MIN_COMPARISONS);
}

/** Remaining work estimate: counts ADJACENT PAIRS WITHIN THE COMFORT BAND
 * (gap <= SHARPEN_COMFORT_GAP) — i.e. close calls sharpen could tighten.
 * Reads as "~N close calls left" rather than votes strictly required; the same
 * ceil(count*2), min-1 formula keeps the progress-bar math unchanged. */
export function estimateRemainingVotes(order: RankedMovie[]): number {
  const sorted = [...order].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  let close = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].elo - sorted[i].elo <= SHARPEN_COMFORT_GAP) close++;
  }
  return Math.max(1, Math.ceil(close * 2));
}

export function sharpenNextPair(order: RankedMovie[]): [RankedMovie, RankedMovie] | null {
  if (order.length < 2) return null;
  // ponytail: O(n log n) re-sort per call; fine at session sizes (~dozens of movies)
  const byElo = [...order].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  let best = 0;
  for (let i = 1; i < byElo.length - 1; i++) {
    if (byElo[i].elo - byElo[i + 1].elo < byElo[best].elo - byElo[best + 1].elo) best = i;
  }
  if (byElo[best].elo - byElo[best + 1].elo > SHARPEN_COMFORT_GAP) return null;
  // ascending-elo order, same convention as nextMatchup
  return [byElo[best + 1], byElo[best]];
}

export function finalizeRanks(movies: RankedMovie[]): { tmdbId: number; rank: number }[] {
  const sorted = [...movies].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  const out: { tmdbId: number; rank: number }[] = [];
  sorted.forEach((m, i) => {
    const rank = i > 0 && m.elo === sorted[i - 1].elo ? out[i - 1].rank : i + 1;
    out.push({ tmdbId: m.tmdbId, rank });
  });
  return out;
}
