import { ImageResponse } from "next/og";
import { COLORS, OG_CONTENT_TYPE, OG_RESPONSE_OPTIONS, OG_SIZE, OgCard } from "@/lib/og-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canCompare, compatibilityTier, computeVersus, type VersusEntry } from "@/lib/versus";

/**
 * The card for a head-to-head comparison.
 *
 * The agreement percentage is the most reply-provoking number on the site, so
 * it is the card: one huge figure and the tier line under it. The page it
 * belongs to previously exported no metadata at all, meaning a shared versus
 * link looked exactly like a shared homepage link.
 *
 * The access gate mirrors the page's: both lists must be readable AND finished.
 * Crawlers are anonymous, so a private list falls back to the branded card
 * rather than leaking its title into a preview.
 */

export const alt = "Two movie rankings compared on MovieRanker";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface OgListRow {
  id: string;
  title: string;
  status: string;
  visibility: string | null;
  owner_id: string;
}

interface OgMovieRow {
  list_id: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  final_rank: number | null;
}

function brandedFallback() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="FOR PEOPLE WHO LOVE LISTS AND CINEMA"
        headline="MOVIERANKER"
        subline="RANK MOVIES HEAD-TO-HEAD, SOLO OR WITH FRIENDS"
      />
    ),
    OG_RESPONSE_OPTIONS,
  );
}

export default async function Image({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: lists }, user] = await Promise.all([
    supabase
      .from("lists")
      .select("id,title,status,visibility,owner_id")
      .in("id", [a, b])
      .returns<OgListRow[]>(),
    supabase.auth.getUser(),
  ]);
  const viewerId = user.data.user?.id ?? null;
  const rowA = lists?.find((l) => l.id === a);
  const rowB = lists?.find((l) => l.id === b);

  if (
    !rowA ||
    !rowB ||
    !canCompare({ ...rowA, ownerId: rowA.owner_id }, viewerId) ||
    !canCompare({ ...rowB, ownerId: rowB.owner_id }, viewerId)
  ) {
    return brandedFallback();
  }

  const { data: movieRows } = await supabase
    .from("list_movies")
    .select("list_id,tmdb_id,title,poster_path,final_rank")
    .in("list_id", [a, b])
    .order("final_rank", { ascending: true, nullsFirst: false });

  const byList = (listId: string): VersusEntry[] =>
    ((movieRows as OgMovieRow[] | null) ?? [])
      .filter((m) => m.list_id === listId)
      .map((m, i) => ({
        tmdbId: m.tmdb_id,
        title: m.title,
        posterPath: m.poster_path,
        rank: m.final_rank ?? i + 1,
      }));

  const pct = computeVersus(byList(a), byList(b)).agreementPct;

  return new ImageResponse(
    (
      <OgCard
        eyebrow="VERSUS"
        headline={pct === null ? "NO OVERLAP" : `${pct}%`}
        // The percentage is the whole point of the card, so it overrides the
        // length-derived ramp and goes as large as the space allows.
        headlineSizePx={pct === null ? 96 : 176}
        subline={
          pct === null
            ? "THESE TWO LISTS SHARE NO FILMS"
            : `AGREEMENT · ${compatibilityTier(pct).toUpperCase()}`
        }
      >
        <div
          style={{
            display: "flex",
            maxWidth: "1000px",
            fontSize: "27px",
            letterSpacing: "0.06em",
            color: COLORS.muted,
            textAlign: "center",
          }}
        >
          {`${rowA.title.toUpperCase()} vs ${rowB.title.toUpperCase()}`}
        </div>
      </OgCard>
    ),
    OG_RESPONSE_OPTIONS,
  );
}
