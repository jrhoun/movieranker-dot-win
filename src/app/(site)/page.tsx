import HomeClient from "./home-client";import { getTonightsShortlist } from "@/lib/shortlist";
import { getMovieById } from "@/lib/tmdb";
import type { TmdbMovieCredit } from "@/lib/tmdb";

// Server component: resolves tonight's themed shortlist (deterministic daily
// rotation) and hydrates the movie details both the hero fan and the strip
// render. Any failure degrades to an empty strip; HomeClient falls back to the
// curated hero-posters set.
export default async function Page() {
  let title = "";
  let blurb = "";
  let credits: TmdbMovieCredit[] = [];
  try {
    const { theme, movieIds } = await getTonightsShortlist();
    title = theme.title;
    blurb = theme.blurb;
    credits = (
      await Promise.all(movieIds.map((id) => getMovieById(id)))
    ).filter((c): c is NonNullable<typeof c> => c !== null);
  } catch {
    // fall through to hardcoded hero fan
  }

  return <HomeClient tonight={{ title, blurb, movies: credits }} />;
}
