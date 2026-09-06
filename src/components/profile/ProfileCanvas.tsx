import FrameArt from "./FrameArt";
import Nameplate from "./Nameplate";
import { Laurel } from "@/components/Laurel";
import { avatarAssetPath, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import { gradientAvatarClass } from "@/lib/cosmetics/classes";
import type { Equipped } from "@/lib/cosmetics/equipped";

const POSTER = "https://image.tmdb.org/t/p/w342";

/**
 * The avatar, at the size a marquee panel wants: 120px wide on a phone (and
 * inside the dressing room's live preview), 180px on a desktop profile.
 *
 * Sized by CONTAINER, not viewport: this panel is rendered both as a full-width
 * page hero and as a ~600px preview, and a `sm:` variant answers the window in
 * both cases — which is exactly how the old layout put a 78px avatar in a
 * 1090px box.
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
   * `profileStatsLine`. Absent in the dressing room's live preview, which has
   * no stats to show and only previews the cosmetics.
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
  /**
   * The art for a poster avatar: the stored path, or the user's own first
   * poster when the slot holds a poster avatar with nothing pinned to it.
   * ProfileBackdrop resolves the same fallback for its own hero poster — it
   * has to, because the two are drawn on opposite sides of the page and
   * neither can read the other's state.
   */
  const avatarPoster =
    equipped.avatarPosterPath ?? posters.find((p) => p.posterPath)?.posterPath ?? null;
  const avatarId = equipped.avatar ?? null;

  return (
    /*
      A PANEL, not a card with its own sky.
      The equipped background used to be painted INSIDE this box — three
      branches of poster wash, scrim, beam and velvet, plus the overlay on
      top — so a customised profile was a decorated rectangle sitting in a
      velvet band on a black page. It is `ProfileBackdrop` that paints the
      background now, fixed behind the WHOLE page, and this is the sheet of
      smoked glass the identity is set on: the room is the user's, and the
      panel only has to keep the words readable over it.

      Alpha 70%, not 60%: over the busiest equipped composition (the
      spotlight's gold beam over a white poster at 40%, which survives its
      own vignette at ~115/255) a 60% panel leaves the stats sentence — set
      at text-text/90 — at 3.86:1, under the 4.5:1 floor. 70% lifts that to
      5.4:1 and holds ≥5:1 even against a hypothetical unscrimmed white
      field, so the four backgrounds still being added cannot quietly break
      the text. On the real backdrops it lands at 10–13:1. NOT higher: at 80%
      the backdrop stops reading through the panel and the wall is back.

      No `overflow-hidden` and no `isolate`: an illustrated frame overhangs
      its avatar (see FrameArt), and clipping the panel would slice the
      overhang off against this border.
    */
    <div className="@container relative mx-auto max-w-4xl rounded-2xl border border-white/10 bg-bg/70 backdrop-blur-md">
      {/*
        Stacked on a phone (and in the dressing room's preview), side by side
        once the PANEL is wide enough to hold a 180px avatar beside a readable
        sentence.
      */}
      <div className="flex flex-col items-center gap-3 px-5 py-5 text-center @2xl:flex-row @2xl:items-center @2xl:gap-6 @2xl:px-7 @2xl:py-7 @2xl:text-left">
        {/*
          Poster-shaped for all three kinds, never cropped to a circle: posters
          set their title in the lower third and a round crop destroys it. The
          identical box also means the frame fits the same whichever kind is
          equipped.

          The frame's elbow room is given as PADDING on this column rather
          than as overflow on the panel: an illustrated frame overhangs its
          avatar box by ~12% (a marquee's bulbs, a laurel's leaves), and 12% of
          120/180px is 14/22px of art that would otherwise hang over the
          panel's own border — or be cut off by it. The padding is inside the
          flex item, so the gap to the nameplate stays the gap between the
          FRAME and the words, whatever frame is worn.
        */}
        <div className="shrink-0 p-[14px] @2xl:p-[22px]">
          <FrameArt id={equipped.frame}>
            <AvatarArt id={avatarId} posterPath={avatarPoster} />
          </FrameArt>
        </div>

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
    </div>
  );
}
