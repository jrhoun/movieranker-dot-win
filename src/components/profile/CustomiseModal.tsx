"use client";

import { useEffect, useRef, useState } from "react";
import { posterAvatarId, posterAvatarTmdbId, syntheticPosterAvatar } from "@/lib/cosmetics/avatars";
import { itemsForSlot, SLOTS } from "@/lib/cosmetics/catalogue";
import { claimAllowance } from "@/lib/cosmetics/claims";
import type { CosmeticItem, Slot, TaglineItem } from "@/lib/cosmetics/types";
import type { Equipped } from "@/lib/cosmetics/equipped";
import { patchShowcase } from "@/lib/public-profile";
import { labelFor, unlockLabel } from "@/lib/cosmetics/labels";
import ProfileCanvas from "./ProfileCanvas";
import SlotPreview from "./SlotPreview";

const SLOT_LABEL: Record<Slot, string> = {
  avatar: "Avatar",
  frame: "Frame",
  background: "Background",
  overlay: "Overlay",
  tagline: "Tagline",
};

/** Slot order in the tab strip: the things people change most, first. */
const TAB_ORDER: Slot[] = ["avatar", "frame", "background", "overlay", "tagline"];

const POSTER = "https://image.tmdb.org/t/p/w185";

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
    <div className="mt-6 border-t border-white/10 pt-4">
      <h3 className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text/70">
          Claim a film poster
        </span>
        <span className="text-[11px] tabular-nums text-muted">
          {remaining} claim{remaining === 1 ? "" : "s"} left
        </span>
      </h3>

      <p className="mt-1 text-[10px] leading-tight text-muted">
        {remaining > 0
          ? "A poster from one of your finished rankings, yours to wear. Claims are permanent — you earn another every level."
          : "You have spent every claim. Each level up earns another."}
      </p>

      {error && (
        <p className="mt-2 text-[11px] text-gold" role="status">
          {error}
        </p>
      )}

      {unclaimed.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted">Every film you have ranked is already claimed.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
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
                  className={`flex w-full flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                    isPending ? "bg-gold/15 ring-1 ring-gold" : "hover:bg-surface-raised"
                  } ${remaining === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="block h-[54px] w-9 shrink-0 overflow-hidden rounded-sm bg-surface-raised ring-1 ring-white/10">
                    {film.posterPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${POSTER}${film.posterPath}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="line-clamp-2 text-[11px] leading-tight text-text">
                    {film.title}
                  </span>
                  <span className="text-[10px] leading-tight text-gold">
                    {isPending ? (busy ? "Claiming…" : "Claim — permanent?") : "Claim"}
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
    <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-2">
      {items.map((item) => {
        const isOwned = ownedSet.has(item.id);
        const label = labelFor(item, taglineTexts);
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!isOwned}
              aria-pressed={selectedId === item.id}
              onClick={() => onChoose(item.slot, item.id)}
              title={isOwned ? label : `${label} — ${unlockLabel(item.unlock)}`}
              className={`flex w-full flex-col items-center gap-1.5 rounded-lg p-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                selectedId === item.id ? "bg-gold/15 ring-1 ring-gold" : "hover:bg-surface-raised"
              } ${isOwned ? "" : "cursor-not-allowed"}`}
            >
              {/* Dimmed, never blurred — a locked item stays readable. */}
              <span className={isOwned ? "" : "opacity-40"}>
                <SlotPreview item={item} posterPath={posterPathFor(item.id)} />
              </span>
              <span
                className={`text-[11px] leading-tight text-text ${
                  item.slot === "tagline" ? "italic" : ""
                }`}
              >
                {label}
              </span>
              {!isOwned && (
                <span className="text-[10px] leading-tight text-muted">
                  {unlockLabel(item.unlock)}
                </span>
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
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Slot>("avatar");
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

  const tabItems = itemsFor(tab);
  const ownedCount = tabItems.filter((i) => ownedSet.has(i.id)).length;

  const taglineSets =
    tab === "tagline"
      ? [...new Set((tabItems as TaglineItem[]).map((t) => t.set))].map((set) => ({
          set,
          items: (tabItems as TaglineItem[]).filter((t) => t.set === set) as CosmeticItem[],
        }))
      : [];

  const grid = (items: CosmeticItem[]) => (
    <Grid
      items={items}
      ownedSet={ownedSet}
      selectedId={draft[tab] ?? undefined}
      taglineTexts={taglineTexts}
      posterPathFor={posterPathFor}
      onChoose={choose}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-gold"
      >
        Customise profile
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
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-2xl ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:px-6">
            <h2
              id="customise-modal-title"
              className="font-display text-xl uppercase tracking-wider text-gold"
            >
              Customise profile
            </h2>
            <button
              type="button"
              onClick={cancel}
              className="rounded px-2 text-lg leading-none text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto p-4 sm:px-6">
            {/* The live preview: the draft, not what is stored. */}
            <ProfileCanvas
              handle={handle}
              level={level}
              equipped={draft}
              posters={posters}
              taglineText={draft.tagline ? taglineTexts[draft.tagline] : null}
            />

            <div
              role="tablist"
              aria-label="Cosmetic slots"
              className="mt-4 flex flex-wrap gap-1.5 border-b border-white/10 pb-2"
            >
              {TAB_ORDER.filter((s) => SLOTS.includes(s)).map((slot) => (
                <button
                  key={slot}
                  role="tab"
                  type="button"
                  aria-selected={tab === slot}
                  onClick={() => setTab(slot)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-2 focus-visible:outline-gold ${
                    tab === slot ? "bg-gold text-bg" : "bg-surface-raised text-muted hover:text-text"
                  }`}
                >
                  {SLOT_LABEL[slot]}
                </button>
              ))}
            </div>

            <p className="mt-2 text-[11px] tabular-nums text-muted">
              {ownedCount} of {tabItems.length} unlocked
            </p>

            {/*
              Taglines are split by set. There are 88 of them, and one flat
              grid is a list to scroll past rather than a collection to browse.
              Every other slot has few enough items to show at once.
            */}
            {tab === "tagline"
              ? taglineSets.map(({ set, items }) => (
                  <div key={set} className="mt-4">
                    <h3 className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text/70">
                      <span>{set}</span>
                      <span className="tabular-nums text-muted">
                        {items.filter((i) => ownedSet.has(i.id)).length} of {items.length}
                      </span>
                    </h3>
                    {grid(items)}
                  </div>
                ))
              : grid(tabItems)}

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

          <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4 sm:px-6">
            <span className="text-[11px] text-muted" role="status">
              {error ?? "Nothing is saved until you save."}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={cancel}
                className="rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-gold px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-bg transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </span>
          </div>
        </div>
      </dialog>
    </>
  );
}
