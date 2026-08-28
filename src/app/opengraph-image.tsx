import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_RESPONSE_OPTIONS, OG_SIZE, OgCard } from "@/lib/og-card";

/**
 * The default card for the whole site.
 *
 * It lives at the app root rather than in the (site) group so that every route
 * without a card of its own inherits it — /about, /compare, /login and the rest
 * previously pasted as a bare URL with no og: tags at all.
 */

export const alt = "MovieRanker — rank movies head-to-head and settle film debates";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(
    (
      <OgCard
        eyebrow="HEAD-TO-HEAD FILM TOURNAMENTS"
        headline="MOVIERANKER"
        subline="SETTLING THE BEST MOVIES OF ALL TIME"
      />
    ),
    OG_RESPONSE_OPTIONS,
  );
}
