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

function isPair(pair: [RankedMovie, RankedMovie], ids: readonly [number, number]): boolean {
  const [x, y] = [pair[0].tmdbId, pair[1].tmdbId];
  return (x === ids[0] && y === ids[1]) || (x === ids[1] && y === ids[0]);
}

function pairKey(id1: number, id2: number): string {
  return id1 < id2 ? `${id1}:${id2}` : `${id2}:${id1}`;
}

/** Closest-rated least-compared pair. Prioritizes uncompared pairs (timesCompared = 0)
 * so users never see duplicate matchups while fresh pairings exist.
 * Balances comparisons across all movies and picks the closest Elo pairs. */
export function nextMatchup(
  movies: RankedMovie[],
  previousPair?: readonly [number, number],
  pairHistory?: ReadonlyArray<readonly [number, number]>,
): [RankedMovie, RankedMovie] {
  const active = movies.filter((m) => !m.parked);
  if (active.length < 2) throw new Error("nextMatchup needs at least 2 active movies");
  if (active.length === 2) {
    const [a, b] = [active[0], active[1]];
    return a.elo < b.elo || (a.elo === b.elo && a.tmdbId < b.tmdbId) ? [a, b] : [b, a];
  }

  // Count past comparisons per unordered pair from history
  const pairCounts = new Map<string, number>();
  if (pairHistory && pairHistory.length > 0) {
    for (const [w, l] of pairHistory) {
      const k = pairKey(w, l);
      pairCounts.set(k, (pairCounts.get(k) ?? 0) + 1);
    }
  }

  // Generate all unordered pairs
  const allPairs: [RankedMovie, RankedMovie][] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.elo < b.elo || (a.elo === b.elo && a.tmdbId < b.tmdbId)) {
        allPairs.push([a, b]);
      } else {
        allPairs.push([b, a]);
      }
    }
  }

  // Sort candidate pairs:
  // 1. timesCompared: uncompared (0) first — never repeat when fresh pairs exist
  // 2. isImmediatePrevious: skip the exact previous matchup if any alternative exists
  // 3. sumComparisons: balance overall participation so all movies get evaluated
  // 4. eloGap: closest Elo ratings (maximum information gain / entropy)
  // 5. deterministic tie-breakers
  allPairs.sort((p, q) => {
    const keyP = pairKey(p[0].tmdbId, p[1].tmdbId);
    const keyQ = pairKey(q[0].tmdbId, q[1].tmdbId);
    const countP = pairCounts.get(keyP) ?? 0;
    const countQ = pairCounts.get(keyQ) ?? 0;
    if (countP !== countQ) return countP - countQ;

    const prevP = previousPair && isPair(p, previousPair) ? 1 : 0;
    const prevQ = previousPair && isPair(q, previousPair) ? 1 : 0;
    if (prevP !== prevQ) return prevP - prevQ;

    const sumP = p[0].comparisons + p[1].comparisons;
    const sumQ = q[0].comparisons + q[1].comparisons;
    if (sumP !== sumQ) return sumP - sumQ;

    const gapP = Math.abs(p[1].elo - p[0].elo);
    const gapQ = Math.abs(q[1].elo - q[0].elo);
    if (gapP !== gapQ) return gapP - gapQ;

    if (p[0].elo !== q[0].elo) return p[0].elo - q[0].elo;
    if (p[0].tmdbId !== q[0].tmdbId) return p[0].tmdbId - q[0].tmdbId;
    return p[1].tmdbId - q[1].tmdbId;
  });

  return allPairs[0];
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
 * at least once, and (c) no significant movement for stabilityVotesN consecutive votes. */
export function isStable(
  movies: RankedMovie[],
  votesSinceOrderChanged: number,
  significantOrderChangedAtLeastOnce: boolean,
): boolean {
  const active = movies.filter((m) => !m.parked);
  if (active.length < 2) return false;
  if (votesSinceOrderChanged < stabilityVotesN(active.length)) return false;
  if (!significantOrderChangedAtLeastOnce) return false;
  return movies.every((m) => m.parked || m.comparisons >= STABILITY_MIN_COMPARISONS);
}

/** Quick-exit helper: Returns true when top 3 active movies have sufficient
 * evidence and clear separation from rank 4, letting users lock in their podium early. */
export function isPodiumLocked(movies: RankedMovie[]): boolean {
  const active = movies.filter((m) => !m.parked).sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  if (active.length < 4) return false;
  // Top 3 must each have at least 2 comparisons
  if (active.slice(0, 3).some((m) => m.comparisons < 2)) return false;
  // Clear separation between #3 and #4 (at least 20 Elo)
  return active[2].elo - active[3].elo >= 20;
}

/** Remaining work estimate: counts ADJACENT PAIRS WITHIN THE COMFORT BAND
 * (gap <= SHARPEN_COMFORT_GAP) — i.e. close calls sharpen could tighten. */
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
 * n=4..20 stabilize at ~1.0× n·log₂n votes at 85% consistency). */
export function expectedConsensusVotes(activeCount: number): number {
  return Math.ceil(activeCount * Math.log2(Math.max(2, activeCount)));
}

/** Sharpen-phase status line */
export function closeCallProgress(current: number, initial: number): string {
  if (current <= 0) return "No close calls left — ready to finish.";
  return `${current} of ${initial} matchups still too close to call`;
}

export function sharpenNextPair(order: RankedMovie[]): [RankedMovie, RankedMovie] | null {
  if (order.length < 2) return null;
  const byElo = [...order].sort((a, b) => b.elo - a.elo || a.tmdbId - b.tmdbId);
  let best = 0;
  for (let i = 1; i < byElo.length - 1; i++) {
    if (byElo[i].elo - byElo[i + 1].elo < byElo[best].elo - byElo[best + 1].elo) best = i;
  }
  if (byElo[best].elo - byElo[best + 1].elo > SHARPEN_COMFORT_GAP) return null;
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
