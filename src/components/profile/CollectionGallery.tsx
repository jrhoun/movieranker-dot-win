import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { collectionCategories } from "@/lib/cosmetics/categories";
import type { CosmeticItem } from "@/lib/cosmetics/types";
import CollectionCategoryModal from "./CollectionCategoryModal";

/**
 * The whole collection, browsable: what you have, what you do not, and exactly
 * what each locked thing asks for.
 *
 * ONE CARD PER CATEGORY, NOT ONE GRID PER CATEGORY. This used to render every
 * section's full grid inline and stacked — 42 avatars, 88 taglines across six
 * sets, plus frames, backgrounds and overlays. Well over a hundred tiles, all
 * below a profile canvas, a level banner, an achievement board and a list of
 * rankings. It was the single tallest thing on the page and it made the
 * collection read as a wall of padlocks rather than a wardrobe.
 *
 * The cards answer "how am I doing" at a glance; opening one answers "what
 * exactly is left". Nothing is hidden — every item is still one click away,
 * still named, still showing its unlock path. What changed is that the answer
 * is now requested rather than imposed.
 *
 * Stays a SERVER component. Only the card/dialog pair below the fold is client
 * code, and it receives plain serializable props — no Sets, no functions.
 */
export default function CollectionGallery({
  owned,
  claims = [],
  films = [],
  taglineTexts,
}: {
  owned: string[];
  /** Claimed poster-avatar tmdb ids; these have no catalogue entry of their own. */
  claims?: number[];
  films?: { tmdbId: number; title: string; posterPath: string | null }[];
  /**
   * Resolved display text for taglines the viewer owns. Earned lines carry a
   * literal "{count}" template, so this is passed in already resolved rather
   * than read off the catalogue here.
   */
  taglineTexts?: Record<string, string>;
}) {
  const posterByTmdbId = new Map(films.map((f) => [f.tmdbId, f]));

  // Claimed posters are per-user and never in CATALOGUE, so they are synthesised
  // and appended to the avatar section — a claim you cannot see is a claim you
  // will forget you spent.
  const claimedAvatars = claims
    .map((tmdbId) => syntheticPosterAvatar(posterAvatarId(tmdbId)))
    .filter((i): i is CosmeticItem => i !== undefined)
    .map((i) => ({ ...i, name: posterByTmdbId.get(posterAvatarTmdbId(i.id)!)?.title ?? i.name }));

  // A plain object rather than the lookup function the inline grid used: this
  // crosses the server/client boundary, where a function is not serializable.
  // Only poster avatars have one, so it stays small.
  const posterPaths: Record<string, string | null> = {};
  for (const tmdbId of claims) {
    posterPaths[posterAvatarId(tmdbId)] = posterByTmdbId.get(tmdbId)?.posterPath ?? null;
  }

  const categories = collectionCategories(claimedAvatars);

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const ownedSet = new Set(owned);
  const have = categories.reduce(
    (n, c) => n + c.items.filter((i) => ownedSet.has(i.id)).length,
    0,
  );

  return (
    <div className="mt-4">
      <p className="text-[11px] text-muted">
        <span className="font-mono tabular-nums text-gold">{have}</span> of{" "}
        <span className="font-mono tabular-nums">{total}</span> pieces unlocked. Open a set to
        see everything in it and what each locked piece asks for.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <CollectionCategoryModal
            key={c.key}
            title={c.title}
            items={c.items}
            owned={owned}
            posterPaths={posterPaths}
            taglineTexts={taglineTexts}
          />
        ))}
      </div>
    </div>
  );
}
