import MoviePoster from "./MoviePoster";
import type { RankedRow } from "@/lib/list-view";

export default function RowsView({ movies }: { movies: RankedRow[] }) {
  return (
    <ol className="divide-y divide-white/5">
      {movies.map((m) => (
        <li key={m.tmdbId} className="flex items-center gap-4 py-3">
          <span
            aria-hidden="true"
            className="w-7 shrink-0 text-right font-display text-lg text-gold"
          >
            {m.rank}
          </span>
          <MoviePoster title={m.title} posterPath={m.posterPath} className="w-12 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {m.title}{" "}
              <span className="font-normal text-muted">{m.releaseYear ?? ""}</span>
            </p>
            {/* ponytail: schema stores comparisons (matchups played), not wins — say that honestly until wins are tracked */}
            <p className="text-xs text-muted">
              {m.comparisons} head-to-head{m.comparisons === 1 ? "" : "s"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
