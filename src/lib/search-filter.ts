/** Client-side title-substring filter for the browse-all modal (case-insensitive). */
export function filterByTitle<T extends { title: string }>(movies: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return movies;
  return movies.filter((m) => m.title.toLowerCase().includes(needle));
}
