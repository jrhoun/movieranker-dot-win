"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { extractListId } from "@/lib/versus";

const emptySubscribe = () => () => {};

export default function CompareModal({
  listId,
  listTitle,
}: {
  listId: string;
  listTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    const t = setTimeout(() => inputRef.current?.focus(), 50);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const id = extractListId(value);
    if (!id) {
      setError("Paste a movieranker.win list link or list ID.");
      return;
    }
    if (id === listId) {
      setError("That's this very ranking — pick a friend's list to compare against.");
      return;
    }
    setOpen(false);
    router.push(`/compare/${listId}/${id}`);
  }

  const modalMarkup = open && isClient ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pt-16 sm:pt-20 bg-black/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-surface/95 p-6 shadow-2xl ring-1 ring-gold/40 backdrop-blur-md animate-sheet-up">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close compare dialog"
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/5 text-muted transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 text-gold">
          <span aria-hidden="true">✦</span>
          <span className="font-display text-xs font-bold uppercase tracking-widest">
            Head-to-Head
          </span>
        </div>

        <h2
          id="compare-modal-title"
          className="mt-1 font-display text-2xl uppercase tracking-wide text-text"
        >
          Compare Rankings
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
          Pick a friend&apos;s ranking to put next to{" "}
          <span className="font-semibold text-text">{listTitle}</span> — see
          compatibility score, shared favorites, and where your tastes collide.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <div>
            <label
              htmlFor="compare-list-input"
              className="block text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Paste their list link or ID
            </label>
            <input
              id="compare-list-input"
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              placeholder="movieranker.win/l/… or list ID"
              autoComplete="off"
              className="mt-1.5 min-h-11 w-full rounded-xl bg-surface-raised px-3.5 text-sm text-text placeholder:text-muted ring-1 ring-white/15 focus-visible:outline-2 focus-visible:outline-gold"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-medium text-accent-red">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-10 rounded-full px-4 text-xs font-medium text-muted transition-colors hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-gold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-full bg-gold px-5 text-xs font-bold uppercase tracking-wider text-bg shadow-md transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98]"
            >
              Compare Lists →
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-8 items-center rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-gold active:scale-[0.98]"
      >
        Compare
      </button>

      {isClient && modalMarkup ? createPortal(modalMarkup, document.body) : null}
    </>
  );
}
