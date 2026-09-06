/** Pure VERSUS computation: compare two finished rankings side by side.
 * Proposal #6 — "Your Nolan ranking vs Sarah's". No I/O; pages fetch rows.
 * Access gating lives in canCompare(); math lives in computeVersus(). */

export interface VersusEntry {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  rank: number;
}

export interface SharedMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  rankA: number;
  rankB: number;
  /** rankB - rankA; negative = List B ranked it better (lower number wins). */
  delta: number;
}

export interface VersusResult {
  /** Intersection by tmdbId, in List A's rank order. */
  shared: SharedMovie[];
  /** Pairwise order-agreement % over all pairs of shared movies; null when
   * fewer than 2 shared (no pairs to agree or disagree about). */
  agreementPct: number | null;
  /** Backward-compatible alias for agreementPct */
  compatibilityScore: number | null;
  /** Top 5 arguments sorted by |delta| desc */
  biggestArguments: SharedMovie[];
  /** Single sharpest clash (movie with highest |delta| > 0); null if no differences or no shared */
  sharpestClash: SharedMovie | null;
  /** Mutual favorites (both ranked highly), sorted by (rankA + rankB) asc */
  sharedFavorites: SharedMovie[];
  onlyInA: VersusEntry[];
  onlyInB: VersusEntry[];
}

function intersect(a: VersusEntry[], b: VersusEntry[]) {
  const bById = new Map(b.map((m) => [m.tmdbId, m]));
  const shared: SharedMovie[] = [];
  const onlyInA: VersusEntry[] = [];
  const seen = new Set<number>();
  for (const m of a) {
    const other = bById.get(m.tmdbId);
    if (!other) {
      onlyInA.push(m);
      continue;
    }
    seen.add(m.tmdbId);
    shared.push({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath,
      rankA: m.rank,
      rankB: other.rank,
      delta: other.rank - m.rank,
    });
  }
  return { shared, onlyInA, onlyInB: b.filter((m) => !seen.has(m.tmdbId)) };
}

/** Finds the #1 most contentious movie (highest absolute rank difference |delta| > 0). */
export function findSharpestClash(shared: SharedMovie[]): SharedMovie | null {
  const differing = shared.filter((m) => m.delta !== 0);
  if (differing.length === 0) return null;
  return [...differing].sort((a, b) => {
    const diff = Math.abs(b.delta) - Math.abs(a.delta);
    if (diff !== 0) return diff;
    // Tie-breaker: prefer the film ranked highest by either voter (min rank)
    const minRankA = Math.min(a.rankA, a.rankB);
    const minRankB = Math.min(b.rankA, b.rankB);
    if (minRankA !== minRankB) return minRankA - minRankB;
    return a.rankA - b.rankA;
  })[0];
}

/** Finds films that both users ranked highly (mutual favorites). */
export function findSharedFavorites(shared: SharedMovie[], maxRankThreshold = 5): SharedMovie[] {
  if (shared.length === 0) return [];
  // First, find items where both voters placed it in the top maxRankThreshold
  const topTier = shared.filter((m) => m.rankA <= maxRankThreshold && m.rankB <= maxRankThreshold);
  if (topTier.length > 0) {
    return [...topTier].sort((a, b) => (a.rankA + a.rankB) - (b.rankA + b.rankB) || a.rankA - b.rankA);
  }
  // If none in top maxRankThreshold, look for mutual top 10 with close delta (|delta| <= 3)
  const broader = shared.filter((m) => m.rankA <= 10 && m.rankB <= 10 && Math.abs(m.delta) <= 3);
  if (broader.length > 0) {
    return [...broader].sort((a, b) => (a.rankA + a.rankB) - (b.rankA + b.rankB) || a.rankA - b.rankA);
  }
  // Otherwise top items by sum of ranks with small delta
  return [...shared]
    .filter((m) => Math.abs(m.delta) <= 3)
    .sort((a, b) => (a.rankA + a.rankB) - (b.rankA + b.rankB))
    .slice(0, 3);
}

/** Playful compatibility copy tier (DESIGN.md Premiere Night voice). */
export function compatibilityTier(pct: number): string {
  if (pct >= 90) return "Basically twins";
  if (pct >= 70) return "Mostly aligned";
  if (pct >= 50) return "Spicy differences";
  return "Opposite ends of the couch";
}

/**
 * A list is comparable iff the viewer can read it AND it is finished:
 * done + public/unlisted for anyone with the link, or owned+done at any
 * visibility (RLS lets owners read their own rows). Drafts never compare.
 */
export function canCompare(
  row: { status: string; visibility: string | null; ownerId: string },
  viewerId: string | null,
): boolean {
  return (
    row.status === "done" &&
    (row.visibility === "public" ||
      row.visibility === "unlisted" ||
      row.ownerId === viewerId)
  );
}

/** Accepts a bare list id or a movieranker list URL (/l/<id>); null otherwise. */
export function extractListId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).pathname.match(/\/l\/([^/]+)/)?.[1] ?? null;
    } catch {
      return null;
    }
  }
  return /^[^/\s]+$/.test(s) ? s : null;
}

export function computeVersus(a: VersusEntry[], b: VersusEntry[]): VersusResult {
  const { shared, onlyInA, onlyInB } = intersect(a, b);

  let pairs = 0;
  let agrees = 0;
  for (let i = 0; i < shared.length; i++) {
    for (let j = i + 1; j < shared.length; j++) {
      pairs++;
      // ponytail: rank ties count as disagreement — finalizeRanks ties are rare
      // and either convention is defensible; revisit only if users notice.
      if ((shared[i].rankA - shared[j].rankA) * (shared[i].rankB - shared[j].rankB) > 0)
        agrees++;
    }
  }

  const agreementPct = pairs === 0 ? null : Math.round((agrees / pairs) * 100);

  return {
    shared,
    agreementPct,
    compatibilityScore: agreementPct,
    // Stable sort keeps A's rank order among equal-magnitude arguments.
    biggestArguments: [...shared]
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 5),
    sharpestClash: findSharpestClash(shared),
    sharedFavorites: findSharedFavorites(shared),
    onlyInA,
    onlyInB,
  };
}
