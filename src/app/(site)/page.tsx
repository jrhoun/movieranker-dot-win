import HomeClient from "./home-client";
import { getTonightsShortlist } from "@/lib/shortlist";
import type { ThemeCommunityActivity } from "@/lib/shortlist";
import { getMovieById, getPreferredPosterPath } from "@/lib/tmdb";
import type { TmdbMovieCredit } from "@/lib/tmdb";

// Server component: resolves tonight's themed shortlist (deterministic daily
// rotation) and hydrates the movie details both the hero fan and the strip
// render. Any failure degrades to an empty strip; HomeClient falls back to the
// curated hero-posters set.
export default async function Page() {
  let title = "";
  let blurb = "";
  let credits: TmdbMovieCredit[] = [];
  let proposedBy: string | null = null;
  let activity: ThemeCommunityActivity = { count: 0, previews: [] };
  try {
    const { theme, movieIds, activity: a } = await getTonightsShortlist();
    title = theme.title;
    blurb = theme.blurb;
    proposedBy = theme.proposedBy;
    activity = a;
    credits = (
      await Promise.all(movieIds.map((id) => getMovieById(id)))
    ).filter((c): c is NonNullable<typeof c> => c !== null);
    // Prefer English-language poster art over foreign defaults (TMDB primary
    // poster_path is often a non-English variant for some titles).
    credits = await Promise.all(
      credits.map(async (c) => ({
        ...c,
        posterPath: await getPreferredPosterPath(c.tmdbId, c.posterPath),
      })),
    );
  } catch {
    // fall through to hardcoded hero fan
  }

  return (
    <HomeClient
      tonight={{
        title,
        blurb,
        movies: credits,
        proposedBy,
        settledCount: activity.count,
        previews: activity.previews,
      }}
    />
  );
}
