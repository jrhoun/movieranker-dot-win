"use client";

import { useEffect, useRef, useState } from "react";
import Tabs from "./Tabs";
import type { TmdbCompany, TmdbMovieCredit, TmdbPerson } from "@/lib/tmdb";
import { rangeIndices } from "@/lib/tray";
import MoviePosterCard from "./MoviePosterCard";

type Mode = "person" | "company" | "keyword" | "title";

const MODES: { id: Mode; label: string; placeholder: string }[] = [
  { id: "title", label: "Title", placeholder: "Search movies by title…" },
  { id: "person", label: "Person", placeholder: "Search a director or actor…" },
  { id: "company", label: "Studio", placeholder: "Search a studio… e.g. A24" },
  { id: "keyword", label: "Keyword", placeholder: "Search movies by title or theme…" },
];

const TWO_STEP: Partial<Record<Mode, string>> = { person: "people", company: "studios" };

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
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
  isSelected,
}: {
  onPick: (m: TmdbMovieCredit) => void;
  onAddAll: (movies: TmdbMovieCredit[]) => void;
  isSelected: (m: TmdbMovieCredit) => boolean;
}) {
  const [mode, setMode] = useState<Mode>("title");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [ref, setRef] = useState<{ id: number; name: string } | null>(null);
  const [names, setNames] = useState<(TmdbPerson | TmdbCompany)[]>([]);
  const [movies, setMovies] = useState<TmdbMovieCredit[]>([]);
  const [loading, setLoading] = useState(false);
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
      {/* mode tabs */}
      <div className="flex flex-wrap gap-2">
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
            {/* results header: "Add all" is a secondary action under the search itself */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <p aria-live="polite" className="text-sm text-muted">
                {movies.length} result{movies.length === 1 ? "" : "s"}
              </p>
              <button
                type="button"
                onClick={() => onAddAll(movies)}
                disabled={movies.every(isSelected)}
                title={movies.every(isSelected) ? "All results are already on your list" : undefined}
                className="min-h-11 rounded-full bg-surface-raised px-4 text-sm font-medium text-text ring-1 ring-white/10 transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-muted"
              >
                Add all {movies.length}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {movies.map((mv, i) => (
                <MoviePosterCard
                  key={mv.tmdbId}
                  movie={mv}
                  selected={isSelected(mv)}
                  onSelect={(e) => handleSelect(mv, i, e)}
                />
              ))}
            </div>
          </div>
        ) : debouncedQ.trim() || ref ? (
          <p className="py-8 text-center text-sm text-muted">Nothing found. Try another search.</p>
        ) : null}
      </div>
    </section>
  );
}
