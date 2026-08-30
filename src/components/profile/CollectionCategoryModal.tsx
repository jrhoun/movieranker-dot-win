"use client";

import { useEffect, useRef, useState } from "react";
import type { CosmeticItem } from "@/lib/cosmetics/types";
import { labelFor, unlockLabel } from "@/lib/cosmetics/labels";
import SlotPreview from "./SlotPreview";

/**
 * One collection category, as a card you open rather than a wall you scroll.
 *
 * The gallery used to render every category's full grid inline, stacked. With
 * 42 avatars and 88 taglines that is well over a hundred tiles below the fold
 * of a page that also carries a profile canvas, a level banner, an achievement
 * board and a list of rankings — the collection stopped reading as a wardrobe
 * and started reading as a wall. The counts and a few faces answer "how am I
 * doing"; the full grid answers "what exactly is left", and only the second
 * question needs the space.
 *
 * The grid is mounted ONLY while the dialog is open. The item data ships with
 * the page either way, but a closed category costs no DOM — which is what
 * keeps eight of these cheaper than the one stack they replace.
 */

/**
 * Hoisted to module scope deliberately. A component defined inside the body of
 * another is a new type on every render, so React unmounts and remounts its
 * whole subtree — `react-hooks/static-components` fails the build over it, and
 * it already caught this exact mistake once in the customise modal.
 */
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

  // A tagline has no art — SlotPreview returns null for it by design. So it
  // reads as a line of text with its price beside it, not as a captioned tile
  // with an empty box on top.
  if (item.slot === "tagline") {
    return (
      <li
        className={`flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 ${
          owned ? "bg-surface-raised/60" : "bg-transparent"
        }`}
      >
        <span className={`text-xs italic leading-snug ${owned ? "text-text" : "text-text/60"}`}>
          {label}
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted">
          {owned ? "" : unlockLabel(item.unlock)}
        </span>
      </li>
    );
  }

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
      <span className="text-[11px] font-medium leading-tight text-text">{label}</span>
      {!owned && (
        <span className="text-[10px] leading-tight text-muted">{unlockLabel(item.unlock)}</span>
      )}
    </li>
  );
}

export default function CollectionCategoryModal({
  title,
  items,
  owned,
  posterPaths,
  taglineTexts,
}: {
  title: string;
  items: CosmeticItem[];
  /** Ids the viewer owns. An array, not a Set — this crosses to the client. */
  owned: string[];
  /** Poster path per poster-avatar id. Plain object so it serializes. */
  posterPaths?: Record<string, string | null>;
  taglineTexts?: Record<string, string>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  // showModal() puts the dialog in the top layer, which brings Escape, a focus
  // trap, focus restoration and ::backdrop with it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const ownedSet = new Set(owned);
  const have = items.filter((i) => ownedSet.has(i.id)).length;
  const complete = have === items.length && items.length > 0;

  // The card's face: the first few things you actually own, because a preview
  // of padlocks tells you nothing you wanted to know. Falls back to the first
  // few items when you own none of them yet, so the card is never blank.
  const shownOwned = items.filter((i) => ownedSet.has(i.id));
  const preview = (shownOwned.length > 0 ? shownOwned : items).slice(0, 5);
  const isTagline = items[0]?.slot === "tagline";

  const titleId = `collection-${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="group flex w-full flex-col gap-2.5 rounded-xl bg-surface-raised/40 p-3.5 text-left ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-surface-raised hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text/90 group-hover:text-gold">
            {title}
          </span>
          <span
            className={`shrink-0 font-mono text-[11px] tabular-nums ${
              complete ? "text-gold" : "text-muted"
            }`}
          >
            {complete ? "✦ all" : `${have}/${items.length}`}
          </span>
        </span>

        {/* Taglines have no art at all, so a row of tiles would be a row of
            nothing. They show a real line instead — the thing being collected. */}
        {isTagline ? (
          <span className="line-clamp-2 text-[11px] italic leading-snug text-muted">
            {preview
              .map((i) => labelFor(i, taglineTexts ?? {}))
              .slice(0, 2)
              .join(" · ")}
          </span>
        ) : (
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {preview.map((i) => (
              <SlotPreview
                key={i.id}
                item={i}
                posterPath={posterPaths?.[i.id]}
              />
            ))}
          </span>
        )}

        <span className="text-[10px] uppercase tracking-wider text-muted group-hover:text-gold/80">
          {complete ? "Browse set →" : `${items.length - have} still to earn →`}
        </span>
      </button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="m-auto w-full max-w-2xl bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      >
        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-surface shadow-2xl ring-1 ring-white/10">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:px-6">
            <div>
              <h2
                id={titleId}
                className="font-display text-xl uppercase tracking-wider text-gold"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {have} of {items.length} unlocked
                {!complete && " — each locked item says what it asks for"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="min-h-9 shrink-0 rounded-full px-3 text-sm text-muted transition-colors duration-200 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-gold"
            >
              ✕
            </button>
          </div>

          {/* Mounted only while open: a closed category costs no DOM.

              Taglines get a single column because a tagline is a sentence, not
              a chip — laid out in 76px art-sized cells they wrap to four words
              a line and stop being readable as lines. */}
          {open && (
            <ul
              className={`gap-2 overflow-y-auto p-4 sm:px-6 ${
                isTagline
                  ? "flex flex-col"
                  : "grid grid-cols-[repeat(auto-fill,minmax(76px,1fr))]"
              }`}
            >
              {items.map((item) => (
                <Tile
                  key={item.id}
                  item={item}
                  owned={ownedSet.has(item.id)}
                  posterPath={posterPaths?.[item.id]}
                  taglineText={taglineTexts?.[item.id]}
                />
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
