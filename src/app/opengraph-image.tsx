import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_RESPONSE_OPTIONS, OG_SIZE, OgCard } from "@/lib/og-card";

/**
 * The default card for the whole site.
 *
 * It lives at the app root rather than in the (site) group so that every route
 * without a card of its own inherits it — /about, /compare, /login and the rest
 * previously pasted as a bare URL with no og: tags at all.
 */

export const alt =
  "MovieRanker — rank movies head-to-head, solo or with friends, with a new Marquee every week";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
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
