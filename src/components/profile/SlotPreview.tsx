import { avatarAssetPath, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import {
  BACKGROUND_PREVIEW_CLASS,
  FRAME_CLASS,
  gradientAvatarClass,
  OVERLAY_CLASS,
} from "@/lib/cosmetics/classes";
import type { CosmeticItem } from "@/lib/cosmetics/types";

const POSTER = "https://image.tmdb.org/t/p/w185";

/**
 * A small visual of one catalogue item, shared by the collection gallery and
 * the customise modal so both draw the same thing.
 *
 * Every box is the same poster-shaped 2:3 rectangle the profile uses, so a
 * grid of mixed slots lines up and a frame previewed here is the frame you get.
 * Avatars are never circular: a poster sets its title in the lower third and a
 * round crop destroys it.
 */
export default function SlotPreview({
  item,
  posterPath,
  size = "sm",
}: {
  item: CosmeticItem;
  /** Only consulted for a poster avatar. */
  posterPath?: string | null;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-[54px] w-9" : "h-[117px] w-[78px]";
  const base = `${box} block shrink-0 rounded-sm`;

  if (item.id.startsWith("avatar.gen.")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarAssetPath(item.id)} alt="" className={`${base} bg-white object-cover`} />
    );
  }

  const gradient = gradientAvatarClass(item.id);
  if (gradient) return <span aria-hidden className={`${base} ${gradient}`} />;

  if (posterAvatarTmdbId(item.id) !== null) {
    // No poster path means the film's art is unknown here (a locked claim in
    // the gallery, say) — a plain surface rather than a broken image.
    return posterPath ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`${POSTER}${posterPath}`} alt="" className={`${base} object-cover`} />
    ) : (
      <span aria-hidden className={`${base} bg-surface-raised ring-1 ring-white/10`} />
    );
  }

  // A frame is a border, so it needs something inside it to frame.
  const frame = FRAME_CLASS[item.id];
  if (frame) {
    return (
      <span aria-hidden className={`${box} inline-block shrink-0 rounded-sm p-[3px] leading-none ${frame}`}>
        <span className="block h-full w-full rounded-[2px] bg-surface-raised" />
      </span>
    );
  }

  const overlay = OVERLAY_CLASS[item.id];
  if (overlay) {
    return (
      <span aria-hidden className={`${base} relative overflow-hidden bg-surface-raised`}>
        <span className={`absolute inset-0 ${overlay}`} />
      </span>
    );
  }

  const background = BACKGROUND_PREVIEW_CLASS[item.id];
  if (background) return <span aria-hidden className={`${base} ${background}`} />;

  // A tagline IS its text — it has no art, and an empty chip in its place is
  // worse than nothing: 88 blank boxes read as a broken grid. Callers render
  // the line itself instead.
  if (item.slot === "tagline") return null;

  return <span aria-hidden className={`${base} bg-surface-raised ring-1 ring-white/10`} />;
}
