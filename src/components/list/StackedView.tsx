import MoviePoster from "./MoviePoster";
import { podiumDisplayOrder, splitPodium, type RankedRow } from "@/lib/list-view";

function RankBadge({ rank, big = false }: { rank: number; big?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute -left-1 -top-2 z-10 font-mono font-bold text-accent drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] ${
        big ? "text-4xl" : "text-xl"
      }`}
    >
      {rank}
    </span>
  );
}

export default function StackedView({ movies }: { movies: RankedRow[] }) {
  const { podium, rest } = splitPodium(movies);
  const ordered = podiumDisplayOrder(podium);
  const winner = podium.find((m) => m.rank === 1);

  return (
    <div>
      {podium.length > 0 && (
        <div className="flex items-end justify-center gap-3 px-2 pt-5 sm:gap-5">
          {ordered.map((m) => (
            <div
              key={m.tmdbId}
              className={`relative ${m.rank === 1 ? "w-36 sm:w-44" : "w-[5.5rem] sm:w-28"}`}
            >
              <RankBadge rank={m.rank} big={m.rank === 1} />
              <MoviePoster title={m.title} posterPath={m.posterPath} />
              <p
                className={`mt-2 truncate text-center ${m.rank === 1 ? "text-sm font-semibold" : "text-xs"}`}
              >
                {m.title}
                {/* screen readers need the real rank; the badge numeral is decorative */}
                <span className="sr-only"> — ranked #{m.rank}</span>
              </p>
              <p className="text-center text-xs text-muted">{m.releaseYear ?? "—"}</p>
            </div>
          ))}
        </div>
      )}
      {winner && <p className="sr-only">Winner: {winner.title}</p>}
      {rest.length > 0 && (
        <ol className="mt-10 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
          {rest.map((m) => (
            <li key={m.tmdbId} className="relative">
              <RankBadge rank={m.rank} />
              <MoviePoster title={m.title} posterPath={m.posterPath} />
              <p className="mt-1.5 truncate text-xs">
                {m.title}
                <span className="sr-only"> — ranked #{m.rank}</span>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
