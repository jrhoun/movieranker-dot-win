import Nameplate from "./Nameplate";
import { Laurel } from "@/components/Laurel";
import { avatarAssetPath, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import { FRAME_CLASS, gradientAvatarClass, OVERLAY_CLASS } from "@/lib/cosmetics/classes";
import type { Equipped } from "@/lib/cosmetics/equipped";

const POSTER = "https://image.tmdb.org/t/p/w342";

/**
 * The avatar, at the size a marquee card wants: 120px wide on a phone (and
 * inside the customise dialog's live mirror), 180px on a desktop profile.
 *
 * Sized by CONTAINER, not viewport: this card is rendered both as a full-width
 * page hero and as a ~600px preview inside a dialog, and a `sm:` variant
 * answers the window in both cases — which is exactly how the old layout put a
 * 78px avatar in a 1090px box.
 */
const AVATAR_BOX = "block aspect-[2/3] w-[120px] rounded-sm @2xl:w-[180px]";

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

/** Pluralise a count into prose: `2 films`, `1 film`. */
function count(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * The card's one line of numbers, as a SENTENCE.
 *
 * This replaces a band of three stat tiles ("25 / MOVIES RANKED", "4 / PUBLIC
 * LISTS", "18 / LEVEL — FILM BUFF") which read as an analytics widget and,
 * worse, printed the level three times on the owner's own page. Everything
 * those tiles said is here in end-user words, so the numbers are information
 * rather than furniture.
 *
 * Exported so /u/[handle] and /u/profile build the identical sentence from
 * their own (deliberately different) source data — the public page counts only
 * public finished lists, the owner's page counts everything they have.
 */
export function profileStatsLine({
  rank,
  level,
  prestige = 0,
  moviesRanked,
  lists,
  listNoun = "public list",
  joined,
}: {
  /** Career rank title, e.g. "Film Buff". */
  rank: string;
  level: number;
  prestige?: number;
  moviesRanked: number;
  lists: number;
  /** Singular noun for the list count, e.g. "public list", "ranking". */
  listNoun?: string;
  /** Month and year, e.g. "August 2026"; omitted when unknown. */
  joined?: string | null;
}): string {
  const standing =
    prestige > 0
      ? `${rank}, level ${level}, prestige ${prestige}.`
      : `${rank}, level ${level}.`;
  const since = joined ? ` since ${joined}` : "";
  const body =
    moviesRanked === 0
      ? `Nothing ranked yet${joined ? `, here since ${joined}` : ""}.`
      : `${count(moviesRanked, "film")} ranked across ${count(lists, listNoun)}${since}.`;
  return `${standing} ${body}`;
}

export default function ProfileCanvas({
  handle,
  level,
  equipped,
  posters,
  taglineText,
  statsLine,
  pinned,
  handleAs = "p",
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
  /**
   * Rank, level, counts and joining date as ONE sentence — build it with
   * `profileStatsLine`. Absent inside the customise dialog's live mirror,
   * which has no stats to show and only previews the cosmetics.
   */
  statsLine?: string;
  /** Pinned achievements, shown as laurels; at most three by policy. */
  pinned?: { name: string }[];
  /**
   * The handle is the page title on a public profile (`h1`) and a caption on
   * the owner's dashboard, whose own `h1` is the page heading.
   */
  handleAs?: "h1" | "p";
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
    <div className="@container relative isolate mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10">
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

      {/*
        Stacked on a phone (and in the dialog mirror), side by side once the
        CARD is wide enough to hold a 180px avatar beside a readable sentence.
      */}
      <div className="relative z-[2] flex flex-col items-center gap-5 px-5 py-7 text-center @2xl:flex-row @2xl:items-center @2xl:gap-9 @2xl:px-9 @2xl:py-9 @2xl:text-left">
        {/*
          Poster-shaped for all three kinds, never cropped to a circle: posters
          set their title in the lower third and a round crop destroys it. The
          identical box also means the frame fits the same whichever kind is
          equipped.
        */}
        <span className={`inline-block shrink-0 rounded-md p-[3px] leading-none ${frameClass}`}>
          <AvatarArt id={avatarId} posterPath={avatarPoster} />
        </span>

        <div className="min-w-0">
          <Nameplate handle={handle} level={level} as={handleAs} />
          {statsLine && (
            <p className="mt-2.5 max-w-[52ch] text-base leading-relaxed text-text/90">
              {statsLine}
            </p>
          )}
          {taglineText && (
            <p className="mt-2 max-w-[52ch] text-base italic text-[#fff1b8]">
              &ldquo;{taglineText}&rdquo;
            </p>
          )}
          {pinned && pinned.length > 0 && (
            <ul className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 @2xl:justify-start">
              {pinned.map((p) => (
                <li key={p.name}>
                  <Laurel>{p.name}</Laurel>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {overlayClass && (
        // Sibling of the content, never a child of an element with its own
        // background — nested, the background paints straight over it.
        <div aria-hidden className={`pointer-events-none absolute inset-0 z-[3] ${overlayClass}`} />
      )}
    </div>
  );
}
