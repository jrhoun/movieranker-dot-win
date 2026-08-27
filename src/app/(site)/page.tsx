import { redirect } from "next/navigation";
import HomeClient from "./home-client";
import { getTonightsShortlist } from "@/lib/shortlist";
import type { ThemeCommunityActivity } from "@/lib/shortlist";
import { getMovieById, getPreferredPosterPath } from "@/lib/tmdb";
import type { TmdbMovieCredit } from "@/lib/tmdb";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Server component: resolves this week's themed marquee (deterministic weekly
// rotation) and hydrates the movie details both the hero fan and the strip
// render. Any failure degrades to an empty strip; HomeClient falls back to the
// curated hero-posters set.
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ code?: string; next?: string }>;
}) {
  const sp = await searchParams;
  if (sp?.code) {
    const nextParam = sp.next ? `&next=${encodeURIComponent(sp.next)}` : "";
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}${nextParam}`);
  }
  let title = "";
  let blurb = "";
  let slug: string | null = null;
  let credits: TmdbMovieCredit[] = [];
  let proposedBy: string | null = null;
  let activity: ThemeCommunityActivity = { count: 0, previews: [] };
  let userThemeListId: string | null = null;

  try {
    const { theme, movieIds, activity: a } = await getTonightsShortlist();
    title = theme.title;
    blurb = theme.blurb;
    slug = theme.slug;
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

    const supabase = await createSupabaseServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth?.user && slug) {
      const { data } = await supabase
        .from("lists")
        .select("id")
        .eq("owner_id", auth.user.id)
        .eq("theme_slug", slug)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      userThemeListId = data?.id ?? null;
    }
  } catch {
    // fall through to hardcoded hero fan
  }

  return (
    <HomeClient
      tonight={{
        title,
        blurb,
        themeSlug: slug,
        movies: credits,
        proposedBy,
        settledCount: activity.count,
        previews: activity.previews,
        userThemeListId,
      }}
    />
  );
}
