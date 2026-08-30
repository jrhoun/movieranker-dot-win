import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { itemsForSlot, SLOTS } from "@/lib/cosmetics/catalogue";
import type { CosmeticItem, Slot, TaglineItem } from "@/lib/cosmetics/types";
import { labelFor, unlockLabel } from "@/lib/cosmetics/labels";
import SlotPreview from "./SlotPreview";

const SLOT_LABEL: Record<Slot, string> = {
  avatar: "Avatars",
  frame: "Frames",
  background: "Backgrounds",
  overlay: "Overlays",
  tagline: "Taglines",
};

function Tile({
  item,
  owned,
  posterPath,
  taglineText,
}: {
  item: CosmeticItem;
  owned: boolean;
  posterPath?: string | null;
  taglineText?: string;
}) {
  // Shared with the customise modal so the two cannot disagree about which
  // lines may be shown — see labelFor's doc comment.
  const label = labelFor(item, taglineText ? { [item.id]: taglineText } : {});

  return (
    <li
      className={`flex flex-col items-center gap-1.5 rounded-lg p-2 text-center ${
        owned ? "bg-surface-raised/60" : "bg-transparent"
      }`}
    >
      {/* Locked items are dimmed, never blurred — the art stays readable. */}
      <span className={owned ? "" : "opacity-40"}>
        <SlotPreview item={item} posterPath={posterPath} />
      </span>
      <span
        className={`text-[11px] leading-tight text-text ${
          item.slot === "tagline" ? "italic" : "font-medium"
        }`}
      >
        {label}
      </span>
      {!owned && (
        <span className="text-[10px] leading-tight text-muted">{unlockLabel(item.unlock)}</span>
      )}
    </li>
  );
}

function Section({
  title,
  items,
  owned,
  posterPathFor,
  taglineTexts,
}: {
  title: string;
  items: CosmeticItem[];
  owned: Set<string>;
  posterPathFor?: (id: string) => string | null | undefined;
  taglineTexts?: Record<string, string>;
}) {
  if (items.length === 0) return null;
  const have = items.filter((i) => owned.has(i.id)).length;

  return (
    <section className="mt-6">
      <h3 className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-text/80">{title}</span>
        <span className="text-[11px] tabular-nums text-muted">
          {have} of {items.length}
        </span>
      </h3>
      <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        {items.map((item) => (
          <Tile
            key={item.id}
            item={item}
            owned={owned.has(item.id)}
            posterPath={posterPathFor?.(item.id)}
            taglineText={taglineTexts?.[item.id]}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * The whole collection, browsable: what you have, what you do not, and exactly
 * what each locked thing asks for.
 *
 * Taglines are split by set rather than dumped into one grid — there are ~84 of
 * them, and a single wall of chips is a list, not a collection.
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
  const ownedSet = new Set(owned);
  const posterByTmdbId = new Map(films.map((f) => [f.tmdbId, f]));
  const posterPathFor = (id: string) => {
    const tmdbId = posterAvatarTmdbId(id);
    return tmdbId === null ? undefined : posterByTmdbId.get(tmdbId)?.posterPath;
  };

  // Claimed posters are per-user and never in CATALOGUE, so they are synthesised
  // and appended to the avatar section — a claim you cannot see is a claim you
  // will forget you spent.
  const claimedAvatars = claims
    .map((tmdbId) => syntheticPosterAvatar(posterAvatarId(tmdbId)))
    .filter((i): i is CosmeticItem => i !== undefined)
    .map((i) => ({ ...i, name: posterByTmdbId.get(posterAvatarTmdbId(i.id)!)?.title ?? i.name }));

  const taglines = itemsForSlot("tagline") as TaglineItem[];
  const sets = [...new Set(taglines.map((t) => t.set))];

  return (
    <div>
      {SLOTS.filter((s) => s !== "tagline").map((slot) => (
        <Section
          key={slot}
          title={SLOT_LABEL[slot]}
          items={slot === "avatar" ? [...itemsForSlot(slot), ...claimedAvatars] : itemsForSlot(slot)}
          owned={ownedSet}
          posterPathFor={posterPathFor}
        />
      ))}
      {sets.map((set) => (
        <Section
          key={set}
          title={`${SLOT_LABEL.tagline} · ${set}`}
          items={taglines.filter((t) => t.set === set)}
          owned={ownedSet}
          taglineTexts={taglineTexts}
        />
      ))}
    </div>
  );
}
