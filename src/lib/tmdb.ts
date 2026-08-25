const TMDB_BASE = "https://api.themoviedb.org/3";

const MOVIE_TYPE = "movie";

export interface TmdbPerson {
  id: number;
  name: string;
}

export interface TmdbCompany {
  id: number;
  name: string;
  origin_country?: string;
  popularity?: number;
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

export async function searchPerson(q: string): Promise<TmdbPerson[]> {
  const data = await tmdbFetch<{ results: TmdbPerson[] }>("/search/person", { query: q }, 300);
  return data.results ?? [];
}

export async function getPersonCredits(personId: number): Promise<TmdbMovieCredit[]> {
  const data = await tmdbFetch<{ cast?: TmdbRawCredit[]; crew?: TmdbRawCredit[] }>(
    `/person/${personId}/combined_credits`,
    {},
    86400,
  );
  return shapeCredits(data);
}

// Pure: dedupe same-named companies (TMDB has many duplicate entries),
// preferring higher popularity, then float exact case-insensitive name
// matches to the front so "A24" surfaces the real studio first.
export function rankCompanies(results: TmdbCompany[], query: string): TmdbCompany[] {
  const q = query.trim().toLowerCase();
  const byName = new Map<string, TmdbCompany>();
  for (const c of results) {
    const key = c.name.toLowerCase();
    const prev = byName.get(key);
    if (!prev || (c.popularity ?? 0) > (prev.popularity ?? 0)) byName.set(key, c);
  }
  return [...byName.values()].sort(
    (a, b) => Number(q !== "" && a.name.toLowerCase() === q ? 0 : 1) -
      Number(q !== "" && b.name.toLowerCase() === q ? 0 : 1),
  );
}

export async function searchCompany(q: string): Promise<TmdbCompany[]> {
  const data = await tmdbFetch<{ results: TmdbCompany[] }>("/search/company", { query: q }, 300);
  return rankCompanies(data.results ?? [], q);
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

/** Single movie by TMDB id (cached a day); null on failure or missing poster art. */
export async function getMovieById(id: number): Promise<TmdbMovieCredit | null> {
  try {
    const m = await tmdbFetch<TmdbRawCredit>(`/movie/${id}`, {}, 86400);
    if (!m.poster_path) return null; // strip needs poster art
    return toCredit(m);
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
