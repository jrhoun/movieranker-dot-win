import Nameplate from "./Nameplate";
import type { Equipped } from "@/lib/cosmetics/equipped";

const FRAME_CLASS: Record<string, string> = {
  "frame.brass": "cf-brass",
  "frame.perforation": "cf-perforation",
  "frame.projector": "cf-projector",
  "frame.toxic": "cf-toxic",
  "frame.neon-cyan": "cf-neon-cyan",
  "frame.neon-magenta": "cf-neon-magenta",
  "frame.vhs": "cf-vhs",
  "frame.prism": "cf-prism",
};

const OVERLAY_CLASS: Record<string, string> = {
  "overlay.grain": "co-grain",
  "overlay.vhs": "co-vhs",
  "overlay.flicker": "co-flicker",
  "overlay.dust": "co-dust",
};

const POSTER = "https://image.tmdb.org/t/p/w342";

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
  const avatar = equipped.avatarPosterPath ?? art[0]?.posterPath ?? null;

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-white/10">
      {background === "background.filmstrip" && (
        <>
          <div aria-hidden className="absolute inset-0 z-0 flex items-center gap-1 px-2 opacity-30">
            {art.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.posterPath} src={`${POSTER}${p.posterPath}`} alt="" className="h-full w-auto rounded-sm object-cover" />
            ))}
          </div>
          <div aria-hidden className="cb-scrim absolute inset-0 z-[1]" />
          <div aria-hidden className="cb-holes absolute inset-x-0 top-0 z-[1] h-3" />
          <div aria-hidden className="cb-holes absolute inset-x-0 bottom-0 z-[1] h-3" />
        </>
      )}
      {background === "background.spotlight" && avatar && (
        <>
          <div
            aria-hidden
            className="absolute -inset-[25%] z-0 bg-cover bg-center opacity-45 blur-2xl"
            style={{ backgroundImage: `url(${POSTER}${avatar})` }}
          />
          <div aria-hidden className="cb-beam absolute inset-0 z-[1]" />
          <div aria-hidden className="cb-vignette absolute inset-0 z-[1]" />
        </>
      )}
      {background === "background.velvet" && <div aria-hidden className="cb-velvet absolute inset-0 z-0" />}

      <div className="relative z-[2] flex flex-col items-center gap-3 px-6 py-8">
        {avatar && (
          // Poster-shaped, never cropped to a circle: posters set their title in
          // the lower third and a round crop destroys it.
          <span className={`inline-block rounded-md p-[3px] leading-none ${frameClass}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${POSTER}${avatar}`}
              alt=""
              className="block h-[117px] w-[78px] rounded-sm object-cover"
            />
          </span>
        )}
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
