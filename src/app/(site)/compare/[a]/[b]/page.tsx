import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MarqueeHeading from "@/components/MarqueeHeading";
import MoviePoster from "@/components/list/MoviePoster";
import ShareButton from "@/components/ShareButton";
import { SITE_URL } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { tmdbMovieUrl } from "@/lib/tmdb";
import {
  canCompare,
  compatibilityTier,
  computeVersus,
  type SharedMovie,
  type VersusEntry,
} from "@/lib/versus";

interface DbListRow {
  id: string;
  title: string;
  status: string;
  visibility: string | null;
  owner_id: string;
}

interface DbMovieRow {
  list_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  final_rank: number | null;
}

function shareUrl(listId: string): string {
  return `${SITE_URL}/compare/${listId}`;
}

/**
 * This page previously exported no metadata at all, so a shared versus link
 * previewed identically to the homepage. The access gate mirrors the page's:
 * a list the viewer cannot read never has its title put in a title tag.
 *
 * openGraph.images is deliberately absent — opengraph-image.tsx in this segment
 * generates the 1200x630 card.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}): Promise<Metadata> {
  const { a, b } = await params;
  const supabase = await createSupabaseServerClient();
  const [{ data: lists }, user] = await Promise.all([
    supabase
      .from("lists")
      .select("id,title,status,visibility,owner_id")
      .in("id", [a, b])
      .returns<DbListRow[]>(),
    supabase.auth.getUser(),
  ]);
  const viewerId = user.data.user?.id ?? null;
  const rowA = lists?.find((l) => l.id === a);
  const rowB = lists?.find((l) => l.id === b);
  const readable =
    rowA &&
    rowB &&
    canCompare({ ...rowA, ownerId: rowA.owner_id }, viewerId) &&
    canCompare({ ...rowB, ownerId: rowB.owner_id }, viewerId);

  const title = readable
    ? `${rowA.title} vs ${rowB.title} – Taste Compatibility | movieranker.win`
    : "Versus – Taste Compatibility | movieranker.win";
  const description = readable
    ? "Where these two rankings agree, where they collide, and the one score that settles it."
    : "Compare two movie rankings head-to-head and score how much your taste really overlaps.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** Delta arrow between the two ranks; negative = B ranked it better. */
function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0)
    return (
      <span className="font-mono text-xs text-muted" aria-label="Same rank">
        =
      </span>
    );
  const up = delta < 0;
  return (
    <span
      className={`font-mono text-xs font-semibold ${up ? "text-gold" : "text-accent-red"}`}
      aria-label={`${up ? "Ranks higher" : "Ranks lower"} in the right ranking by ${Math.abs(delta)}`}
    >
      {delta > 0 ? "+" : ""}
      {delta}
      {up ? "↑" : "↓"}
    </span>
  );
}

/** Mirrored row: gold A-rank left, poster center, delta + B-rank right. */
function VersusRow({ movie }: { movie: SharedMovie }) {
  return (
    <li className="flex items-center gap-3 rounded bg-surface p-3 ring-1 ring-white/10">
      <span className="w-8 shrink-0 text-center font-display text-2xl text-gold">{movie.rankA}</span>
      <a
        href={tmdbMovieUrl(movie.tmdbId)}
        target="_blank"
        rel="noopener noreferrer"
        title={`View ${movie.title} on TMDB (opens in new tab)`}
        className="block w-16 shrink-0 transition-opacity hover:opacity-90 sm:w-20 focus-visible:outline-2 focus-visible:outline-gold rounded"
      >
        <MoviePoster title={movie.title} posterPath={movie.posterPath} />
      </a>
      <p className="min-w-0 flex-1 truncate text-sm" title={movie.title}>
        <a
          href={tmdbMovieUrl(movie.tmdbId)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${movie.title} on TMDB (opens in new tab)`}
          className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
        >
          {movie.title}
        </a>
      </p>
      <DeltaBadge delta={movie.delta} />
      <span className="w-8 shrink-0 text-center font-display text-2xl text-gold">{movie.rankB}</span>
    </li>
  );
}

function ExclusiveColumn({
  heading,
  entries,
}: {
  heading: string;
  entries: VersusEntry[];
}) {
  return (
    <section className="min-w-0">
      <h3 className="font-display text-xl uppercase tracking-wide text-text">{heading}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Nothing — they shared it all.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {entries.map((e) => (
            <li key={e.tmdbId} className="flex items-center gap-3">
              <span className="w-6 shrink-0 text-center font-display text-lg text-gold">{e.rank}</span>
              <a
                href={tmdbMovieUrl(e.tmdbId)}
                target="_blank"
                rel="noopener noreferrer"
                title={`View ${e.title} on TMDB (opens in new tab)`}
                className="block w-12 shrink-0 transition-opacity hover:opacity-90 sm:w-14 focus-visible:outline-2 focus-visible:outline-gold rounded"
              >
                <MoviePoster title={e.title} posterPath={e.posterPath} />
              </a>
              <p className="min-w-0 flex-1 truncate text-sm" title={e.title}>
                <a
                  href={tmdbMovieUrl(e.tmdbId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`View ${e.title} on TMDB (opens in new tab)`}
                  className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
                >
                  {e.title}
                </a>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Mirrored column head: Bebas list title, truncates under its ✦ divider. */
function SideTitle({ title }: { title: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-display text-2xl uppercase leading-tight tracking-wide" title={title}>
        {title}
      </p>
    </div>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ a: string; b: string }>;
}) {
  const { a, b } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: lists }, user] = await Promise.all([
    supabase
      .from("lists")
      .select("id,title,status,visibility,owner_id")
      .in("id", [a, b])
      .returns<DbListRow[]>(),
    supabase.auth.getUser(),
  ]);
  const viewerId = user.data.user?.id ?? null;
  const rowA = lists?.find((l) => l.id === a);
  const rowB = lists?.find((l) => l.id === b);

  // Access gate: both lists must be viewer-readable AND finished. Drafts and
  // other people's private lists fall through to the styled 404.
  if (
    !rowA ||
    !rowB ||
    !canCompare({ ...rowA, ownerId: rowA.owner_id }, viewerId) ||
    !canCompare({ ...rowB, ownerId: rowB.owner_id }, viewerId)
  )
    notFound();

  // Owner handles for the mirrored header ("@sarah").
  const ownerIds = [...new Set([rowA.owner_id, rowB.owner_id])];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,handle")
    .in("id", ownerIds);
  const handleOf = (ownerId: string) =>
    profiles?.find((p) => p.id === ownerId)?.handle ?? null;

  const { data: movieRows } = await supabase
    .from("list_movies")
    .select("list_id,tmdb_id,title,poster_path,final_rank")
    .in("list_id", [a, b])
    .order("final_rank", { ascending: true, nullsFirst: false });
  const byList = (listId: string): VersusEntry[] => {
    const rows = (movieRows as DbMovieRow[] | null)?.filter((m) => m.list_id === listId) ?? [];
    return rows.map((m, i) => ({
      tmdbId: m.tmdb_id,
      title: m.title,
      posterPath: m.poster_path,
      rank: m.final_rank ?? i + 1,
    }));
  };

  const vs = computeVersus(byList(a), byList(b));
  const handleA = handleOf(rowA.owner_id);
  const handleB = handleOf(rowB.owner_id);
  const url = shareUrl(`${a}/${b}`);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8 sm:max-w-2xl">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <MarqueeHeading as="h1">Versus</MarqueeHeading>
        <ShareButton
          title={`${rowA.title} vs ${rowB.title}`}
          url={url}
        />
      </header>

      {/* Compatibility banner */}
      <section className="mt-6 rounded bg-surface-raised px-6 py-6 text-center ring-1 ring-white/10">
        {vs.agreementPct === null ? (
          <>
            <p className="font-display text-6xl uppercase text-gold">No overlap</p>
            <p className="mt-2 text-sm text-muted">
              These rankings share nothing — nothing to argue about… yet.
            </p>
          </>
        ) : (
          <>
            <p
              className="font-display text-7xl leading-none text-gold"
              aria-label={`Agreement ${vs.agreementPct} percent`}
            >
              {vs.agreementPct}%
            </p>
            <p className="mt-1 text-sm font-medium uppercase tracking-[0.15em] text-muted">
              Agreement · {compatibilityTier(vs.agreementPct)}
            </p>
          </>
        )}
      </section>

      {/* Mirrored column heads */}
      <div className="mt-8 flex items-start gap-4">
        <SideTitle title={rowA.title} />
        <span aria-hidden="true" className="shrink-0 pt-1 font-display text-xl text-gold">✦</span>
        <SideTitle title={rowB.title} />
      </div>
      <p className="mt-1 text-sm text-muted">
        @{handleA ?? "someone"} vs @{handleB ?? "someone"}
      </p>

      {vs.biggestArguments.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-3 font-display text-2xl uppercase tracking-[0.12em]">
            Biggest arguments
          </h2>
          <ul className="mt-3 space-y-2">
            {vs.biggestArguments.map((m) => (
              <li key={m.tmdbId} className="rounded bg-surface px-3 py-2 ring-1 ring-white/10">
                <span className="mr-2 inline-flex align-middle">
                  <DeltaBadge delta={m.delta} />
                </span>
                <span className="text-sm font-medium">{m.title}</span>
                <span className="ml-2 font-mono text-xs text-muted">
                  #{m.rankA} vs #{m.rankB}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Full shared mirror */}
      {vs.shared.length > 0 && (
        <section className="mt-6">
          <h2 className="flex items-center gap-3 font-display text-2xl uppercase tracking-[0.12em]">
            Head to head
          </h2>
          <ul className="mt-3 space-y-2">
            {vs.shared.map((m) => (
              <VersusRow key={m.tmdbId} movie={m} />
            ))}
          </ul>
        </section>
      )}

      {/* Exclusives */}
      <div className="mt-8 grid grid-cols-2 gap-6">
        <ExclusiveColumn heading="Only in A" entries={vs.onlyInA} />
        <ExclusiveColumn heading="Only in B" entries={vs.onlyInB} />
      </div>

      <p className="mt-8 text-center text-sm text-muted">
        <Link href={`/compare/${b}/${a}`} className="underline underline-offset-4 hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
          Flip the sides
        </Link>
      </p>
    </main>
  );
}
