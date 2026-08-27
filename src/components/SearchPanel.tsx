"use client";

import { useEffect, useRef, useState } from "react";
import Tabs from "./Tabs";
import type { TmdbCompany, TmdbMovieCredit, TmdbPerson } from "@/lib/tmdb";
import { rangeIndices } from "@/lib/tray";
import { filterByTitle, sortMovies, type BrowseSortOption } from "@/lib/search-filter";
import MoviePosterCard from "./MoviePosterCard";

type Mode = "title" | "director" | "actor" | "company" | "keyword";

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: "title", label: "Title", placeholder: "Search movies by title…" },
  { id: "director", label: "Director", placeholder: "Search a director… e.g. Spielberg, Nolan, Gerwig" },
  { id: "actor", label: "Actor / Actress", placeholder: "Search an actor… e.g. Tom Hanks, Zendaya, DiCaprio" },
  { id: "company", label: "Studio", placeholder: "Search a studio… e.g. A24, Marvel, Pixar" },
  { id: "keyword", label: "Keyword", placeholder: "Search movies by title or theme…" },
];

const TWO_STEP: Partial<Record<Mode, string>> = {
  director: "directors",
  actor: "actors",
  company: "studios",
};

// Inline results cap; the rest stays reachable via the Browse-all modal.
const INLINE_CAP = 20;

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [browseAll, setBrowseAll] = useState(false);
  const [showAllNames, setShowAllNames] = useState(false);
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
        setShowAllNames(false);
        setMovies([]);
        setLoading(false);
        setSearchError(null);
        return;
      }
      try {
        setLoading(true);
        setSearchError(null);
        if (ref) {
          // credits for a picked person/studio
          let path = "";
          if (mode === "director") {
            path = `/api/search?mode=person-credits&ref=${ref.id}&role=director`;
          } else if (mode === "actor") {
            path = `/api/search?mode=person-credits&ref=${ref.id}&role=actor`;
          } else {
            path = `/api/search?mode=company-discover&ref=${ref.id}`;
          }
          const res = await fetch(path, { signal: ctrl.signal });
          if (!res.ok) throw new Error("Search service failed");
          const data = await res.json();
          setMovies((data.results ?? []) as TmdbMovieCredit[]);
          setNames([]);
        } else {
          // mode is a closed union — every value maps to a valid API mode
          const res = await fetch(
            `/api/search?mode=${mode}&q=${encodeURIComponent(query)}`,
            { signal: ctrl.signal },
          );
          if (!res.ok) throw new Error("Search service failed");
          const data = await res.json();
          if (TWO_STEP[mode]) {
            setNames((data.results ?? []) as (TmdbPerson | TmdbCompany)[]);
            setShowAllNames(false);
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
          setSearchError("Movie database temporarily unavailable. Tap retry to reconnect.");
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
    setShowAllNames(false);
    setNames([]);
    setMovies([]);
    setSearchError(null);
  }

  function pickRef(n: TmdbPerson | TmdbCompany) {
    setShowAllNames(false);
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
        Search any director, actor, studio, or movie — tap posters to start building your list.
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
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Select {mode === "director" ? "a director" : mode === "actor" ? "an actor" : "a studio"} to view films:
              </p>
              <span className="text-xs text-muted">
                {names.length} match{names.length === 1 ? "" : "es"}
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-2.5">
              {(showAllNames ? names : names.slice(0, 6)).map((n) => {
                const isCompany = "origin_country" in n || "movieCount" in n;
                const company = isCompany ? (n as TmdbCompany) : null;
                const person = !isCompany ? (n as TmdbPerson) : null;
                const knownForTitles = person?.known_for
                  ?.map((k) => k.title || k.name)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(", ");

                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => pickRef(n)}
                      className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-lg bg-surface p-3 text-left ring-1 ring-white/10 transition-all duration-200 ease-out hover:bg-surface-raised hover:ring-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.99]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text transition-colors group-hover:text-gold">
                          {n.name}
                        </p>
                        {person && (
                          <p className="mt-0.5 text-xs text-muted">
                            {person.known_for_department ?? "Film credit"}
                            {knownForTitles && ` · ${knownForTitles}`}
                          </p>
                        )}
                        {company && company.origin_country && (
                          <p className="mt-0.5 text-xs text-muted">
                            Studio · {company.origin_country}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {company?.movieCount !== undefined && (
                          <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-gold ring-1 ring-gold/30">
                            {company.movieCount} movies
                          </span>
                        )}
                        <span
                          aria-hidden="true"
                          className="text-xs text-muted transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:text-gold"
                        >
                          →
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            {names.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllNames((v) => !v)}
                className="mt-3 min-h-11 w-full rounded bg-surface-raised px-4 text-xs font-medium uppercase tracking-wider text-muted ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {showAllNames
                  ? "Show top 6 only ↑"
                  : `Show all ${names.length} matching ${TWO_STEP[mode] ?? "results"} ↓`}
              </button>
            )}
          </div>
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
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
        ) : searchError ? (
          <div className="rounded-lg bg-accent-red/10 border border-accent-red/30 p-4 text-center">
            <p className="text-xs font-semibold text-accent-red">{searchError}</p>
            <button
              type="button"
              onClick={() => {
                setDebouncedQ("");
                setTimeout(() => setDebouncedQ(q), 10);
              }}
              className="mt-2.5 inline-flex min-h-9 items-center rounded-full bg-accent-red/20 px-4 text-xs font-bold uppercase tracking-wider text-accent-red ring-1 ring-accent-red/40 hover:bg-accent-red/30"
            >
              Retry Search ↺
            </button>
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
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Ref keeps the trap stable even though the parent passes an inline onClose.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const selectedCount = movies.filter(isSelected).length;
  // Client-side filter over the same source array; empty query shows everything.
  const [filterQ, setFilterQ] = useState("");
  const [sort, setSort] = useState<BrowseSortOption>("year-desc");
  // Progressive batch render: cap initial requests so the modal never fires 100+
  // concurrent TMDB fetches; auto-loads next chunk on scroll.
  const BATCH = 30;
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const shown = filterByTitle(movies, filterQ);
  const sorted = sortMovies(shown, sort);
  const visible = sorted.slice(0, visibleCount);

  // Lazy load more results as user scrolls down towards the sentinel
  useEffect(() => {
    if (shown.length <= visibleCount) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH, shown.length));
        }
      },
      { root: null, rootMargin: "300px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown.length, visibleCount]);

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
        panelRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled]), input:not([disabled])"),
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
        className="animate-celebrate relative flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface shadow-2xl ring-1 ring-white/10 xl:max-w-4xl 2xl:max-w-5xl"
      >
        {/* Header/footer are static flex siblings of the scrolling grid, so they
            stay pinned while the posters scroll. Header holds filter, sort, count and close. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <div className="relative min-w-[12rem] flex-1">
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
          <div className="flex items-center gap-2">
            <label htmlFor="browse-sort" className="sr-only">
              Sort results
            </label>
            <select
              id="browse-sort"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as BrowseSortOption);
                setVisibleCount(BATCH);
              }}
              className="min-h-11 rounded bg-surface-raised px-3 text-sm text-text ring-1 ring-white/10 transition-shadow duration-200 ease-out hover:ring-white/20 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent"
            >
              <option value="year-desc">Year: Newest first</option>
              <option value="year-asc">Year: Oldest first</option>
              <option value="title-asc">Title: A → Z</option>
              <option value="title-desc">Title: Z → A</option>
              <option value="relevance">Search relevance</option>
            </select>
          </div>
          <p aria-live="polite" className="shrink-0 text-sm tabular-nums text-muted">
            {shown.length} result{shown.length === 1 ? "" : "s"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-11 shrink-0 items-center justify-center rounded text-muted transition-colors duration-200 ease-out hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ✕
          </button>
        </div>
        {/* auto-rows-min: the overflow-y-auto scroller breaks Chromium's intrinsic row
            sizing for aspect-ratio poster heights (rows collapse to min-h-11 and posters
            spill over each row below); min-content rows size correctly. */}
        <div className="thin-scrollbar grid auto-rows-min flex-1 content-start grid-cols-2 gap-5 overflow-y-auto p-6 sm:grid-cols-3 md:grid-cols-4">
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
            <div
              ref={sentinelRef}
              className="col-span-full py-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-muted"
            >
              <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-muted border-t-gold" />
              <span>Loading more films… ({shown.length - visibleCount} remaining)</span>
            </div>
          )}
          {shown.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted">
              No results match “{filterQ.trim()}”.
            </p>
          )}
        </div>
        <footer className="flex min-h-11 items-center justify-between gap-3 border-t border-white/10 px-5 py-2">
          <p aria-live="polite" className="text-sm font-medium text-muted">
            {selectedCount} selected
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full bg-surface-raised px-5 text-xs font-bold uppercase tracking-wider text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            Done / Close
          </button>
        </footer>
      </div>
    </div>
  );
}
