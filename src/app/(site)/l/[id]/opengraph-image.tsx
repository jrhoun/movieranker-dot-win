import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_RESPONSE_OPTIONS, OG_SIZE, OgCard, PosterRow, posterUrl } from "@/lib/og-card";
import { marqueeNumber } from "@/lib/shortlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The card for a shared ranking.
 *
 * THE SPOILER RULE: when the list came from a weekly Marquee theme, list.title
 * IS the theme title, and naming it would hand the week's puzzle to everyone
 * who scrolled past. The card poses the question instead — which is also the
 * better hook. Three posters under "WHAT CONNECTS THESE?" invites a click in a
 * way a title never does. See the curation doctrine in src/lib/shortlist-themes.ts.
 *
 * Crawlers send no cookies, so this renders under anonymous RLS: the
 * "anyone reads done lists" policy scopes it to done + unlisted/public, which
 * is exactly what should be previewable. Anything else falls back to the
 * branded card rather than throwing, so a link still previews as something
 * designed.
 */

export const alt = "A movie ranking on MovieRanker";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface OgListMovie {
  title: string;
  poster_path: string | null;
  final_rank: number | null;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: list } = await supabase
    .from("lists")
    .select("title,status,theme_slug,created_at,list_movies(title,poster_path,final_rank)")
    .eq("id", id)
    .maybeSingle();

  if (!list || list.status !== "done") {
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

  const movies = (list.list_movies ?? []) as OgListMovie[];
  // Parked films have a null final_rank and hold no podium position.
  const posters = movies
    .filter((m) => typeof m.final_rank === "number")
    .sort((a, b) => (a.final_rank ?? 0) - (b.final_rank ?? 0))
    .slice(0, 3)
    .map((m) => posterUrl(m.poster_path));

  // Anchored to the week the room was made, not the week a crawler happens to
  // fetch the card — the same rule the share text follows.
  const marquee = list.theme_slug
    ? `WEEKLY MARQUEE #${marqueeNumber(new Date(list.created_at as string))}`
    : null;

  return new ImageResponse(
    marquee ? (
      <OgCard
        eyebrow={marquee}
        headline="WHAT CONNECTS THESE?"
        subline={`ONE THREAD RUNS THROUGH ALL ${movies.length}`}
      >
        <PosterRow posters={posters} />
      </OgCard>
    ) : (
      <OgCard
        eyebrow="RANKED ON MOVIERANKER"
        headline={String(list.title).toUpperCase()}
        subline={`${movies.length} FILMS RANKED HEAD-TO-HEAD`}
      >
        <PosterRow posters={posters} />
      </OgCard>
    ),
    OG_RESPONSE_OPTIONS,
  );
}
