"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Laurel } from "@/components/Laurel";
import ProfileBackdrop from "@/components/profile/ProfileBackdrop";
import ProfileCanvas from "@/components/profile/ProfileCanvas";
import SlotPreview from "@/components/profile/SlotPreview";
import ListCard from "@/components/profile/ListCard";
import { howToEarn } from "@/components/profile/how-to-earn";
import type { ListRowData } from "@/components/profile/ListRow";
import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { itemsForSlot } from "@/lib/cosmetics/catalogue";
import { claimAllowance } from "@/lib/cosmetics/claims";
import { ID_FIELDS, type Equipped } from "@/lib/cosmetics/equipped";
import { labelFor } from "@/lib/cosmetics/labels";
import type { CosmeticItem, Slot } from "@/lib/cosmetics/types";
import type { EvaluatedAchievement } from "@/lib/gamification";
import { MIN_PIN_LIST_LEVEL } from "@/lib/gamification";
import { MAX_PINNED_ACHIEVEMENTS, patchShowcase } from "@/lib/public-profile";
import {
  avatarGroups,
  DEFAULT_SECTION,
  isSectionId,
  SECTIONS,
  taglineGroups,
  unlockGroups,
  type ItemGroup,
  type SectionId,
} from "./panes";

/**
 * The dressing room, as a PAGE.
 *
 * It was a dialog: a 600px box holding a mirror, five tabs and a 140-piece
 * wardrobe, with the collection it edits listed separately three screens down
 * the profile page. Two surfaces for one idea, and the smaller one had to
 * scroll inside itself.
 *
 * Now it is what it always was — an editor. A nav of seven sections, a live
 * preview that stays put, one pane at a time, and a bar at the foot that says
 * whether anything is unsaved. This page IS the collection: everything in the
 * game is here, owned or not, with the specific price of each locked piece.
 *
 * THE DRAFT. Every choice mutates local state and nothing else until Save,
 * which sends the whole draft in ONE patch (equipped + featured achievements +
 * featured ranking) and returns to the profile. Cancel is a link away, which is
 * exactly as much undo as a draft needs. The one exception is a poster claim,
 * which is permanent and therefore saves the moment it is made — putting an
 * irreversible act behind a button labelled Cancel would be a lie about what
 * Cancel does.
 *
 * The preview is safe to render from the draft because the page hands us
 * `equipped` already through `resolveEquipped()`: a stored id the user turns
 * out not to own has fallen back to its starter before it ever reaches here, so
 * the preview cannot show someone a cosmetic their public profile is not
 * wearing.
 */

const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 font-semibold text-bg transition-opacity duration-200 ease-out hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold cursor-pointer";

const TEXT_LINK =
  "inline-flex min-h-11 items-center justify-center rounded px-3 text-base text-gold underline-offset-4 transition-colors duration-200 ease-out hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold cursor-pointer";

const PANE_HEADING = "font-display text-2xl uppercase tracking-[0.12em] text-text";
const GROUP_HEADING = "font-display text-lg uppercase tracking-[0.12em] text-text";
const SUB_HEADING = "font-display text-base uppercase tracking-[0.12em] text-text/80";

const POSTER = "https://image.tmdb.org/t/p/w185";

/** Which slot each cosmetic pane edits. */
const PANE_SLOT: Partial<Record<SectionId, Slot>> = {
  avatar: "avatar",
  frame: "frame",
  background: "background",
  atmosphere: "overlay",
  tagline: "tagline",
};

export interface CustomiseClientProps {
  handle: string;
  /** Career level, for the nameplate, the claim allowance and the pin gate. */
  level: number;
  /** Already resolved against ownership — never the raw stored value. */
  equipped: Equipped;
  owned: string[];
  posters: { title: string; posterPath: string | null }[];
  claims: number[];
  films: { tmdbId: number; title: string; posterPath: string | null }[];
  /**
   * Resolved display text per tagline id. Earned lines carry a "{count}"
   * template and one carries spoiler text, so this component never resolves
   * them itself — the page does, with the stats only it holds.
   */
  taglineTexts: Record<string, string>;
  achievements: EvaluatedAchievement[];
  achievementKeys: string[];
  /** Every ranking the owner has; only public finished ones can be featured. */
  lists: ListRowData[];
  favoriteListId: string | null;
  /** The profile card's one line of numbers, built by `profileStatsLine`. */
  statsLine: string;
}

/**
 * One swatch. The art is the control: a tap equips, the gold ring means "this
 * is the one you are wearing", and a locked one is DIMMED rather than blurred
 * so its art stays readable while it says what it asks for.
 */
function Swatch({
  item,
  owned,
  selected,
  posterPath,
  label,
  onChoose,
}: {
  item: CosmeticItem;
  owned: boolean;
  selected: boolean;
  posterPath?: string | null;
  label: string;
  onChoose: (slot: Slot, id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={!owned}
        aria-pressed={selected}
        onClick={() => onChoose(item.slot, item.id)}
        title={owned ? label : `${label} — ${howToEarn(item.unlock)}`}
        className={`flex w-full flex-col items-center gap-2 rounded-lg p-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          selected ? "ring-1 ring-gold" : ""
        } ${owned ? "" : "cursor-not-allowed"}`}
      >
        {/* Locked art stays legible: a dark backdrop at 40% is a black square. */}
        <span className={owned ? "" : "opacity-70 saturate-50"}>
          <SlotPreview item={item} posterPath={posterPath} size="md" />
        </span>
        <span className={`text-xs leading-tight ${owned ? "text-text" : "text-text/60"}`}>
          {label}
        </span>
        {selected ? (
          <span className="text-xs leading-tight text-gold">Equipped</span>
        ) : (
          !owned && (
            <span className="text-xs leading-tight text-muted">{howToEarn(item.unlock)}</span>
          )
        )}
      </button>
    </li>
  );
}

/** A tagline IS its text, so it is a line to read, not a swatch to look at. */
function TaglineRows({
  items,
  ownedSet,
  selectedId,
  taglineTexts,
  onChoose,
}: {
  items: CosmeticItem[];
  ownedSet: ReadonlySet<string>;
  selectedId: string | undefined;
  taglineTexts: Record<string, string>;
  onChoose: (slot: Slot, id: string) => void;
}) {
  return (
    <ul className="mt-2 flex flex-col">
      {items.map((item) => {
        const isOwned = ownedSet.has(item.id);
        const isSelected = selectedId === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!isOwned}
              aria-pressed={isSelected}
              onClick={() => onChoose(item.slot, item.id)}
              className={`flex min-h-11 w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                isSelected ? "ring-1 ring-gold" : ""
              } ${isOwned ? "" : "cursor-not-allowed"}`}
            >
              <span
                className={`text-base italic leading-snug ${isOwned ? "text-text" : "text-text/45"}`}
              >
                {labelFor(item, taglineTexts)}
              </span>
              {isSelected ? (
                <span className="shrink-0 text-xs text-gold">Equipped</span>
              ) : (
                !isOwned && (
                  <span className="shrink-0 text-xs text-muted">{howToEarn(item.unlock)}</span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A collapsible accordion panel for long category sections (such as Avatars
 * and Taglines). Provides clear disclosure markup, item count badges, and
 * highlight for currently equipped selections.
 */
function CollapsibleSection({
  id,
  title,
  badge,
  hasSelected,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  badge?: string;
  hasSelected?: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
      <button
        type="button"
        id={`header-${id}`}
        aria-expanded={isOpen}
        aria-controls={`panel-${id}`}
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors duration-150 hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-display text-base uppercase tracking-[0.1em] text-text">
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-text/70">
              {badge}
            </span>
          )}
          {hasSelected && (
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">
              Equipped
            </span>
          )}
        </div>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-gold transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={`panel-${id}`}
        role="region"
        aria-labelledby={`header-${id}`}
        className={`px-4 pb-5 pt-1 ${isOpen ? "block" : "hidden"}`}
      >
        {children}
      </div>
    </div>
  );
}

/** Controls to expand or collapse all categories in a long section at once. */
function AccordionControls({
  label,
  onExpandAll,
  onCollapseAll,
}: {
  label: string;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-3">
      <span className="text-xs uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider">
        <button
          type="button"
          onClick={onExpandAll}
          className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
        >
          Expand all
        </button>
        <span className="text-white/20">|</span>
        <button
          type="button"
          onClick={onCollapseAll}
          className="text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-gold"
        >
          Collapse all
        </button>
      </div>
    </div>
  );
}

/**
 * A pane's rows. `section` on a group prints one heading above a RUN of groups
 * that share it ("Illustrated" over six styles of drawn avatar), so the pane
 * reads as headings and not as a stack of equal-weight labels.
 */
function GroupedSwatches({
  groups,
  ownedSet,
  selectedId,
  taglineTexts,
  posterPathFor,
  onChoose,
}: {
  groups: ItemGroup[];
  ownedSet: ReadonlySet<string>;
  selectedId: string | undefined;
  taglineTexts: Record<string, string>;
  posterPathFor: (id: string) => string | null | undefined;
  onChoose: (slot: Slot, id: string) => void;
}) {
  return (
    <>
      {groups.map((group, i) => (
        <div key={group.key} className="mt-8">
          {group.section && group.section !== groups[i - 1]?.section && (
            <h3 className={GROUP_HEADING}>{group.section}</h3>
          )}
          {group.section ? (
            <h4 className={`${SUB_HEADING} mt-4`}>{group.title}</h4>
          ) : (
            <h3 className={GROUP_HEADING}>{group.title}</h3>
          )}
          <ul
            className={`mt-4 grid gap-x-3 gap-y-4 ${
              // Rooms (backgrounds, atmosphere) are landscape swatches and need
              // the wider column; everything else is poster-shaped.
              group.items[0]?.slot === "background" || group.items[0]?.slot === "overlay"
                ? "grid-cols-[repeat(auto-fill,minmax(136px,1fr))]"
                : "grid-cols-[repeat(auto-fill,minmax(88px,1fr))]"
            }`}
          >
            {group.items.map((item) => (
              <Swatch
                key={item.id}
                item={item}
                owned={ownedSet.has(item.id)}
                selected={selectedId === item.id}
                posterPath={posterPathFor(item.id)}
                label={labelFor(item, taglineTexts)}
                onChoose={onChoose}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

/**
 * Turning one of your own ranked films into an avatar.
 *
 * DELIBERATELY OUTSIDE THE DRAFT. Every other choice on this page is
 * provisional until Save and discarded by Cancel; a claim is permanent — there
 * is no unclaiming, because one allowance rotating through a whole library
 * would defeat the scarcity entirely. So claiming saves immediately, says so,
 * and asks first: the confirm step is the whole point, because a mis-click here
 * cannot be taken back.
 */
function ClaimPosters({
  films,
  claimed,
  allowance,
  busy,
  error,
  onClaim,
}: {
  films: { tmdbId: number; title: string; posterPath: string | null }[];
  claimed: number[];
  allowance: number;
  busy: boolean;
  error: string | null;
  onClaim: (tmdbId: number) => void;
}) {
  const [confirmingFilm, setConfirmingFilm] = useState<{
    tmdbId: number;
    title: string;
    posterPath: string | null;
  } | null>(null);
  const [showAllPosters, setShowAllPosters] = useState(false);
  const claimedSet = new Set(claimed);
  const unclaimed = films.filter((f) => !claimedSet.has(f.tmdbId));
  const remaining = Math.max(0, allowance - claimed.length);

  const INITIAL_ROWS_LIMIT = 12;
  const displayedFilms = showAllPosters ? unclaimed : unclaimed.slice(0, INITIAL_ROWS_LIMIT);

  if (films.length === 0) return null;

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className={SUB_HEADING}>Movie Poster Avatars</h4>
        <span className="rounded-full bg-gold/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-gold ring-1 ring-gold/30">
          {remaining} of {allowance} unlocks available
        </span>
      </div>
      <p className="mt-2 max-w-[70ch] text-base leading-relaxed text-text/90">
        Unlock film posters you&apos;ve ranked. Get a new unlock with every level up.
      </p>

      {error && (
        <p className="mt-2 text-base text-gold" role="status">
          {error}
        </p>
      )}

      {unclaimed.length === 0 ? (
        <p className="mt-4 text-base text-muted">
          Every film you have ranked is already unlocked.
        </p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-4">
            {displayedFilms.map((film) => (
              <li key={film.tmdbId}>
                <button
                  type="button"
                  disabled={remaining === 0 || busy}
                  onClick={() => setConfirmingFilm(film)}
                  title={film.title}
                  className={`flex w-full flex-col items-center gap-2 rounded-lg p-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    remaining === 0 ? "cursor-not-allowed opacity-40" : "hover:ring-1 hover:ring-gold/50 cursor-pointer"
                  }`}
                >
                  <span className="block h-[117px] w-[78px] shrink-0 overflow-hidden rounded-sm bg-surface-raised">
                    {film.posterPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${POSTER}${film.posterPath}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 text-xs leading-tight text-text">
                    {film.title}
                  </span>
                  <span className="text-xs leading-tight text-gold">
                    Unlock
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {unclaimed.length > INITIAL_ROWS_LIMIT && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAllPosters(!showAllPosters)}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 bg-surface/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold hover:border-gold/50 hover:bg-gold/10 transition-colors focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
              >
                {showAllPosters
                  ? "Show less"
                  : `Show all (${unclaimed.length - INITIAL_ROWS_LIMIT} remaining)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingFilm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-unlock-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-gold/30 text-center">
            <h5 id="confirm-unlock-title" className="font-display text-lg uppercase tracking-wider text-gold">
              Are you sure?
            </h5>
            <p className="mt-2 text-sm text-text leading-relaxed">
              Unlock <strong className="text-gold font-semibold">{confirmingFilm.title}</strong> as your avatar?
            </p>
            <p className="mt-1 text-xs text-muted">
              This uses 1 of your {remaining} available unlocks. Unlocks are permanent and save straight away.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmingFilm(null)}
                disabled={busy}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 bg-surface-raised px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-text hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const filmId = confirmingFilm.tmdbId;
                  setConfirmingFilm(null);
                  await onClaim(filmId);
                }}
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-gold px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-bg shadow hover:bg-gold/90 transition-transform active:scale-95 cursor-pointer"
              >
                {busy ? "Unlocking…" : "Confirm unlock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Which three laurels go on the public profile.
 *
 * The laurel IS the control — clicking one features or unfeatures it, with the
 * state said in a word underneath and carried properly by `aria-pressed`. This
 * moved here out of the profile page, where a wall of toggles sat under a
 * heading that was otherwise a record of what someone had won.
 */
function AchievementsPane({
  achievements,
  featured,
  onToggle,
}: {
  achievements: EvaluatedAchievement[];
  featured: string[];
  onToggle: (key: string) => void;
}) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <>
      <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text/90">
        Up to {MAX_PINNED_ACHIEVEMENTS} appear on your public profile. {featured.length} of{" "}
        {MAX_PINNED_ACHIEVEMENTS} chosen.
      </p>

      {unlocked.length === 0 ? (
        <p className="mt-6 text-base text-muted">Finish a ranking to win your first laurel.</p>
      ) : (
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-5">
          {unlocked.map((a) => {
            const isFeatured = featured.includes(a.key);
            const atCapacity = !isFeatured && featured.length >= MAX_PINNED_ACHIEVEMENTS;
            return (
              <li key={a.key}>
                <button
                  type="button"
                  onClick={() => onToggle(a.key)}
                  disabled={atCapacity}
                  aria-pressed={isFeatured}
                  title={
                    atCapacity
                      ? `You can feature ${MAX_PINNED_ACHIEVEMENTS} — unfeature one first. ${a.description}`
                      : a.description
                  }
                  className="flex flex-col items-center rounded transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Laurel className="text-base">{a.name}</Laurel>
                  <span className={`mt-1 block text-xs ${isFeatured ? "text-gold" : "text-muted"}`}>
                    {isFeatured ? "Featured" : "Feature"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {locked.length > 0 && (
        <div className="mt-10">
          <h3 className={GROUP_HEADING}>Still to earn</h3>
          <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
            {locked.map((a) => (
              <li key={a.key}>
                <Laurel tone="muted">{a.name}</Laurel>
                <p className="mt-1 max-w-[46ch] text-base leading-relaxed text-muted">
                  {a.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * The one ranking that leads the public profile.
 *
 * Only a PUBLIC FINISHED ranking can be featured — the same three conditions
 * /api/profile re-checks server-side before it will store the id, so a card
 * that cannot be featured is never offered as though it could.
 */
function RankingPane({
  lists,
  level,
  featuredId,
  onToggle,
}: {
  lists: ListRowData[];
  level: number;
  featuredId: string | null;
  onToggle: (id: string) => void;
}) {
  if (level < MIN_PIN_LIST_LEVEL) {
    return (
      <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text/90">
        Featuring a ranking unlocks at level {MIN_PIN_LIST_LEVEL}. Pin a ranking to feature it at the top of your public profile.
      </p>
    );
  }

  const eligible = lists.filter((c) => c.status === "done" && c.visibility === "public");
  const withheld = lists.filter((c) => c.status === "done" && c.visibility !== "public").length;

  return (
    <>
      <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text/90">
        Pin a ranking to feature it at the top of your public profile.
        {withheld > 0 &&
          ` (${withheld} finished ${withheld === 1 ? "ranking is" : "rankings are"} unlisted and cannot be featured until made public.)`}
      </p>

      {eligible.length === 0 ? (
        <p className="mt-6 text-base text-muted">
          Finish a ranking and set it to public to feature it.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {eligible.map((card) => {
            const isFeatured = card.id === featuredId;
            return (
              <li key={card.id}>
                <ListCard
                  href={`/l/${card.id}`}
                  title={card.title}
                  meta={`${card.posters.length} ${card.posters.length === 1 ? "film" : "films"}`}
                  posters={card.posters}
                  slots={3}
                  featured={isFeatured}
                  footer={
                    <button
                      type="button"
                      onClick={() => onToggle(card.id)}
                      aria-pressed={isFeatured}
                      title={
                        isFeatured
                          ? "Stop featuring this ranking"
                          : "Feature this ranking at the top of your public profile"
                      }
                      className="mt-2.5 min-h-11 rounded text-base text-gold underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                    >
                      {isFeatured ? "Featured" : "Feature"}
                    </button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function CustomiseClient({
  handle,
  level,
  equipped,
  owned,
  posters,
  claims,
  films,
  taglineTexts,
  achievements,
  achievementKeys,
  lists,
  favoriteListId,
  statsLine,
}: CustomiseClientProps) {
  const [section, setSection] = useState<SectionId>(DEFAULT_SECTION);
  const [draft, setDraft] = useState<Equipped>(equipped);
  const [featured, setFeatured] = useState<string[]>(achievementKeys);
  const [favorite, setFavorite] = useState<string | null>(favoriteListId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string, defaultOpen: boolean) => {
    setExpandedKeys((prev) => {
      const current = prev[key] ?? defaultOpen;
      return { ...prev, [key]: !current };
    });
  };

  const expandAll = (targetGroups: ItemGroup[]) => {
    setExpandedKeys((prev) => {
      const next = { ...prev };
      for (const g of targetGroups) {
        next[g.key] = true;
      }
      return next;
    });
  };

  const collapseAll = (targetGroups: ItemGroup[]) => {
    setExpandedKeys((prev) => {
      const next = { ...prev };
      for (const g of targetGroups) {
        next[g.key] = false;
      }
      return next;
    });
  };

  /**
   * The URL fragment is the pane. That makes every section deep-linkable —
   * the profile page's "Choose featured achievements" link points straight at
   * `#featured-achievements` — and makes Back walk the panes, for free. The
   * nav items are ordinary anchors, so the hash is the single source of truth
   * and the click handler is only there for the case the browser fires no
   * `hashchange` (clicking the pane you are already on).
   */
  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (isSectionId(hash)) setSection(hash);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  /**
   * Claims live in local state, not just the prop, so a poster claimed in this
   * session becomes equippable without a reload. They are only ever ADDED —
   * mirroring the server, where mergeShowcase unions claims and can never
   * remove one.
   */
  const [claimed, setClaimed] = useState<number[]>(claims);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function claimPoster(tmdbId: number) {
    setClaiming(true);
    setClaimError(null);
    // Sent on its own, never bundled with the equip draft: this write is
    // permanent and must not depend on the rest of the page being valid.
    const ok = await patchShowcase({ avatarClaims: [...claimed, tmdbId] });
    setClaiming(false);
    if (!ok) {
      // The server re-checks the film is really the user's and that the count
      // fits their allowance, so a refusal here is authoritative.
      setClaimError("That unlock was refused — you may be out of unlocks.");
      return;
    }
    setClaimed((c) => [...new Set([...c, tmdbId])]);
  }

  const posterByTmdbId = new Map(films.map((f) => [f.tmdbId, f]));

  // Claimed posters are per-user and never in CATALOGUE, so they are
  // synthesised here and named after the film they came from.
  const claimedAvatars: CosmeticItem[] = claimed
    .map((tmdbId) => syntheticPosterAvatar(posterAvatarId(tmdbId)))
    .filter((i): i is CosmeticItem => i !== undefined)
    .map((i) => ({ ...i, name: posterByTmdbId.get(posterAvatarTmdbId(i.id)!)?.title ?? i.name }));

  // A claim is granted by the server the instant it is made, so one made in
  // THIS session is owned even though `owned` was computed before it existed.
  // Without this the poster you just spent an allowance on renders locked until
  // a reload — the one thing a permanent purchase must never do.
  const ownedSet = new Set([...owned, ...claimedAvatars.map((i) => i.id)]);

  const posterPathFor = (id: string) => {
    const tmdbId = posterAvatarTmdbId(id);
    return tmdbId === null ? undefined : posterByTmdbId.get(tmdbId)?.posterPath;
  };

  function choose(slot: Slot, id: string) {
    setDraft((d) => {
      // Clicking the equipped tagline clears it — a tagline is the one
      // optional slot, so it needs a way back to none.
      if (slot === "tagline" && d.tagline === id) return { ...d, tagline: null };
      const next: Equipped = { ...d, [slot]: id };
      if (slot === "avatar") {
        // Keep the poster path in step so the preview (and the share card)
        // can draw a poster avatar. Cleared for non-poster kinds so a stale
        // path cannot resurface later.
        const tmdbId = posterAvatarTmdbId(id);
        next.avatarPosterPath =
          tmdbId === null ? undefined : (posterByTmdbId.get(tmdbId)?.posterPath ?? undefined);
        next.avatarTmdbId = tmdbId ?? undefined;
      }
      return next;
    });
  }

  function toggleAchievement(key: string) {
    setFeatured((keys) =>
      keys.includes(key)
        ? keys.filter((k) => k !== key)
        : keys.length >= MAX_PINNED_ACHIEVEMENTS
          ? keys // at capacity — the button is disabled, so this is belt and braces
          : [...keys, key],
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    // ONE request for the whole draft. `taglineText` is deliberately NOT sent —
    // the server resolves and stores it, and never believes a client value.
    const ok = await patchShowcase({
      equipped: {
        avatar: draft.avatar ?? null,
        frame: draft.frame ?? null,
        background: draft.background ?? null,
        overlay: draft.overlay ?? null,
        tagline: draft.tagline ?? null,
        ...(draft.avatarTmdbId !== undefined ? { avatarTmdbId: draft.avatarTmdbId } : {}),
        ...(draft.avatarPosterPath !== undefined
          ? { avatarPosterPath: draft.avatarPosterPath }
          : {}),
      },
      achievementKeys: featured,
      favoriteListId: favorite,
    });
    if (!ok) {
      setSaving(false);
      setError("That did not save. Some of these may not be unlocked yet.");
      return;
    }
    // A DOCUMENT navigation, not a client one, and the lint rule is waived
    // deliberately. The profile page is server-rendered from the very row this
    // patch just rewrote — including the backdrop now painted behind the whole
    // page — and a soft push can serve the prefetched HTML from before the
    // save, which is how the dialog this replaced showed people their old
    // cosmetics after telling them it had saved. `saving` stays on: the page
    // is leaving.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/u/profile");
  }

  const slot = PANE_SLOT[section];
  const paneItems: CosmeticItem[] =
    slot === undefined
      ? []
      : slot === "avatar"
        ? [...claimedAvatars, ...itemsForSlot("avatar")]
        : itemsForSlot(slot);
  const ownedCount = paneItems.filter((i) => ownedSet.has(i.id)).length;

  const groups: ItemGroup[] =
    section === "avatar"
      ? avatarGroups(claimedAvatars)
      : section === "tagline"
        ? taglineGroups()
        : slot === undefined
          ? []
          : unlockGroups(itemsForSlot(slot), ownedSet);

  const featuredLaurels = achievements
    .filter((a) => a.unlocked && featured.includes(a.key))
    .map((a) => ({ name: a.name }));

  const dirty =
    ID_FIELDS.some((field) => (draft[field] ?? null) !== (equipped[field] ?? null)) ||
    featured.length !== achievementKeys.length ||
    featured.some((k) => !achievementKeys.includes(k)) ||
    favorite !== favoriteListId;

  const sectionLabel = SECTIONS.find((s) => s.id === section)?.label ?? "";

  return (
    <div className="mt-8">
      <div className="flex flex-col lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-12">
        {/*
          The nav. A column beside the panes on a desktop, a scrolling row under
          the mirror on a phone — where a seven-item column would push the pane
          itself off the screen.
        */}
        <nav
          aria-label="Profile sections"
          className="order-2 mt-6 -mx-4 overflow-x-auto px-4 lg:order-none lg:col-start-1 lg:mx-0 lg:mt-0 lg:self-start lg:overflow-visible lg:px-0 lg:sticky lg:top-6"
        >
          <ul className="flex gap-x-6 whitespace-nowrap lg:flex-col lg:gap-x-0 lg:gap-y-1">
            {SECTIONS.map((s) => {
              const active = s.id === section;
              return (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setSection(s.id)}
                    className={`flex min-h-11 items-center font-display text-lg uppercase tracking-[0.08em] transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                      active ? "text-gold" : "text-muted hover:text-text"
                    }`}
                  >
                    {s.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Right column container on desktop: hosts both the sticky mirror and the active scrolling pane */}
        <div className="contents lg:block lg:col-start-2">
          {/*
            THE MIRROR: sticky on desktop so as the user scrolls through items,
            they see their choices reflected immediately without scrolling back up.
          */}
          <div className="order-1 relative min-h-[360px] overflow-hidden rounded-2xl border border-white/5 bg-bg/95 shadow-2xl backdrop-blur-md lg:sticky lg:top-4 lg:z-20">
            <ProfileBackdrop equipped={draft} posters={posters} variant="preview" />
            <div className="relative z-[1] flex min-h-[360px] items-center px-4 py-6 sm:px-6">
              <div className="w-full">
                <ProfileCanvas
                  handle={handle}
                  level={level}
                  equipped={draft}
                  posters={posters}
                  taglineText={draft.tagline ? taglineTexts[draft.tagline] : null}
                  statsLine={statsLine}
                  pinned={featuredLaurels}
                />
              </div>
            </div>
          </div>

          {/* The active pane. `id` is the fragment the nav and deep links aim at. */}
          <section
            id={section}
            aria-label={sectionLabel}
            className="order-3 mt-10 scroll-mt-6"
          >
            <h2 className={PANE_HEADING}>{sectionLabel}</h2>

          {section === "featured-achievements" && (
            <AchievementsPane
              achievements={achievements}
              featured={featured}
              onToggle={toggleAchievement}
            />
          )}

          {section === "featured-ranking" && (
            <RankingPane
              lists={lists}
              level={level}
              featuredId={favorite}
              onToggle={(id) => setFavorite((f) => (f === id ? null : id))}
            />
          )}

          {slot !== undefined && (
            <>
              <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text/90">
                {ownedCount} of {paneItems.length} unlocked.
                {section === "tagline" && " Tap the line you are wearing to take it off."}
                {section === "atmosphere" &&
                  " One at a time, and every one of them holds still under reduced motion."}
              </p>

              {/*
                NO SECOND BIG AVATAR HERE, deliberately. The brief asked this
                pane to lead with the equipped avatar at 180px inside its
                frame — and the mirror six inches above it now draws exactly
                that, at exactly that size, since the profile panel went
                translucent and side-by-side. Two identical 180px avatars,
                one under the other, is the same idea in two boxes. The mirror
                is pinned to the top of this column and never scrolls away, so
                it is already the close-up; what this pane owes is the choice.
              */}
              {section === "tagline" ? (
                <>
                  <AccordionControls
                    label="Tagline Themes & Decades"
                    onExpandAll={() => expandAll(groups)}
                    onCollapseAll={() => collapseAll(groups)}
                  />
                  <div className="mt-4 flex flex-col gap-3">
                    {groups.map((group, index) => {
                      const hasSelected = group.items.some((i) => i.id === draft.tagline);
                      const anyHasSelected = groups.some((g) =>
                        g.items.some((i) => i.id === draft.tagline),
                      );
                      const defaultOpen = hasSelected || (!anyHasSelected && index === 0);
                      const isOpen = expandedKeys[group.key] ?? defaultOpen;
                      const ownedInGroup = group.items.filter((i) => ownedSet.has(i.id)).length;
                      const badge = `${ownedInGroup} of ${group.items.length} unlocked`;

                      return (
                        <CollapsibleSection
                          key={group.key}
                          id={group.key}
                          title={group.title}
                          badge={badge}
                          hasSelected={hasSelected}
                          isOpen={isOpen}
                          onToggle={() => toggleGroup(group.key, defaultOpen)}
                        >
                          <TaglineRows
                            items={group.items}
                            ownedSet={ownedSet}
                            selectedId={draft.tagline ?? undefined}
                            taglineTexts={taglineTexts}
                            onChoose={choose}
                          />
                        </CollapsibleSection>
                      );
                    })}
                  </div>
                </>
              ) : section === "avatar" ? (
                <>
                  <AccordionControls
                    label="Avatar Styles & Collections"
                    onExpandAll={() => expandAll(groups)}
                    onCollapseAll={() => collapseAll(groups)}
                  />
                  <div className="mt-4 flex flex-col gap-3">
                    {groups.map((group, index) => {
                      const hasSelected = group.items.some((i) => i.id === draft.avatar);
                      const anyHasSelected = groups.some((g) =>
                        g.items.some((i) => i.id === draft.avatar),
                      );
                      const defaultOpen = hasSelected || (!anyHasSelected && index === 0);
                      const isOpen = expandedKeys[group.key] ?? defaultOpen;
                      const ownedInGroup = group.items.filter((i) => ownedSet.has(i.id)).length;
                      const badge = `${ownedInGroup} of ${group.items.length} unlocked`;

                      return (
                        <div key={group.key}>
                          {group.section && group.section !== groups[index - 1]?.section && (
                            <h3 className={`${GROUP_HEADING} mt-6 mb-2`}>{group.section}</h3>
                          )}
                          <CollapsibleSection
                            id={group.key}
                            title={group.title}
                            badge={badge}
                            hasSelected={hasSelected}
                            isOpen={isOpen}
                            onToggle={() => toggleGroup(group.key, defaultOpen)}
                          >
                            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-4">
                              {group.items.map((item) => (
                                <Swatch
                                  key={item.id}
                                  item={item}
                                  owned={ownedSet.has(item.id)}
                                  selected={draft.avatar === item.id}
                                  posterPath={posterPathFor(item.id)}
                                  label={labelFor(item, taglineTexts)}
                                  onChoose={choose}
                                />
                              ))}
                            </ul>
                          </CollapsibleSection>
                        </div>
                      );
                    })}
                  </div>
                  <ClaimPosters
                    films={films}
                    claimed={claimed}
                    allowance={claimAllowance(level)}
                    busy={claiming}
                    error={claimError}
                    onClaim={claimPoster}
                  />
                </>
              ) : (
                <GroupedSwatches
                  groups={groups}
                  ownedSet={ownedSet}
                  selectedId={draft[slot] ?? undefined}
                  taglineTexts={taglineTexts}
                  posterPathFor={posterPathFor}
                  onChoose={choose}
                />
              )}
            </>
          )}
        </section>
        </div>
      </div>

      {/*
        The bar. It never scrolls away, because the pane above it is long and a
        Save you have to hunt for is a Save you do not trust. One primary on the
        page, and it lives here.
      */}
      <div className="sticky bottom-0 z-10 mt-12 -mx-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/10 bg-bg/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <span className={`text-base ${error ? "text-gold" : "text-muted"}`} role="status">
          {error ?? (dirty ? "Unsaved changes" : "Everything saved")}
        </span>
        <span className="flex shrink-0 items-center gap-x-6">
          <Link href="/u/profile" className={TEXT_LINK}>
            Cancel
          </Link>
          <button type="button" onClick={save} disabled={saving || !dirty} className={PRIMARY}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </span>
      </div>
    </div>
  );
}
