import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { collectionCategories, SLOT_LABEL } from "@/lib/cosmetics/categories";
import { labelFor } from "@/lib/cosmetics/labels";
import type { CosmeticItem, TaglineItem } from "@/lib/cosmetics/types";
import { howToEarn } from "./how-to-earn";
import SlotPreview from "./SlotPreview";

/**
 * The whole collection, on one wall: what you have, what you do not, and
 * exactly what each locked thing asks for.
 *
 * A PLAIN WALL, NOT A CARD KIT. This was a grid of eight opening cards, each
 * with a face, a count, a preview strip and a dialog behind it — a component
 * per category and ~230 lines of client JavaScript to hide a list of names.
 * The wardrobe is the point of the page, so it is shown, not filed: a Bebas
 * subhead per category and its items beneath it. Nothing to open, nothing to
 * decode, and no browser dialog between a user and the thing they want.
 *
 * It is a long section, and that is the honest shape of a hundred-and-forty
 * piece collection. Length costs a scroll; a card kit cost eight clicks and
 * the sight of the thing.
 *
 * STAYS A SERVER COMPONENT, and now ships no client code at all — the dialogs
 * that used to force "use client" are gone. Every locked item's unlock path is
 * rendered on the server as text.
 */

/**
 * Hoisted to module scope. A component defined inside another's body is a new
 * type every render, and `react-hooks/static-components` fails the build over
 * it — it has already caught this exact mistake twice in this directory.
 *
 * Deliberately NOT shared with the customise dialog's grid, which looks the
 * same and is not the same thing: there every cell is a button that equips,
 * and one component doing both would carry a disabled/pressed/selected
 * vocabulary that only ever applies to half its callers. The COPY is what must
 * not drift, and that is shared — `labelFor` and `howToEarn`.
 */
function Swatch({
  item,
  owned,
  posterPath,
}: {
  item: CosmeticItem;
  owned: boolean;
  posterPath?: string | null;
}) {
  return (
    <li className="flex flex-col items-center gap-2 text-center">
      {/* Locked items are dimmed, never blurred — the art stays readable. */}
      <span className={owned ? "" : "opacity-40"}>
        <SlotPreview item={item} posterPath={posterPath} size="md" />
      </span>
      <span className={`text-xs leading-tight ${owned ? "text-text" : "text-text/60"}`}>
        {/* `labelFor` only ever differs from `name` for a tagline, and a
            tagline never reaches this component — but going through it anyway
            keeps one function answering "what is this thing called". */}
        {labelFor(item, {})}
      </span>
      {!owned && <span className="text-xs leading-tight text-muted">{howToEarn(item.unlock)}</span>}
    </li>
  );
}

/** A category heading: its name in Bebas, its progress in Geist beside it. */
function Subhead({ title, have, total }: { title: string; have: number; total: number }) {
  return (
    <h3 className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-white/10 pb-1.5">
      <span className="font-display text-lg uppercase tracking-[0.12em] text-text">{title}</span>
      <span className="font-mono text-xs tabular-nums text-muted">
        {have} of {total}
      </span>
    </h3>
  );
}

/**
 * A tagline IS its text. SlotPreview returns null for one by design, so a line
 * reads as a line with its price beside it rather than as a captioned tile with
 * an empty box on top. Two columns above `sm` because 88 sentences in one
 * column is a column of scrolling.
 */
function TaglineLine({
  item,
  owned,
  taglineText,
}: {
  item: CosmeticItem;
  owned: boolean;
  taglineText?: string;
}) {
  return (
    <li className="flex break-inside-avoid flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1">
      <span className={`text-sm italic leading-snug ${owned ? "text-text" : "text-text/45"}`}>
        {labelFor(item, taglineText ? { [item.id]: taglineText } : {})}
      </span>
      {!owned && (
        <span className="shrink-0 text-xs text-muted">{howToEarn(item.unlock)}</span>
      )}
    </li>
  );
}

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

  const posterPathFor = (id: string) => {
    const tmdbId = posterAvatarTmdbId(id);
    return tmdbId === null ? undefined : posterByTmdbId.get(tmdbId)?.posterPath;
  };

  const categories = collectionCategories(claimedAvatars);

  const total = categories.reduce((n, c) => n + c.items.length, 0);
  const ownedSet = new Set(owned);
  const count = (items: CosmeticItem[]) => items.filter((i) => ownedSet.has(i.id)).length;
  const have = categories.reduce((n, c) => n + count(c.items), 0);

  /**
   * `collectionCategories` returns the eight tagline sets as eight top-level
   * categories titled "Taglines · The 80s". That is right for a tab strip and
   * wrong for a wall: eight subheads all starting with the same word, joined by
   * a middle dot, is a prefix rather than a heading. So the sets are nested
   * under one Taglines heading here, and each keeps only its own name.
   *
   * A set is read off its first ITEM rather than parsed back out of the title —
   * the title's shape is the builder's business, and slicing a prefix off a
   * string is a bug waiting for someone to rename a slot.
   */
  const slotCategories = categories.filter((c) => c.items[0]?.slot !== "tagline");
  const taglineSets = categories
    .filter((c) => c.items[0]?.slot === "tagline")
    .map((c) => ({ key: c.key, set: (c.items[0] as TaglineItem).set, items: c.items }));
  const taglineItems = taglineSets.flatMap((s) => s.items);

  return (
    <div className="mt-4">
      <p className="text-sm text-muted">
        {have} of {total} pieces unlocked. Everything in the game is here, and every locked piece
        says what it asks for.
      </p>

      {slotCategories.map((c) => (
        <section key={c.key} className="mt-8">
          <Subhead title={c.title} have={count(c.items)} total={c.items.length} />
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-5">
            {c.items.map((item) => (
              <Swatch
                key={item.id}
                item={item}
                owned={ownedSet.has(item.id)}
                posterPath={posterPathFor(item.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      {taglineSets.length > 0 && (
        <section className="mt-8">
          <Subhead
            title={SLOT_LABEL.tagline}
            have={count(taglineItems)}
            total={taglineItems.length}
          />
          {taglineSets.map(({ key, set, items }) => (
            <div key={key} className="mt-5">
              <h4 className="font-display text-sm uppercase tracking-[0.12em] text-text/80">
                {set}
              </h4>
              <ul className="mt-1 sm:columns-2 sm:gap-x-10">
                {items.map((item) => (
                  <TaglineLine
                    key={item.id}
                    item={item}
                    owned={ownedSet.has(item.id)}
                    taglineText={taglineTexts?.[item.id]}
                  />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
