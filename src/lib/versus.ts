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
  biggestArguments: SharedMovie[];
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

  return {
    shared,
    agreementPct: pairs === 0 ? null : Math.round((agrees / pairs) * 100),
    // Stable sort keeps A's rank order among equal-magnitude arguments.
    biggestArguments: [...shared]
      .sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
      .slice(0, 5),
    onlyInA,
    onlyInB,
  };
}
