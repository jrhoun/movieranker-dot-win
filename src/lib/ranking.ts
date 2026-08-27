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

/** All unordered pairs of a movie list; each pair ordered lower-elo first
 * (tmdbId asc on ties) and the list ordered so the first pair is the closest-rated
 * one — identical choice and tie-breaks as the original adjacent-scan: gap asc,
 * then the lower movie's (elo, tmdbId). */
function candidatePairs(list: RankedMovie[]): [RankedMovie, RankedMovie][] {
  const byElo = [...list].sort((a, b) => a.elo - b.elo || a.tmdbId - b.tmdbId);
  const pairs: [RankedMovie, RankedMovie][] = [];
  for (let i = 0; i < byElo.length; i++)
    for (let j = i + 1; j < byElo.length; j++) pairs.push([byElo[i], byElo[j]]);
  return pairs.sort(
    (p, q) =>
      p[1].elo - p[0].elo - (q[1].elo - q[0].elo) ||
      p[0].elo - q[0].elo ||
      p[0].tmdbId - q[0].tmdbId,
  );
}

function isPair(pair: [RankedMovie, RankedMovie], ids: readonly [number, number]): boolean {
  const [x, y] = [pair[0].tmdbId, pair[1].tmdbId];
  return (x === ids[0] && y === ids[1]) || (x === ids[1] && y === ids[0]);
}

/** Closest-rated least-compared pair. `previousPair` (tmdbIds, any order) is the
 * anti-immediate-repeat rule: the exact last matchup is skipped whenever any
 * alternative exists, so one vote can't leave the same two movies facing off
 * again. Falls back to the wider roster if the least-compared tier IS the
 * previous pair; with only two active movies the rematch is unavoidable and
 * returned as-is. */
export function nextMatchup(
  movies: RankedMovie[],
  previousPair?: readonly [number, number],
): [RankedMovie, RankedMovie] {
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

  const pairs = candidatePairs(pool);
  const alternatives = previousPair ? pairs.filter((p) => !isPair(p, previousPair)) : pairs;
  if (alternatives.length > 0) return alternatives[0];
  // pool offered only the previous pair — widen to the whole roster
  const wide = previousPair ? candidatePairs(active).filter((p) => !isPair(p, previousPair)) : [];
  return wide[0] ?? pairs[0];
}



/** Quiet-streak requirement, size-scaled: small rosters settle fast, so they
 * owe fewer consecutive quiet votes; n>=12 keeps the original 6. */
export function stabilityVotesN(activeCount: number): number {
  return Math.max(3, Math.min(STABILITY_VOTES_N, Math.ceil(activeCount / 2)));
}

export const STABLE_ORDER_TOLERANCE = 30;

/** Split/merge inertia: a merged pair must exceed tolerance + this to split,
 * a split pair must fall under tolerance - this to re-merge. Kills the
 * boundary-hover oscillation that resets settling on alternating wins. */
const HYSTERESIS = STABLE_ORDER_TOLERANCE / 2;

/** Desc-elo order merged into tie-band blocks: adjacent entries whose gap
 * <= tolerance land in the same block. Signature = sequence of bands (each
 * band's tmdbIds sorted canonically). Swaps inside a band leave it unchanged;
 * any boundary crossing moves some id between blocks. */
function bandSignature(movies: RankedMovie[], tolerance: number): number[][] {
  const sorted = [...movies].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  const bands: number[][] = [];
  let prev: RankedMovie | undefined;
  for (const m of sorted) {
    if (!prev || prev.elo - m.elo > tolerance) bands.push([m.tmdbId]);
    else bands[bands.length - 1].push(m.tmdbId);
    prev = m;
  }
  return bands.map((ids) => ids.sort((x, y) => x - y));
}

function sameSignature(a: number[][], b: number[][]): boolean {
  return (
    a.length === b.length &&
    a.every((band, i) => band.length === b[i].length && band.every((id, j) => b[i][j] === id))
  );
}

export function recordMatchupResult(
  movies: RankedMovie[],
  winnerId: number,
  loserId: number,
): { movies: RankedMovie[]; orderChanged: boolean } {
  const tol = STABLE_ORDER_TOLERANCE;
  const before = bandSignature(movies, tol);
  const next = applyWin(movies, winnerId, loserId);
  // Hysteresis: a pair hovering AT the tolerance boundary would flip
  // merged/split on alternating wins, resetting settling forever. So the
  // after-signature uses sticky thresholds per adjacency: pairs already in one
  // band must clearly separate (> tol + HYSTERESIS) to split, split pairs must
  // get clearly close (< tol - HYSTERESIS) to re-merge.
  const beforeBandOf = new Map<number, number>();
  before.forEach((band, i) => band.forEach((id) => beforeBandOf.set(id, i)));
  const byElo = [...next].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  const after: number[][] = [];
  let prevMovie: RankedMovie | undefined;
  for (const m of byElo) {
    const gap = prevMovie ? prevMovie.elo - m.elo : Infinity;
    const sameBefore =
      prevMovie != null &&
      beforeBandOf.get(prevMovie.tmdbId) === beforeBandOf.get(m.tmdbId);
    const threshold = sameBefore ? tol + HYSTERESIS : Math.max(0, tol - HYSTERESIS);
    if (!prevMovie || gap > threshold) after.push([m.tmdbId]);
    else after[after.length - 1].push(m.tmdbId);
    prevMovie = m;
  }
  const afterSig = after.map((ids) => ids.sort((x, y) => x - y));
  return { movies: next, orderChanged: !sameSignature(before, afterSig) };
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
  if (votesSinceOrderChanged < stabilityVotesN(movies.filter((m) => !m.parked).length))
    return false;
  if (!significantOrderChangedAtLeastOnce) return false;
  return movies.every((m) => m.parked || m.comparisons >= STABILITY_MIN_COMPARISONS);
}

/** Remaining work estimate: counts ADJACENT PAIRS WITHIN THE COMFORT BAND
 * (gap <= SHARPEN_COMFORT_GAP) — i.e. close calls sharpen could tighten.
 * Reads as "~N close calls left" rather than votes strictly required; the same
 * ceil(count*2), min-1 formula keeps the progress-bar math unchanged. */
/** Raw adjacent-pair count within the comfort band — no vote-estimate floor.
 * Backs both the ~votes estimate and the resolved-vs-initial progress line. */
export function countClosePairs(order: RankedMovie[]): number {
  const sorted = [...order].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  let close = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].elo - sorted[i].elo <= SHARPEN_COMFORT_GAP) close++;
  }
  return close;
}

export function estimateRemainingVotes(order: RankedMovie[]): number {
  return Math.max(1, Math.ceil(countClosePairs(order) * 2));
}

/** Empirical votes-to-consensus for the tuned engine (sim medians r5:
 * n=4..20 stabilize at ~1.0× n·log₂n votes at 85% consistency). Backs the
 * room's progress bar — NOT a promise: variance is real, hence the bar caps
 * at 99% until stability actually fires. */
export function expectedConsensusVotes(activeCount: number): number {
  return Math.ceil(activeCount * Math.log2(Math.max(2, activeCount)));
}

/** Sharpen-phase status line: current-vs-initial so slow progress stays visible
 * even though one vote moves a pair only ~16–32 elo points. Honest by design:
 * a vote that nets zero resolutions just holds the fraction steady. */
export function closeCallProgress(current: number, initial: number): string {
  if (current <= 0) return "No close calls left — ready to finish.";
  return `${current} of ${initial} matchups still too close to call`;
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

export function finalizeRanks(movies: RankedMovie[]): { tmdbId: number; rank: number | null }[] {
  const active = movies.filter((m) => !m.parked).sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  const parked = movies.filter((m) => m.parked);
  const out: { tmdbId: number; rank: number | null }[] = [];
  active.forEach((m, i) => {
    const rank = i > 0 && m.elo === active[i - 1].elo ? (out[i - 1]?.rank ?? i + 1) : i + 1;
    out.push({ tmdbId: m.tmdbId, rank });
  });
  parked.forEach((m) => {
    out.push({ tmdbId: m.tmdbId, rank: null });
  });
  return out;
}
