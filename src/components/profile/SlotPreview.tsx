import { avatarAssetPath, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import {
  BACKGROUND_PREVIEW_CLASS,
  gradientAvatarClass,
  OVERLAY_CLASS,
} from "@/lib/cosmetics/classes";
import type { CosmeticItem } from "@/lib/cosmetics/types";
import FrameArt from "./FrameArt";

const POSTER = "https://image.tmdb.org/t/p/w185";

/**
 * A visual of one catalogue item, drawn once for every surface that shows the
 * wardrobe — every swatch row in the dressing room.
 *
 * Every box is the same poster-shaped 2:3 rectangle the profile uses, so a
 * grid of mixed slots lines up and a frame previewed here is the frame you get.
 * Avatars are never circular: a poster sets its title in the lower third and a
 * round crop destroys it.
 *
 * A FRAME IS DRAWN BY `FrameArt`, never from `FRAME_CLASS` directly. Frames
 * grew illustrated art that no single class can carry, and FrameArt's contract
 * is that every surface goes through it so no two of them can disagree — a
 * swatch that painted only the CSS ring would advertise the wrong object.
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

  // A frame needs something inside it to frame: a neutral 2:3 surface, the same
  // shape as the avatar it will really hold.
  //
  // The INNER box is smaller than the swatch, by exactly the band FrameArt
  // hangs outside its child (`-inset-[12%]`, so 1.24x on both axes). A frame is
  // an object the picture sits in, not a border on the picture — drawn at the
  // full swatch size its art would spill into the next cell of the grid.
  if (item.slot === "frame") {
    const inner = size === "sm" ? "h-[44px] w-[29px]" : "h-[94px] w-[63px]";
    return (
      <span className={`${box} flex items-center justify-center`}>
        <FrameArt id={item.id} className={inner}>
          <span aria-hidden className="block h-full w-full rounded-[2px] bg-surface-raised" />
        </FrameArt>
      </span>
    );
  }

  // A background and an atmosphere dress the WHOLE PAGE now, not a poster —
  // so their swatch is a room, landscape, and wider than everything else in
  // the grid. A 2:3 chip of a spotlight beam reads as a gradient poster; the
  // same beam in a 16:10 window reads as a place.
  const room = size === "sm" ? "h-9 w-[58px]" : "h-[78px] w-[124px]";
  const roomBase = `${room} block shrink-0 rounded-sm ring-1 ring-white/10`;

  const overlay = OVERLAY_CLASS[item.id];
  if (overlay) {
    return (
      <span aria-hidden className={`${roomBase} relative overflow-hidden bg-surface-raised`}>
        <span className={`absolute inset-0 ${overlay}`} />
      </span>
    );
  }

  const background = BACKGROUND_PREVIEW_CLASS[item.id];
  if (background) return <span aria-hidden className={`${roomBase} ${background}`} />;

  // A tagline IS its text — it has no art, and an empty chip in its place is
  // worse than nothing: 88 blank boxes read as a broken grid. Callers render
  // the line itself instead.
  if (item.slot === "tagline") return null;

  return <span aria-hidden className={`${base} bg-surface-raised ring-1 ring-white/10`} />;
}
