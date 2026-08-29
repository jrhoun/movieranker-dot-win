import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_RESPONSE_OPTIONS, OG_SIZE, OgCard, renderProfileCard } from "@/lib/og-card";
import { sanitizeEquipped } from "@/lib/cosmetics/equipped";
import { normalizeHandle } from "@/lib/handles";
import { EMPTY_SHOWCASE, parseShowcase, shapePublicProfile } from "@/lib/public-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * The card for a user's public profile: their equipped frame, background,
 * overlay and tagline, so a customised profile travels to Twitter, Discord
 * and iMessage looking like the profile it links to, not the bare wordmark.
 *
 * Crawlers send no cookies, so this always renders under anonymous RLS — no
 * owner-preview branch, since a crawler is never the owner (same rule the
 * list card and this page's own generateMetadata already follow). A private
 * or missing handle falls back to the branded card rather than a broken
 * image or a leak of whether the handle exists.
 */

export const alt = "A movieranker.win profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

interface DbProfile {
  id: string;
  handle: string;
  visibility: string | null;
  showcase: unknown;
}

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: raw } = await params;
  // App Router delivers dynamic params percent-encoded, so decode manually;
  // malformed input (e.g. /u/%zz) falls back to the raw string -> lookup miss.
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    decoded = raw;
  }
  const handle = normalizeHandle(decoded);

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,handle,visibility,showcase")
    .eq("handle", handle)
    .eq("visibility", "public")
    .maybeSingle<DbProfile>();

  if (!profile) {
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

  // Showcase ONLY public done lists — unlisted stays link-accessible but hidden here.
  const { data: lists } = await supabase
    .from("lists")
    .select("id,title,participants,theme_slug,status,visibility,created_at,list_movies(title,poster_path)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    // Mirror /u/[handle] and /u/me: without this, PostgREST join order is
    // unspecified and the card's posters may not be the top-ranked ones.
    .order("final_rank", { foreignTable: "list_movies", ascending: true, nullsFirst: false })
    .order("elo", { foreignTable: "list_movies", ascending: false });

  const showcase = parseShowcase(profile.showcase) ?? EMPTY_SHOWCASE;
  const { cards, level } = shapePublicProfile(lists ?? [], showcase);

  // NOT resolveEquipped: this route has no better stats than /u/[handle]
  // itself (shapePublicProfile counts public done lists only, and it has no
  // access to marquee_solves at all), so it cannot safely re-check ownership
  // of a challenge- or drop-gated item without producing false negatives for
  // a legitimately-earned legendary piece — the same reasoning the page
  // itself documents at its `sanitizeEquipped` call. This trusts the id
  // /api/profile already validated against the real owner's full-access
  // stats when it was written, and only re-checks what this caller CAN
  // verify on its own: that the id still exists and still belongs to its slot.
  const equipped = sanitizeEquipped(showcase.equipped);
  const posterPaths = cards
    .flatMap((c) => c.posters)
    .map((p) => p.posterPath)
    .filter((p): p is string => !!p)
    .slice(0, 6);

  const png = await renderProfileCard({
    handle: profile.handle,
    level: level.level,
    rank: level.title,
    equipped,
    posterPaths,
  });

  // `new Uint8Array(png)` rather than the Buffer itself: Node's Buffer and
  // lib.dom's BodyInit disagree on the ArrayBufferLike generic even though a
  // Buffer is a Uint8Array at runtime.
  //
  // Cache-Control matches ImageResponse's own default exactly (see
  // @vercel/og's ImageResponse constructor) — the fallback branch above gets
  // it for free by returning an ImageResponse; a bare Response does not set
  // it on its own, and without it a crawler could re-render this on every
  // fetch while the branded fallback next to it caches for a year.
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        process.env.NODE_ENV === "development"
          ? "no-cache, no-store"
          : "public, immutable, no-transform, max-age=31536000",
    },
  });
}
