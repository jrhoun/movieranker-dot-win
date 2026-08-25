import HomeClient from "./home-client";
import { getTonightsShortlist } from "@/lib/shortlist";
import { getMovieById } from "@/lib/tmdb";

// Server component: resolves tonight's themed shortlist (deterministic daily
// rotation) and hydrates the movie details the client strip renders.
export default async function Page() {
  const { theme, movieIds } = await getTonightsShortlist();
  const credits = (
    await Promise.all(movieIds.map((id) => getMovieById(id)))
  ).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <HomeClient
      tonight={{ title: theme.title, blurb: theme.blurb, movies: credits }}
    />
  );
}
