"use client";

import { useEffect, useRef, useState } from "react";
import Tabs from "./Tabs";
import type { TmdbCompany, TmdbMovieCredit, TmdbPerson } from "@/lib/tmdb";
import { rangeIndices } from "@/lib/tray";
import { filterByTitle } from "@/lib/search-filter";
import MoviePosterCard from "./MoviePosterCard";

type Mode = "person" | "company" | "keyword" | "title";

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: "title", label: "Title", placeholder: "Search movies by title…" },
  { id: "person", label: "Person", placeholder: "Search a director or actor…" },
  { id: "company", label: "Studio", placeholder: "Search a studio… e.g. A24" },
  { id: "keyword", label: "Keyword", placeholder: "Search movies by title or theme…" },
];

const TWO_STEP: Partial<Record<Mode, string>> = { person: "people", company: "studios" };

// Inline results cap; the rest stays reachable via the Browse-all modal.
const INLINE_CAP = 20;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[2/3] w-full rounded bg-surface" />
          <div className="mt-1.5 h-3.5 w-3/4 rounded bg-surface" />
        </div>
      ))}
    </div>
  );
}

export default function SearchPanel({
  onPick,
  onAddAll,
  onRemoveAll,
  isSelected,
}: {
  onPick: (m: TmdbMovieCredit) => void;
  onAddAll: (movies: TmdbMovieCredit[]) => void;
  onRemoveAll: (movies: TmdbMovieCredit[]) => void;
  isSelected: (m: TmdbMovieCredit) => boolean;
}) {
  const [mode, setMode] = useState<Mode>("title");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [ref, setRef] = useState<{ id: number; name: string } | null>(null);
  const [names, setNames] = useState<(TmdbPerson | TmdbCompany)[]>([]);
  const [movies, setMovies] = useState<TmdbMovieCredit[]>([]);
  const [loading, setLoading] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastClickedRef = useRef<number | null>(null);

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    lastClickedRef.current = null; // new result set: stale shift-anchor would mis-range

    const query = debouncedQ.trim();

    async function run() {
      if (!ref && !query) {
        setNames([]);
        setMovies([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        if (ref) {
          // credits for a picked person/studio
          const path =
            TWO_STEP[mode] === "people"
              ? `/api/search?mode=person-credits&ref=${ref.id}`
              : `/api/search?mode=company-discover&ref=${ref.id}`;
          const res = await fetch(path, { signal: ctrl.signal });
          const data = await res.json();
          setMovies((data.results ?? []) as TmdbMovieCredit[]);
          setNames([]);
        } else {
          // mode is a closed union — every value maps to a valid API mode
          const res = await fetch(
            `/api/search?mode=${mode}&q=${encodeURIComponent(query)}`,
            { signal: ctrl.signal },
          );
          const data = await res.json();
          if (TWO_STEP[mode]) {
            setNames((data.results ?? []) as (TmdbPerson | TmdbCompany)[]);
            setMovies([]);
          } else {
            setMovies((data.results ?? []) as TmdbMovieCredit[]);
            setNames([]);
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setMovies([]);
          setNames([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }
    run();
    return () => ctrl.abort();
  }, [debouncedQ, mode, ref]);

  function switchMode(next: Mode) {
    setMode(next);
    setRef(null);
    setNames([]);
    setMovies([]);
  }

  function pickRef(n: TmdbPerson | TmdbCompany) {
    setRef({ id: n.id, name: n.name });
  }

  function handleSelect(movie: TmdbMovieCredit, index: number, e: React.MouseEvent) {
    const last = lastClickedRef.current;
    lastClickedRef.current = index;
    if (e.shiftKey && last !== null && last !== index) {
      // shift+click adds the whole inclusive range (only movies not yet picked)
      for (const i of rangeIndices(last, index)) {
        const m = movies[i];
        if (m && !isSelected(m)) onPick(m);
      }
    } else {
      onPick(movie);
    }
  }

  const showNames = !ref && TWO_STEP[mode] !== undefined && names.length > 0;
  const showMovies = ref !== null || !TWO_STEP[mode];

  return (
    <section
      aria-label="Find movies"
      className="rounded-lg bg-surface p-4 ring-1 ring-white/10 sm:p-5"
    >
      <p className="text-sm text-muted">
        Search any actor, director, studio, or movie — tap posters to start building your list.
      </p>

      {/* mode tabs */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Tabs
          idPrefix="search-mode"
          ariaLabel="Search mode"
          options={MODES.map(({ id, label }) => ({ key: id, label }))}
          value={mode}
          onSelect={switchMode}
          tabClassName={(active) =>
            `min-h-11 rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              active
                ? "bg-accent text-bg"
                : "bg-surface text-muted hover:bg-surface-raised hover:text-text active:bg-surface"
            }`
          }
        />
      </div>

      {/* search input */}
      <div className="relative mt-3">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setRef(null);
          }}
          placeholder={MODES.find((m) => m.id === mode)?.placeholder}
          aria-label={MODES.find((m) => m.id === mode)?.placeholder}
          className="min-h-11 w-full rounded bg-surface px-4 text-text placeholder:text-muted ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
        />
        {loading && (
          <span
            aria-hidden
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-muted border-t-accent"
          />
        )}
      </div>

      {ref && (
        <button
          type="button"
          onClick={() => setRef(null)}
          className="mt-3 min-h-11 text-sm text-accent transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← not {ref.name}? back to {TWO_STEP[mode]} search
        </button>
      )}

      <p aria-live="polite" className="sr-only">
        {loading ? "Searching…" : `${movies.length || names.length} results`}
      </p>

      <div
        role="tabpanel"
        id="search-mode-panel"
        aria-labelledby={`search-mode-tab-${mode}`}
        tabIndex={0}
        className="mt-4"
      >
        {loading ? (
          <SkeletonGrid />
        ) : showNames ? (
          <ul className="flex flex-wrap gap-2">
            {names.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => pickRef(n)}
                  className="min-h-11 rounded-full bg-surface px-4 py-1 text-sm text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-surface-raised hover:ring-white/20 active:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {n.name}
                  {"origin_country" in n && (
                    <span className="ml-2 text-xs text-muted">
                      {(n as TmdbCompany).origin_country && (
                        <span className="mr-1.5 rounded bg-surface-raised px-1.5 py-0.5">
                          {(n as TmdbCompany).origin_country}
                        </span>
                      )}
                      Production company
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : showMovies && movies.length > 0 ? (
          <div>
            {/* results header: "Add all" adds the page; "Clear selection" (only
                when something here is picked) batch-removes this page's picks */}
            {(() => {
              const selectedCount = movies.filter(isSelected).length;
              return (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p aria-live="polite" className="text-sm text-muted">
                    {movies.length} result{movies.length === 1 ? "" : "s"}
                  </p>
                  <div className="flex items-center gap-4">
                    {selectedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onRemoveAll(movies)}
                        className="min-h-11 text-sm text-accent transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Clear selection ({selectedCount})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddAll(movies)}
                      disabled={selectedCount === movies.length}
                      title={selectedCount === movies.length ? "All results are already on your list" : undefined}
                      className="min-h-11 rounded-full bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted"
                    >
                      Add all {movies.length}
                    </button>
                  </div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {movies.slice(0, INLINE_CAP).map((mv, i) => (
                <MoviePosterCard
                  key={mv.tmdbId}
                  movie={mv}
                  selected={isSelected(mv)}
                  onSelect={(e) => handleSelect(mv, i, e)}
                />
              ))}
            </div>
            {movies.length > INLINE_CAP && (
              <button
                type="button"
                onClick={() => setBrowseAll(true)}
                className="mt-4 min-h-11 w-full rounded bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Browse all {movies.length} results
              </button>
            )}
          </div>
        ) : debouncedQ.trim() || ref ? (
          <p className="py-8 text-center text-sm text-muted">Nothing found. Try another search.</p>
        ) : null}
      </div>

      {browseAll && movies.length > 0 && (
        <BrowseAllModal
          movies={movies}
          isSelected={isSelected}
          onSelect={handleSelect}
          onClose={() => setBrowseAll(false)}
        />
      )}
    </section>
  );
}

/** Full-result modal over the same source array as the inline grid (selections stay in sync). */
function BrowseAllModal({
  movies,
  isSelected,
  onSelect,
  onClose,
}: {
  movies: TmdbMovieCredit[];
  isSelected: (m: TmdbMovieCredit) => boolean;
  onSelect: (m: TmdbMovieCredit, index: number, e: React.MouseEvent) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Ref keeps the trap stable even though the parent passes an inline onClose.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const selectedCount = movies.filter(isSelected).length;
  // Client-side filter over the same source array; empty query shows everything.
  const [filterQ, setFilterQ] = useState("");
  // Progressive batch render: cap initial requests so the modal never fires 100+
  // concurrent TMDB fetches; "Show more" reveals the next chunk.
  const BATCH = 30;
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const shown = filterByTitle(movies, filterQ);
  const visible = shown.slice(0, visibleCount);

  // Focus-on-open runs once; restoring focus to the trigger here covers close
  // via ✕, footer Close, overlay click, and Escape alike.
  useEffect(() => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => triggerRef.current?.focus();
  }, []);

  // Escape to close + Tab focus trap.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"),
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 transition-opacity duration-200 ease-out"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* animate-celebrate = fade/scale-in 200ms; global prefers-reduced-motion rule collapses it */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`All ${movies.length} results`}
        className="animate-celebrate relative flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl ring-1 ring-white/10"
      >
        {/* Header/footer are static flex siblings of the scrolling grid, so they
            stay pinned while the posters scroll. */}
        <div className="border-b border-white/10 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg uppercase tracking-wide text-text">
              All {movies.length} results
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-11 shrink-0 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              ✕
            </button>
          </div>
          <div className="relative mt-2">
            <input
              type="search"
              value={filterQ}
              onChange={(e) => {
                setFilterQ(e.target.value);
                setVisibleCount(BATCH);
              }}
              placeholder="Filter by title…"
              aria-label="Filter results by title"
              className="min-h-11 w-full rounded bg-surface-raised pr-10 pl-4 text-sm text-text ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            />
            {filterQ && (
              <button
                type="button"
                onClick={() => setFilterQ("")}
                aria-label="Clear filter"
                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="thin-scrollbar grid flex-1 content-start grid-cols-2 gap-4 overflow-y-auto p-5 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((mv) => (
            <MoviePosterCard
              key={mv.tmdbId}
              movie={mv}
              selected={isSelected(mv)}
              onSelect={(e) => onSelect(mv, movies.indexOf(mv), e)}
              eager
              sizeVariant="w185"
            />
          ))}
          {shown.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + BATCH)}
              className="col-span-full min-h-11 rounded bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Show more ({shown.length - visibleCount} remaining)
            </button>
          )}
          {shown.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted">
              No results match “{filterQ.trim()}”.
            </p>
          )}
        </div>
        <footer className="flex min-h-11 items-center justify-between gap-3 border-t border-white/10 px-5 py-2">
          <p aria-live="polite" className="text-sm text-muted">
            {selectedCount} selected
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
