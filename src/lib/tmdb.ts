const TMDB_BASE = "https://api.themoviedb.org/3";

const MOVIE_TYPE = "movie";

export interface TmdbPerson {
  id: number;
  name: string;
  popularity?: number;
}

export interface TmdbCompany {
  id: number;
  name: string;
  origin_country?: string;
  popularity?: number;
  movieCount?: number;
}

export interface TmdbMovieCredit {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
}

interface TmdbRawCredit {
  id: number;
  media_type?: string;
  popularity?: number;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string> = {},
  revalidate: number,
): Promise<T> {
  const url = `${TMDB_BASE}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}` },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`TMDB ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function toCredit(m: TmdbRawCredit): TmdbMovieCredit {
  return {
    tmdbId: m.id,
    title: m.title ?? "",
    posterPath: m.poster_path ?? null,
    releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
  };
}

// Pure shaping of a combined_credits-style payload ({cast, crew}).
export function shapeCredits(raw: {
  cast?: TmdbRawCredit[];
  crew?: TmdbRawCredit[];
}): TmdbMovieCredit[] {
  const seen = new Set<number>();
  return [...(raw.cast ?? []), ...(raw.crew ?? [])]
    .filter((m) => m.media_type === "movie")
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .flatMap((m) => {
      if (seen.has(m.id)) return [];
      seen.add(m.id);
      return [toCredit(m)];
    });
}

const NAME_CAP = 8;

// Pure shaping for person/company suggestions: collapse duplicate names
// (TMDB has many, e.g. two A24 entries) keeping the more popular id, float
// exact case-insensitive matches first, then rank by popularity descending,
// and cap so users see few confident choices instead of obscure duplicates.
export function rankNameResults<T extends { name: string; popularity?: number }>(
  results: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  const byName = new Map<string, T>();
  for (const r of results) {
    const key = r.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || (r.popularity ?? 0) > (prev.popularity ?? 0)) byName.set(key, r);
  }
  return [...byName.values()]
    .sort((a, b) => {
      const aExact = Number(a.name.toLowerCase() === q);
      const bExact = Number(b.name.toLowerCase() === q);
      if (aExact !== bExact) return bExact - aExact;
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    })
    .slice(0, NAME_CAP);
}

export async function searchPerson(q: string): Promise<TmdbPerson[]> {
  const data = await tmdbFetch<{ results: TmdbPerson[] }>("/search/person", { query: q }, 300);
  return rankNameResults(data.results ?? [], q);
}

export async function getPersonCredits(personId: number): Promise<TmdbMovieCredit[]> {
  const data = await tmdbFetch<{ cast?: TmdbRawCredit[]; crew?: TmdbRawCredit[] }>(
    `/person/${personId}/combined_credits`,
    {},
    86400,
  );
  return shapeCredits(data);
}

/** Total movie count for a company via /discover/movie (cached an hour). */
export async function getCompanyMovieCount(companyId: number): Promise<number> {
  const data = await tmdbFetch<{ total_results?: number }>(
    "/discover/movie",
    { with_companies: String(companyId), page: "1" },
    3600,
  );
  return data.total_results ?? 0;
}

// ponytail: per-count failures just omit the id (ranked as 0) instead of failing suggestions
export async function getCompanyMovieCounts(ids: number[]): Promise<Map<number, number>> {
  const settled = await Promise.allSettled(ids.map(getCompanyMovieCount));
  const map = new Map<number, number>();
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") map.set(ids[i], r.value);
  });
  return map;
}

// Pure: companies ranked by total movie count (TMDB /search/company has no
// usable popularity ordering — searching "disney" surfaced regional entries
// like Disney Türkiye ahead of Walt Disney). Exact matches still float first;
// missing counts sort last; ties break alphabetically.
export function rankCompaniesByCount<T extends { name: string; movieCount?: number }>(
  results: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  return [...results].sort((a, b) => {
    const aExact = Number(a.name.toLowerCase() === q);
    const bExact = Number(b.name.toLowerCase() === q);
    if (aExact !== bExact) return bExact - aExact;
    const diff = (b.movieCount ?? 0) - (a.movieCount ?? 0);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });
}

export async function searchCompany(q: string): Promise<TmdbCompany[]> {
  const data = await tmdbFetch<{ results: TmdbCompany[] }>("/search/company", { query: q }, 300);
  // Dedupe + cap via popularity first (only ≤8 displayed), then enrich those
  // with real movie counts and re-rank by count.
  const candidates = rankNameResults(data.results ?? [], q);
  const counts = await getCompanyMovieCounts(candidates.map((c) => c.id));
  return rankCompaniesByCount(
    candidates.map((c) => ({ ...c, movieCount: counts.get(c.id) })),
    q,
  );
}

// ponytail: pages 1-3 fetched concurrently; sequential pages only if TMDB rate-limits
async function discoverMovies(params: Record<string, string>): Promise<TmdbMovieCredit[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      tmdbFetch<{ results: TmdbRawCredit[] }>("/discover/movie", { ...params, page: String(page) }, 3600),
    ),
  );
  const byId = new Map<number, TmdbMovieCredit>();
  for (const page of pages) {
    for (const m of page.results ?? []) {
      if (!byId.has(m.id)) byId.set(m.id, toCredit(m));
    }
  }
  return [...byId.values()];
}

export async function discoverByCompany(companyId: number): Promise<TmdbMovieCredit[]> {
  return discoverMovies({
    with_companies: String(companyId),
    sort_by: "primary_release_date.desc",
  });
}

/** Resolve a free-text query to TMDB's top keyword match, then discover by it. */
export async function searchByKeyword(q: string): Promise<TmdbMovieCredit[]> {
  const data = await tmdbFetch<{ results?: { id: number }[] }>("/search/keyword", { query: q }, 300);
  const kw = data.results?.[0];
  if (!kw) return [];
  return discoverMovies({ with_keywords: String(kw.id), sort_by: "popularity.desc" });
}

// Pure: prefer an English-tagged poster, then a language-less one, then whatever
// the movie's primary art is. Posters come from /movie/{id}/images.
export function pickPoster(
  posters: { iso_639_1?: string | null; file_path?: string | null }[],
  primaryPath: string | null,
): string | null {
  const pick =
    posters.find((p) => p.iso_639_1 === "en") ??
    posters.find((p) => p.iso_639_1 == null);
  return pick?.file_path ?? primaryPath;
}

/** Poster path preferring English art; falls back to primaryPath on any failure. */
export async function getPreferredPosterPath(
  tmdbId: number,
  primaryPath: string | null,
): Promise<string | null> {
  try {
    const data = await tmdbFetch<{
      posters?: { iso_639_1?: string | null; file_path?: string | null }[];
    }>(`/movie/${tmdbId}/images`, { include_image_language: "en,null" }, 86400);
    return pickPoster(data.posters ?? [], primaryPath);
  } catch {
    return primaryPath;
  }
}

/** Single movie by TMDB id (cached a day); null only if the lookup itself fails. */
export async function getMovieById(id: number): Promise<TmdbMovieCredit | null> {
  try {
    const m = await tmdbFetch<TmdbRawCredit>(`/movie/${id}`, {}, 86400);
    // No primary art: look for en/null-language alternates; if none exist keep
    // the credit with posterPath=null (MoviePoster renders a placeholder) so
    // strip/fan/copy counts stay honest instead of silently dropping titles.
    const posterPath = m.poster_path ?? (await getPreferredPosterPath(id, null));
    return toCredit({ ...m, poster_path: posterPath });
  } catch {
    return null;
  }
}

export async function searchMovies(q: string): Promise<TmdbMovieCredit[]> {
  const data = await tmdbFetch<{ results: TmdbRawCredit[] }>("/search/movie", { query: q }, 300);
  // search/movie results lack media_type; tag them so shapeCredits keeps them
  return shapeCredits({
    cast: (data.results ?? []).map((m) => ({ ...m, media_type: MOVIE_TYPE })),
  });
}
