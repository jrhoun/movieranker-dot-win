"use client";

import { useEffect, useRef, useState } from "react";
import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { itemsForSlot, SLOTS } from "@/lib/cosmetics/catalogue";
import { SLOT_LABEL } from "@/lib/cosmetics/categories";
import { claimAllowance } from "@/lib/cosmetics/claims";
import type { CosmeticItem, Slot, TaglineItem } from "@/lib/cosmetics/types";
import type { Equipped } from "@/lib/cosmetics/equipped";
import { patchShowcase } from "@/lib/public-profile";
import { labelFor } from "@/lib/cosmetics/labels";
import { howToEarn } from "./how-to-earn";
import ProfileCanvas from "./ProfileCanvas";
import SlotPreview from "./SlotPreview";

/**
 * The dressing room.
 *
 * The mirror at the top is the whole idea: it renders ProfileCanvas from the
 * DRAFT, so a tap is a fitting rather than a guess. Before this the dialog was
 * a settings panel — you picked blind, saved, and the card above the dialog
 * updated afterwards.
 *
 * The mirror is safe to render from the draft because the page hands us
 * `equipped` already through `resolveEquipped()`: a stored id the user turns
 * out not to own has already fallen back to its starter, so the mirror cannot
 * show someone a cosmetic their public profile is not wearing.
 *
 * Tab order follows the design pass (frames first, taglines last) rather than
 * the old "most-changed first"; the avatar tab is where poster claims live, so
 * it sits next to the end where an irreversible act is less likely to be
 * stumbled into.
 */

/**
 * Display order for the tab strip; the titles themselves come from SLOT_LABEL,
 * so the dressing room and the collection wall can never call a category two
 * different things. Filtered against SLOTS once, at module scope: the roving
 * tabindex indexes into this array, and building it per render behind a filter
 * would let the two lists disagree the day a slot is retired.
 */
const TABS: Slot[] = (["frame", "overlay", "background", "avatar", "tagline"] as Slot[]).filter(
  (s) => SLOTS.includes(s),
);

const POSTER = "https://image.tmdb.org/t/p/w185";

/** The one primary in the dialog, and the trigger that opens it. */
const PRIMARY =
  "min-h-11 rounded-full bg-gold px-5 font-semibold text-bg transition-opacity duration-200 ease-out hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold";

/**
 * Turning one of your own ranked films into an avatar.
 *
 * DELIBERATELY OUTSIDE THE DRAFT. Every other choice in this dialog is
 * provisional until Save and discarded by Cancel; a claim is permanent — there
 * is no unclaiming, because one allowance rotating through a whole library
 * would defeat the scarcity entirely. Putting an irreversible act behind a
 * button labelled Cancel would be a lie about what Cancel does, so claiming
 * saves immediately and asks first.
 *
 * The confirm step is the whole point of this component: a mis-click here
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
  const [pending, setPending] = useState<number | null>(null);
  const claimedSet = new Set(claimed);
  const unclaimed = films.filter((f) => !claimedSet.has(f.tmdbId));
  const remaining = Math.max(0, allowance - claimed.length);

  if (films.length === 0) return null;

  return (
    <div className="mt-8 border-t border-white/10 pt-6">
      <h3 className="text-sm font-semibold text-text">
        Claim a poster from a film you have ranked
      </h3>
      <p className="mt-1 text-sm text-muted">
        {claimed.length} of {allowance} claim{allowance === 1 ? "" : "s"} used.{" "}
        {remaining > 0
          ? "A claim is permanent, and every level earns you another."
          : "Every level up earns you another."}
      </p>

      {error && (
        <p className="mt-2 text-sm text-gold" role="status">
          {error}
        </p>
      )}

      {unclaimed.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Every film you have ranked is already claimed.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-4">
          {unclaimed.map((film) => {
            const isPending = pending === film.tmdbId;
            return (
              <li key={film.tmdbId}>
                <button
                  type="button"
                  disabled={remaining === 0 || busy}
                  onClick={() => (isPending ? onClaim(film.tmdbId) : setPending(film.tmdbId))}
                  onBlur={() => isPending && setPending(null)}
                  title={film.title}
                  className={`flex w-full flex-col items-center gap-2 rounded-lg p-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    isPending ? "ring-1 ring-gold" : ""
                  } ${remaining === 0 ? "cursor-not-allowed opacity-40" : ""}`}
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
                  <span className="line-clamp-2 text-xs leading-tight text-text">{film.title}</span>
                  <span className="text-xs leading-tight text-gold">
                    {isPending ? (busy ? "Claiming…" : "Tap again to claim") : "Claim"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Top level, not nested in the modal: a component defined during render is a
 *  new type every render, which remounts every tile on each keystroke. */
function Grid({
  items,
  ownedSet,
  selectedId,
  taglineTexts,
  posterPathFor,
  onChoose,
}: {
  items: CosmeticItem[];
  ownedSet: Set<string>;
  selectedId: string | undefined;
  taglineTexts: Record<string, string>;
  posterPathFor: (id: string) => string | null | undefined;
  onChoose: (slot: Slot, id: string) => void;
}) {
  return (
    <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-3 gap-y-4">
      {items.map((item) => {
        const isOwned = ownedSet.has(item.id);
        const isSelected = selectedId === item.id;
        const label = labelFor(item, taglineTexts);
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!isOwned}
              aria-pressed={isSelected}
              onClick={() => onChoose(item.slot, item.id)}
              title={isOwned ? label : `${label} — ${howToEarn(item.unlock)}`}
              /* A ring means one thing here: this is the one you are wearing.
                 Owned-but-unworn tiles carry no border at all, so the wall
                 reads as art rather than as a form. */
              className={`flex w-full flex-col items-center gap-2 rounded-lg p-1.5 text-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                isSelected ? "ring-1 ring-gold" : ""
              } ${isOwned ? "" : "cursor-not-allowed"}`}
            >
              {/* Dimmed, never blurred — a locked item stays readable. */}
              <span className={isOwned ? "" : "opacity-40"}>
                <SlotPreview item={item} posterPath={posterPathFor(item.id)} size="md" />
              </span>
              <span className="text-xs leading-tight text-text">{label}</span>
              {isSelected ? (
                <span className="text-xs leading-tight text-gold">Equipped</span>
              ) : (
                !isOwned && (
                  <span className="text-xs leading-tight text-muted">
                    {howToEarn(item.unlock)}
                  </span>
                )
              )}
            </button>
          </li>
        );
      })}
    </ul>
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
  ownedSet: Set<string>;
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
              <span className={`text-sm italic leading-snug ${isOwned ? "text-text" : "text-text/45"}`}>
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

export default function CustomiseModal({
  handle,
  level,
  equipped,
  owned,
  posters,
  claims = [],
  films = [],
  taglineTexts = {},
}: {
  handle: string;
  level: number;
  equipped: Equipped;
  owned: string[];
  posters: { title: string; posterPath: string | null }[];
  claims?: number[];
  films?: { tmdbId: number; title: string; posterPath: string | null }[];
  /**
   * Resolved display text per tagline id. Earned lines carry a "{count}"
   * template and one carries spoiler text, so this component never resolves
   * them itself — the page does, with the stats only it holds.
   */
  taglineTexts?: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Slot>(TABS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * DRAFT state. Selections mutate this and nothing else until Save, which
   * fires a single patchShowcase. Cancel discards.
   *
   * This also fixes a live bug in the pickers it replaces: those saved on every
   * click and never refreshed the canvas, so the page showed stale cosmetics
   * until a reload — you could not see what you had just chosen.
   */
  const [draft, setDraft] = useState<Equipped>(equipped);

  // showModal() puts the dialog in the top layer, which brings Escape, a focus
  // trap, focus restoration and ::backdrop with it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

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
    // permanent and must not depend on the rest of the dialog being valid.
    const ok = await patchShowcase({ avatarClaims: [...claimed, tmdbId] });
    setClaiming(false);
    if (!ok) {
      // The server re-checks the film is really the user's and that the count
      // fits their allowance, so a refusal here is authoritative.
      setClaimError("That claim was refused — you may be out of claims.");
      return;
    }
    setClaimed((c) => [...new Set([...c, tmdbId])]);
  }

  const ownedSet = new Set(owned);
  const posterByTmdbId = new Map(films.map((f) => [f.tmdbId, f]));

  // Claimed posters are per-user and never in CATALOGUE.
  const claimedAvatars: CosmeticItem[] = claimed
    .map((tmdbId) => syntheticPosterAvatar(posterAvatarId(tmdbId)))
    .filter((i): i is CosmeticItem => i !== undefined)
    .map((i) => ({ ...i, name: posterByTmdbId.get(posterAvatarTmdbId(i.id)!)?.title ?? i.name }));

  const itemsFor = (slot: Slot) =>
    slot === "avatar" ? [...itemsForSlot(slot), ...claimedAvatars] : itemsForSlot(slot);

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

  async function save() {
    setSaving(true);
    setError(null);
    // One request for the whole draft. taglineText is deliberately NOT sent —
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
    });
    setSaving(false);
    if (!ok) {
      setError("That did not save. Some of these may not be unlocked yet.");
      return;
    }
    setOpen(false);
    // The canvas outside this dialog is server-rendered, so a reload is what
    // makes the saved look appear there too.
    window.location.reload();
  }

  function cancel() {
    setDraft(equipped);
    setError(null);
    setOpen(false);
  }

  /** Arrow keys move focus AND selection, which is what an ARIA tablist owes. */
  function onTabKeyDown(e: React.KeyboardEvent, idx: number) {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = idx === last ? 0 : idx + 1;
    else if (e.key === "ArrowLeft") next = idx === 0 ? last : idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  }

  const tabItems = itemsFor(tab);
  const ownedCount = tabItems.filter((i) => ownedSet.has(i.id)).length;

  // Only the five equippable slots matter here: a claim is saved the moment it
  // is made, so it is never part of "unsaved changes".
  const dirty = SLOTS.some((slot) => (draft[slot] ?? null) !== (equipped[slot] ?? null));

  const taglineSets =
    tab === "tagline"
      ? [...new Set((tabItems as TaglineItem[]).map((t) => t.set))].map((set) => ({
          set,
          items: (tabItems as TaglineItem[]).filter((t) => t.set === set) as CosmeticItem[],
        }))
      : [];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className={PRIMARY}>
        Customise
      </button>

      <dialog
        ref={ref}
        aria-labelledby="customise-modal-title"
        onClose={cancel}
        onClick={(e) => {
          if (e.target === ref.current) cancel();
        }}
        className="m-auto w-full max-w-2xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-gold/30">
          {/* No × in the corner: Cancel sits in a footer that never scrolls
              away, and Escape and a backdrop click both close. An icon that
              duplicates a labelled button is one more thing to decode. */}
          <div className="border-b border-white/10 p-5 sm:px-6">
            <h2
              id="customise-modal-title"
              className="font-display text-2xl uppercase tracking-[0.12em] text-gold"
            >
              Dressing room
            </h2>
            <p className="mt-1 text-sm text-muted">
              Tap anything to try it on. The card below is your profile as it would look.
            </p>
          </div>

          <div className="overflow-y-auto p-5 sm:px-6">
            {/*
              The mirror: the draft, not what is stored.

              Left at the dialog's own width on purpose. ProfileCanvas sizes
              itself by CONTAINER (`@container`), and its ~600px form here is
              the stacked one it was written for — a narrower wrapper would only
              squeeze the nameplate. `statsLine` and `pinned` are deliberately
              omitted: this mirror exists to preview cosmetics, and rank, counts
              and laurels change nothing a tap in here can affect.
            */}
            <ProfileCanvas
              handle={handle}
              level={level}
              equipped={draft}
              posters={posters}
              taglineText={draft.tagline ? taglineTexts[draft.tagline] : null}
            />

            <div
              role="tablist"
              aria-label="Cosmetic categories"
              className="mt-6 flex flex-wrap gap-x-5 border-b border-white/10"
            >
              {TABS.map((slot, i) => {
                const active = tab === slot;
                return (
                  <button
                    key={slot}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    id={`customise-tab-${slot}`}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    aria-controls="customise-panel"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setTab(slot)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                    className={`-mb-px min-h-11 border-b-2 px-0.5 text-sm transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                      active
                        ? "border-gold font-semibold text-text"
                        : "border-transparent text-muted hover:text-text"
                    }`}
                  >
                    {SLOT_LABEL[slot]}
                  </button>
                );
              })}
            </div>

            <div
              id="customise-panel"
              role="tabpanel"
              aria-labelledby={`customise-tab-${tab}`}
              tabIndex={-1}
            >
              <p className="mt-4 text-sm text-muted">
                {ownedCount} of {tabItems.length} unlocked.
                {tab === "tagline" && " Tap the line you are wearing to take it off."}
              </p>

              {/*
                Taglines are split by set. There are 88 of them, and one flat
                list is an index to scroll past rather than a collection to
                browse. Every other slot has few enough items to show at once.
              */}
              {tab === "tagline" ? (
                taglineSets.map(({ set, items }) => (
                  <section key={set} className="mt-6">
                    <h3 className="font-display text-lg uppercase tracking-[0.12em] text-text">
                      {set}
                    </h3>
                    <TaglineRows
                      items={items}
                      ownedSet={ownedSet}
                      selectedId={draft.tagline ?? undefined}
                      taglineTexts={taglineTexts}
                      onChoose={choose}
                    />
                  </section>
                ))
              ) : (
                <Grid
                  items={tabItems}
                  ownedSet={ownedSet}
                  selectedId={draft[tab] ?? undefined}
                  taglineTexts={taglineTexts}
                  posterPathFor={posterPathFor}
                  onChoose={choose}
                />
              )}

              {tab === "avatar" && (
                <ClaimPosters
                  films={films}
                  claimed={claimed}
                  allowance={claimAllowance(level)}
                  busy={claiming}
                  error={claimError}
                  onClaim={claimPoster}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 p-4 sm:px-6">
            <span className={`text-sm ${error ? "text-gold" : "text-muted"}`} role="status">
              {error ?? (dirty ? "Unsaved changes" : "")}
            </span>
            <span className="flex shrink-0 items-center gap-4">
              <button
                type="button"
                onClick={cancel}
                className="min-h-11 rounded px-1 text-sm text-muted underline-offset-4 transition-colors duration-200 ease-out hover:text-text hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                Cancel
              </button>
              <button type="button" onClick={save} disabled={saving} className={PRIMARY}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
