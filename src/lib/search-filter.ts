/** Client-side title-substring filter for the browse-all modal (case-insensitive). */
export function filterByTitle<T extends { title: string }>(movies: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return movies;
  return movies.filter((m) => m.title.toLowerCase().includes(needle));
}

export type BrowseSortOption =
  | "year-desc"
  | "year-asc"
  | "title-asc"
  | "title-desc"
  | "relevance";

/** Sort movies client-side for the browse-all modal. */
export function sortMovies<T extends { title: string; releaseYear?: number | null }>(
  movies: T[],
  sort: BrowseSortOption,
): T[] {
  if (sort === "relevance") return [...movies];

  return [...movies].sort((a, b) => {
    if (sort === "year-desc") {
      const yearA = a.releaseYear ?? -Infinity;
      const yearB = b.releaseYear ?? -Infinity;
      if (yearA !== yearB) return yearB - yearA;
      return a.title.localeCompare(b.title);
    }
    if (sort === "year-asc") {
      const yearA = a.releaseYear ?? Infinity;
      const yearB = b.releaseYear ?? Infinity;
      if (yearA !== yearB) return yearA - yearB;
      return a.title.localeCompare(b.title);
    }
    if (sort === "title-asc") {
      return a.title.localeCompare(b.title);
    }
    if (sort === "title-desc") {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });
}
