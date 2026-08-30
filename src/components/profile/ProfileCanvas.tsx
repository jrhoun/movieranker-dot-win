import Nameplate from "./Nameplate";
import { avatarAssetPath, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import { FRAME_CLASS, gradientAvatarClass, OVERLAY_CLASS } from "@/lib/cosmetics/classes";
import type { Equipped } from "@/lib/cosmetics/equipped";

const POSTER = "https://image.tmdb.org/t/p/w342";

const AVATAR_BOX = "block h-[117px] w-[78px] rounded-sm";

/**
 * The three kinds of avatar, all drawn into the same 2:3 box.
 *
 * A poster avatar falls back to the user's own first poster when no path is
 * stored, and to a plain surface when they have no art at all — the frame is
 * always painted, so an empty box beats a broken image.
 */
function AvatarArt({ id, posterPath }: { id: string | null; posterPath: string | null }) {
  if (id?.startsWith("avatar.gen.")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarAssetPath(id)} alt="" className={`${AVATAR_BOX} bg-white object-cover`} />;
  }

  const gradient = id ? gradientAvatarClass(id) : undefined;
  if (gradient) return <span aria-hidden className={`${AVATAR_BOX} ${gradient}`} />;

  // A poster avatar, or the legacy avatarTmdbId/avatarPosterPath pair from
  // before the slot existed — both render from the stored poster path.
  if (posterPath && (id === null || posterAvatarTmdbId(id) !== null)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`${POSTER}${posterPath}`} alt="" className={`${AVATAR_BOX} object-cover`} />;
  }

  return <span aria-hidden className={`${AVATAR_BOX} bg-surface-raised`} />;
}

export default function ProfileCanvas({
  handle,
  level,
  equipped,
  posters,
  taglineText,
}: {
  handle: string;
  level: number;
  equipped: Equipped;
  posters: { title: string; posterPath: string | null }[];
  /**
   * Already-resolved display text, not a catalogue lookup: earned taglines
   * carry a literal "{count}" template that only the page (which holds the
   * user's stats) can safely fill in. Rendered verbatim when present, nothing
   * when absent.
   */
  taglineText?: string | null;
}) {
  const frameClass = FRAME_CLASS[equipped.frame ?? ""] ?? "cf-brass";
  const overlayClass = OVERLAY_CLASS[equipped.overlay ?? ""];
  const background = equipped.background ?? "background.filmstrip";
  const art = posters.filter((p) => p.posterPath).slice(0, 6);
  /**
   * The poster wash behind `background.spotlight`, and the art for a poster
   * avatar. Kept separate from the avatar SLOT below: the spotlight still
   * wants a poster to bleed even when the equipped avatar is a gradient.
   */
  const avatarPoster = equipped.avatarPosterPath ?? art[0]?.posterPath ?? null;
  const avatarId = equipped.avatar ?? null;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-white/10">
      {background === "background.filmstrip" && (
        <>
          <div aria-hidden className="absolute inset-0 z-0 flex items-center gap-1 px-2 opacity-30">
            {art.map((p, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${i}-${p.posterPath}`} src={`${POSTER}${p.posterPath}`} alt="" className="h-full w-auto rounded-sm object-cover" />
            ))}
          </div>
          <div aria-hidden className="cb-scrim absolute inset-0 z-[1]" />
          <div aria-hidden className="cb-holes absolute inset-x-0 top-0 z-[1] h-3" />
          <div aria-hidden className="cb-holes absolute inset-x-0 bottom-0 z-[1] h-3" />
        </>
      )}
      {background === "background.spotlight" && avatarPoster && (
        <>
          {/*
            An <img>, never a CSS `url()`: `avatar` can fall back to a poster
            path pulled from list_movies.poster_path, which /api/lists/[id]
            stores with no shape validation. Comma-separated multi-background
            is valid CSS, so an unvalidated value there could smuggle a second
            `url(...)` and fetch a third-party URL for every viewer of this
            profile. An <img src> has no such escape hatch.
            The wrapper carries the -inset-[25%] bleed and clips it; the
            replaced <img> element sizes against that box via h-full w-full
            rather than its own intrinsic size.
          */}
          <div aria-hidden className="absolute -inset-[25%] z-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${POSTER}${avatarPoster}`}
              alt=""
              className="h-full w-full object-cover opacity-45 blur-2xl"
            />
          </div>
          <div aria-hidden className="cb-beam absolute inset-0 z-[1]" />
          <div aria-hidden className="cb-vignette absolute inset-0 z-[1]" />
        </>
      )}
      {background === "background.velvet" && <div aria-hidden className="cb-velvet absolute inset-0 z-0" />}

      <div className="relative z-[2] flex flex-col items-center gap-3 px-6 py-8">
        {/*
          Poster-shaped for all three kinds, never cropped to a circle: posters
          set their title in the lower third and a round crop destroys it. The
          identical box also means the frame fits the same whichever kind is
          equipped.
        */}
        <span className={`inline-block rounded-md p-[3px] leading-none ${frameClass}`}>
          <AvatarArt id={avatarId} posterPath={avatarPoster} />
        </span>
        <Nameplate handle={handle} level={level} size="compact" />
        {taglineText && (
          <p className="max-w-[28ch] text-center text-xs italic text-muted">
            &ldquo;{taglineText}&rdquo;
          </p>
        )}
      </div>

      {overlayClass && (
        // Sibling of the content, never a child of an element with its own
        // background — nested, the background paints straight over it.
        <div aria-hidden className={`pointer-events-none absolute inset-0 z-[3] ${overlayClass}`} />
      )}
    </div>
  );
}
