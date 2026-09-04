# Explorer M1-2 Implementation Plan: TMDB Movie Tagline Pipeline & Win Streak Tracking with Gold Laurel Badge

## Executive Summary
This document specifies the end-to-end architecture, implementation plan, and test designs for two core features of **Milestone 1 (Tactile Matchup Dueling & Stage Focus)**:
1. **TMDB Movie Tagline Pipeline**: Exposing `tagline` across TMDB API fetching, in-memory ranking/session representations, Supabase schema / API serialization, and displaying it below poster cards in `MatchupStage.tsx` in italic Premiere typography.
2. **Win Streak Tracking & Gold Laurel Badge**: Pure helper module `src/lib/streak.ts` with backward-traversing `getMovieWinStreak(history, tmdbId)`, rendering an understated gold laurel badge above poster cards in `MatchupStage.tsx` when `streak >= 3`, and comprehensive Vitest test coverage in `src/lib/streak.test.ts`.

---

## 1. TMDB Movie Tagline Pipeline

### 1.1 Problem Analysis & Call Chain
- **Current State**:
  - `TmdbMovieCredit` in `src/lib/tmdb.ts:21-26` defines `tmdbId`, `title`, `posterPath`, and `releaseYear`. It does not define `tagline`.
  - `TmdbRawCredit` in `src/lib/tmdb.ts:30-39` and `toCredit()` in `src/lib/tmdb.ts:57-64` drop `tagline` from upstream TMDB responses.
  - `RankedMovie` in `src/lib/ranking.ts:1-9` defines `tmdbId`, `title`, `posterPath`, `releaseYear`, `elo`, `comparisons`, and `parked`, lacking `tagline`.
  - `MovieInput` in `src/lib/lists-api.ts:5-14`, `fullMovieRow()` in `src/lib/lists-api.ts:145-157`, and `moviePatchRow()` in `src/app/api/lists/[id]/route.ts:25-35` omit `tagline`.
  - `supabase/schema.sql:12-18` defines `list_movies` without a `tagline` column.
  - `src/components/MatchupStage.tsx:8-102` renders only the movie title and release year/TMDB link under each poster card.
- **Desired Flow**:
  1. TMDB `/movie/{id}` returns `{ "tagline": "..." }` for individual movie lookups (used in `getMovieById`).
  2. `toCredit` shapes `tagline?: string | null` (normalizing whitespace and empty strings to `null`).
  3. `hero-posters.ts` and `home-client.tsx` preserve `tagline` when converting credits to `RankedMovie`.
  4. `MatchupStage.tsx` renders `tagline` if non-empty below the movie title in italic Premiere styling.
  5. Supabase `list_movies` table and `save_list` RPC accommodate `tagline` for persistent drafts/done lists.

---

### 1.2 Proposed Changes by File

#### A. `src/lib/tmdb.ts`
1. Update `TmdbMovieCredit`:
```typescript
export interface TmdbMovieCredit {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  tagline?: string | null;
}
```
2. Update `TmdbRawCredit`:
```typescript
interface TmdbRawCredit {
  id: number;
  media_type?: string;
  popularity?: number;
  title?: string;
  poster_path?: string | null;
  release_date?: string | null;
  job?: string;
  department?: string;
  tagline?: string | null;
}
```
3. Update `toCredit()`:
```typescript
function toCredit(m: TmdbRawCredit): TmdbMovieCredit {
  const cleanTagline = m.tagline?.trim();
  return {
    tmdbId: m.id,
    title: m.title ?? "",
    posterPath: m.poster_path ?? null,
    releaseYear: m.release_date ? Number(m.release_date.slice(0, 4)) : null,
    tagline: cleanTagline ? cleanTagline : null,
  };
}
```

#### B. `src/lib/ranking.ts`
1. Update `RankedMovie`:
```typescript
export interface RankedMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  tagline?: string | null;
  elo: number;
  comparisons: number;
  parked: boolean;
}
```

#### C. `src/app/(site)/home-client.tsx`
Update `begin()` mapping from source candidates to `RankedMovie`:
```typescript
    const source = curated ? tonight.movies : candidates;
    const movies: RankedMovie[] = source.map((m) => ({
      tmdbId: m.tmdbId,
      title: m.title,
      posterPath: m.posterPath,
      releaseYear: m.releaseYear,
      tagline: m.tagline ?? null,
      elo: 1000,
      comparisons: 0,
      parked: false,
    }));
```

#### D. `src/lib/lists-api.ts`
1. Update `MovieInput`:
```typescript
export interface MovieInput {
  tmdbId: number;
  title?: string;
  posterPath?: string | null;
  releaseYear?: number | null;
  tagline?: string | null;
  elo?: number;
  comparisons?: number;
  parked?: boolean;
  finalRank?: number | null;
}
```
2. Update `fetchResumableList`:
```typescript
  const { data: rows } = await supabase
    .from("list_movies")
    .select("tmdb_id,title,poster_path,release_year,tagline,elo,comparisons,parked")
    .eq("list_id", id);
  const movies = ((rows ?? []) as Record<string, unknown>[]).map((r) => ({
    tmdbId: r.tmdb_id as number,
    title: r.title as string,
    posterPath: (r.poster_path as string | null) ?? null,
    releaseYear: (r.release_year as number | null) ?? null,
    tagline: (r.tagline as string | null) ?? null,
    elo: r.elo as number,
    comparisons: r.comparisons as number,
    parked: Boolean(r.parked),
  }));
```
3. Update `fullMovieRow`:
```typescript
export function fullMovieRow(m: MovieInput, listId: string) {
  return {
    list_id: listId,
    tmdb_id: m.tmdbId,
    title: m.title!,
    poster_path: m.posterPath ?? null,
    release_year: m.releaseYear ?? null,
    tagline: m.tagline ?? null,
    elo: m.elo ?? 1000,
    comparisons: m.comparisons ?? 0,
    parked: m.parked ?? false,
    final_rank: m.finalRank ?? null,
  };
}
```

#### E. `src/app/api/lists/[id]/route.ts`
Update `moviePatchRow`:
```typescript
function moviePatchRow(m: MovieInput) {
  const row: Record<string, unknown> = {};
  if (m.title !== undefined) row.title = m.title;
  if (m.posterPath !== undefined) row.poster_path = m.posterPath;
  if (m.releaseYear !== undefined) row.release_year = m.releaseYear;
  if (m.tagline !== undefined) row.tagline = m.tagline;
  if (m.elo !== undefined) row.elo = m.elo;
  if (m.comparisons !== undefined) row.comparisons = m.comparisons;
  if (m.parked !== undefined) row.parked = m.parked;
  if (m.finalRank !== undefined) row.final_rank = m.finalRank;
  return row;
}
```

#### F. `src/lib/list-view.ts`
Update `ListMovieRow`:
```typescript
export interface ListMovieRow {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  tagline?: string | null;
  comparisons: number;
  finalRank: number | null;
}
```

#### G. `supabase/schema.sql` (and Supabase Migrations)
1. Add `tagline text` to `list_movies` table definition:
```sql
create table list_movies (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  tmdb_id int not null, title text not null, poster_path text, release_year int,
  tagline text,
  elo real not null default 1000, comparisons int not null default 0,
  parked boolean not null default false, final_rank int
);
```
2. Update `save_list` function:
```sql
create or replace function save_list(
  p_id text, p_title text, p_description text,
  p_participants text[], p_status text, p_movies jsonb
) returns void
language plpgsql
security invoker
as $$
begin
  insert into lists (id, owner_id, title, description, participants, status)
  values (p_id, auth.uid(), p_title, p_description, p_participants, p_status);

  insert into list_movies
    (list_id, tmdb_id, title, poster_path, release_year, tagline, elo, comparisons, parked, final_rank)
  select
    p_id, tmdb_id, title, poster_path, release_year, tagline,
    coalesce(elo, 1000), coalesce(comparisons, 0),
    coalesce(parked, false), final_rank
  from jsonb_to_recordset(p_movies) as x(
    tmdb_id int, title text, poster_path text, release_year int, tagline text,
    elo real, comparisons int, parked boolean, final_rank int
  );
end;
$$;
```

---

## 2. Win Streak Tracking & Gold Laurel Badge

### 2.1 Problem Analysis & Mathematical Semantics
- **Session History Model**:
  - `PlaySession.history` in `src/lib/session.ts:20` is an array of pairs: `Array<[number, number]>` where each element is `[winnerId, loserId]`.
  - When `applyVote(s, winnerId, loserId)` is called, the new vote is appended to the end of `history`:
    `history = [...(s.history ?? []), [winnerId, loserId]]`.
  - Thus, `history` is sorted in ascending chronological order (index 0 is the first vote; index `length - 1` is the most recent vote).
- **Streak Definition**:
  - A movie's *current consecutive win streak* is the number of consecutive matchups involving that movie that resulted in a win for that movie, counted backwards from the most recent vote.
  - **Involvement rule**: Matchups in `history` between two *unrelated* movies (where neither winner nor loser is `tmdbId`) do NOT affect or break `tmdbId`'s streak.
  - **Loss rule**: The moment a matchup is encountered where `loserId === tmdbId`, the streak is broken, and traversal terminates immediately (`break`).
  - **Win rule**: Each matchup encountered where `winnerId === tmdbId` increments `streak` by 1.
  - **Threshold**: When `streak >= 3`, the gold laurel badge is activated.

---

### 2.2 Helper Module: `src/lib/streak.ts`
Create `src/lib/streak.ts` with the following implementation:

```typescript
/**
 * Win streak calculation pure helpers for duel matchups.
 */

export const STREAK_LAUREL_THRESHOLD = 3;

/**
 * Calculates current consecutive wins for a movie by traversing session history backwards.
 * Unrelated matchups between other movies are ignored.
 * Traversal stops at the first loss for this movie.
 */
export function getMovieWinStreak(
  history: ReadonlyArray<readonly [number, number]> | undefined | null,
  tmdbId: number,
): number {
  if (!history || history.length === 0) return 0;
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const [winnerId, loserId] = history[i];
    if (winnerId === tmdbId) {
      streak++;
    } else if (loserId === tmdbId) {
      break;
    }
  }
  return streak;
}

/**
 * Returns true when a movie's current win streak qualifies for the gold laurel badge.
 */
export function hasLaurelBadge(streak: number): boolean {
  return streak >= STREAK_LAUREL_THRESHOLD;
}
```

---

## 3. UI Implementation in `src/components/MatchupStage.tsx`

### 3.1 Design Principles & Typography (Premiere Night Aesthetic)
1. **Gold Laurel Badge**:
   - Placed directly above the poster card button in `Side`.
   - Shown ONLY when `streak >= 3`.
   - Rendered with vintage cinema laurel branches (classic film festival laurels / Cannes / Sundance laurel wreath look) and `{streak} Win Streak` (or `{streak} in a Row`).
   - Styled with subtle gold accents: `bg-gold/10 text-gold ring-1 ring-gold/30 shadow-[0_0_12px_rgba(245,197,24,0.15)]`.
   - Restrained, classy animation: `animate-fade-in` or static, avoiding arcade/flashing clutter.
2. **Movie Tagline**:
   - Rendered below the movie title link and above the release year / TMDB link.
   - Formatted in quotes: `&ldquo;{movie.tagline}&rdquo;`.
   - Typography: `italic font-serif text-xs sm:text-sm text-muted/90 leading-snug line-clamp-2 max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center`.
   - Only rendered when `movie.tagline` exists and contains non-whitespace text.

### 3.2 Component Code Structure for `src/components/MatchupStage.tsx`

```tsx
"use client";

import type { RankedMovie } from "@/lib/ranking";
import { getMovieWinStreak } from "@/lib/streak";
import { tmdbMovieUrl } from "@/lib/tmdb";

const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function LaurelIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-2.48 0-4.5-2.02-4.5-4.5S8.52 7.5 11 7.5c.34 0 .66.04.97.11-.29.58-.47 1.22-.47 1.89 0 2.21 1.79 4 4 4 .67 0 1.31-.18 1.89-.47.07.31.11.63.11.97 0 2.48-2.02 4.5-4.5 4.5z" />
    </svg>
  );
}

function LaurelBranchLeft({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.8 1.2c-.3 1.6-1.3 3.2-2.8 4-1.2.6-2.6.7-3.8.3.4 1.4 1.3 2.5 2.6 3 .3.1.6.2.9.2-1.6.8-2.6 2.3-2.8 4 1.4-.2 2.6-.9 3.4-2 .2-.3.4-.6.5-1-.2 1.5.3 3.1 1.4 4.1.3-.8.4-1.7.3-2.6 0-.8-.3-1.6-.7-2.3 1.1-.9 1.8-2.3 1.9-3.7-.6.4-1.3.6-2 .6-.6 0-1.2-.2-1.7-.6 1.4-.9 2.2-2.4 2.1-4z" />
    </svg>
  );
}

function LaurelBranchRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8.2 1.2c.3 1.6 1.3 3.2 2.8 4 1.2.6 2.6.7 3.8.3-.4 1.4-1.3 2.5-2.6 3-.3.1-.6.2-.9.2 1.6.8 2.6 2.3 2.8 4-1.4-.2-2.6-.9-3.4-2-.2-.3-.4-.6-.5-1 .2 1.5-.3 3.1-1.4 4.1-.3-.8-.4-1.7-.3-2.6 0-.8.3-1.6.7-2.3-1.1-.9-1.8-2.3-1.9-3.7.6.4 1.3.6 2 .6.6 0 1.2-.2 1.7-.6-1.4-.9-2.2-2.4-2.1-4z" />
    </svg>
  );
}

function Side({
  movie,
  otherId,
  position,
  streak,
  settlingLoserId,
  onVote,
  onPark,
}: {
  movie: RankedMovie;
  otherId: number;
  position: "left" | "right";
  streak: number;
  settlingLoserId: number | null;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  const isLosing = settlingLoserId === movie.tmdbId;
  const isWinning = settlingLoserId !== null && settlingLoserId === otherId;

  let animClass = "";
  if (isWinning) {
    animClass = position === "left" ? "animate-hit-right" : "animate-hit-left";
  } else if (isLosing) {
    animClass = position === "left" ? "animate-recoil-left" : "animate-recoil-right";
  }

  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-2 sm:gap-3 transition-transform duration-200 ease-out ${animClass}`}
      aria-hidden={isLosing}
    >
      {/* Laurel Badge indicator for 3+ win streaks */}
      <div className="h-6 flex items-center justify-center">
        {streak >= 3 ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold tracking-wider uppercase text-gold ring-1 ring-gold/40 shadow-[0_0_12px_rgba(245,197,24,0.18)] animate-fade-in"
            aria-label={`${movie.title} has a ${streak}-win streak`}
            title={`${movie.title} has won ${streak} consecutive matchups`}
          >
            <LaurelBranchLeft className="h-3.5 w-3.5 text-gold shrink-0" />
            <span>{streak} Win Streak</span>
            <LaurelBranchRight className="h-3.5 w-3.5 text-gold shrink-0" />
          </div>
        ) : null}
      </div>

      {/* Only the poster frame is the vote target */}
      <button
        type="button"
        onClick={() => onVote(movie.tmdbId, otherId)}
        aria-label={`Pick ${movie.title} as the winner`}
        style={{ touchAction: "manipulation" }}
        className="group mx-auto block w-fit select-none rounded-xl sm:rounded-2xl transition-transform duration-200 ease-out hover:-translate-y-2 focus:outline-none focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
        disabled={isLosing || settlingLoserId !== null}
      >
        <div
          className={`aspect-[2/3] h-[min(50svh,38vw)] sm:h-[min(56svh,34vw)] md:h-[min(62svh,32vw,620px)] lg:h-[min(68svh,30vw,720px)] overflow-hidden rounded-xl sm:rounded-2xl bg-surface ring-1 ring-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(245,197,24,0.12)] transition-all duration-200 ease-out group-hover:ring-2 group-hover:ring-gold group-focus-visible:ring-2 group-focus-visible:ring-gold group-active:ring-gold ${
            isWinning ? "animate-poster-winner ring-2 ring-gold" : ""
          }`}
        >
          {movie.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${POSTER_BASE}${movie.posterPath}`}
              alt=""
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm sm:text-base text-muted">
              {movie.title}
            </div>
          )}
        </div>
      </button>

      {/* Title */}
      <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-base sm:text-xl md:text-2xl font-bold leading-tight line-clamp-2">
        <a
          href={tmdbMovieUrl(movie.tmdbId)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${movie.title} on TMDB (opens in new tab)`}
          className="transition-colors hover:text-gold hover:underline focus-visible:outline-1 focus-visible:outline-gold"
        >
          {movie.title}
        </a>
      </p>

      {/* Tagline (when available from TMDB) */}
      {movie.tagline ? (
        <p className="w-full max-w-[15rem] sm:max-w-xs md:max-w-sm lg:max-w-md text-center text-xs sm:text-sm italic font-serif text-muted/90 leading-snug line-clamp-2 -mt-1">
          &ldquo;{movie.tagline}&rdquo;
        </p>
      ) : null}

      {/* Release Year & TMDB External Link */}
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-muted">
        <span>{movie.releaseYear ?? "—"}</span>
        <span aria-hidden="true" className="text-white/20">·</span>
        <a
          href={tmdbMovieUrl(movie.tmdbId)}
          target="_blank"
          rel="noopener noreferrer"
          title={`View ${movie.title} on TMDB (opens in new tab)`}
          className="text-xs text-muted underline decoration-gold/50 underline-offset-2 transition-colors hover:text-gold focus-visible:outline-1 focus-visible:outline-gold"
        >
          TMDB ↗
        </a>
      </div>

      {/* Haven't seen button */}
      <button
        type="button"
        onClick={() => onPark(movie.tmdbId)}
        className="mt-0.5 inline-flex min-h-9 items-center justify-center rounded-full bg-surface-raised/90 px-4 py-1 text-xs font-semibold text-text/80 ring-1 ring-white/20 transition-all duration-150 ease-out hover:bg-surface-raised hover:text-gold hover:ring-gold/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-95"
      >
        Haven&apos;t seen
      </button>
    </div>
  );
}

export default function MatchupStage({
  pair,
  history,
  settlingLoserId,
  onVote,
  onPark,
}: {
  pair: [RankedMovie, RankedMovie];
  history?: ReadonlyArray<readonly [number, number]> | null;
  settlingLoserId: number | null;
  onVote: (winnerId: number, loserId: number) => void;
  onPark: (tmdbId: number) => void;
}) {
  const [a, b] = pair;
  const streakA = getMovieWinStreak(history, a.tmdbId);
  const streakB = getMovieWinStreak(history, b.tmdbId);

  return (
    <section
      aria-label="Which movie is better?"
      className="mx-auto flex w-full max-w-6xl xl:max-w-7xl flex-1 items-center justify-center gap-3 sm:gap-10 md:gap-14 lg:gap-20 px-2 py-2 select-none"
    >
      <Side
        movie={a}
        otherId={b.tmdbId}
        position="left"
        streak={streakA}
        settlingLoserId={settlingLoserId}
        onVote={onVote}
        onPark={onPark}
      />
      <div
        aria-hidden="true"
        className="flex shrink-0 flex-col items-center gap-1 sm:gap-2 px-1 sm:px-3"
      >
        <span className="text-xs sm:text-sm text-gold/70">✦</span>
        <p className="font-display text-2xl leading-none tracking-widest text-gold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl lg:text-5xl">
          VS
        </p>
        <span className="text-xs sm:text-sm text-gold/70">✦</span>
      </div>
      <Side
        movie={b}
        otherId={a.tmdbId}
        position="right"
        streak={streakB}
        settlingLoserId={settlingLoserId}
        onVote={onVote}
        onPark={onPark}
      />
    </section>
  );
}
```

### 3.3 Wiring in `src/app/r/play/play-room.tsx`
In `src/app/r/play/play-room.tsx`:
Pass `history={session?.history}` into `<MatchupStage>`:
```tsx
<MatchupStage
  pair={pair}
  history={session?.history}
  settlingLoserId={settlingLoserId}
  onVote={handleVote}
  onPark={(id) => handleParkToggle(id, true)}
/>
```

---

## 4. Comprehensive Test Designs

### 4.1 `src/lib/streak.test.ts`
Create `src/lib/streak.test.ts` covering all edge cases:

```typescript
import { describe, expect, it } from "vitest";
import {
  getMovieWinStreak,
  hasLaurelBadge,
  STREAK_LAUREL_THRESHOLD,
} from "./streak";

describe("getMovieWinStreak", () => {
  it("returns 0 for empty or undefined history", () => {
    expect(getMovieWinStreak([], 1)).toBe(0);
    expect(getMovieWinStreak(undefined, 1)).toBe(0);
    expect(getMovieWinStreak(null, 1)).toBe(0);
  });

  it("returns 0 when the movie has never participated in any matchup", () => {
    const history: Array<[number, number]> = [
      [2, 3],
      [4, 5],
      [2, 5],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
  });

  it("returns 1 for a single win", () => {
    const history: Array<[number, number]> = [[1, 2]];
    expect(getMovieWinStreak(history, 1)).toBe(1);
    expect(getMovieWinStreak(history, 2)).toBe(0);
  });

  it("returns 0 when the movie's most recent matchup was a loss", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [3, 1], // movie 1 lost to 3
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
    expect(getMovieWinStreak(history, 3)).toBe(1);
  });

  it("returns 2 for 2 consecutive wins", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(2);
  });

  it("returns 3 for 3 consecutive wins (laurel threshold)", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
      [1, 4],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(3);
  });

  it("returns 5+ for extended win streaks", () => {
    const history: Array<[number, number]> = [
      [1, 2],
      [1, 3],
      [1, 4],
      [1, 5],
      [1, 6],
      [1, 7],
    ];
    expect(getMovieWinStreak(history, 1)).toBe(6);
  });

  it("ignores interleaved matchups between other movies", () => {
    const history: Array<[number, number]> = [
      [1, 2], // 1 win (+1)
      [3, 4], // unrelated
      [5, 6], // unrelated
      [1, 3], // 1 win (+1)
      [7, 8], // unrelated
      [1, 5], // 1 win (+1)
      [9, 10], // unrelated
    ];
    expect(getMovieWinStreak(history, 1)).toBe(3);
    expect(getMovieWinStreak(history, 9)).toBe(1);
    expect(getMovieWinStreak(history, 7)).toBe(1);
    expect(getMovieWinStreak(history, 3)).toBe(0); // lost to 1 at step 4
  });

  it("stops counting at the most recent loss even if prior wins exist", () => {
    const history: Array<[number, number]> = [
      [1, 2], // win
      [1, 3], // win
      [1, 4], // win (streak was 3)
      [5, 1], // loss! (streak resets to 0)
      [1, 6], // win (streak becomes 1)
      [1, 7], // win (streak becomes 2)
    ];
    expect(getMovieWinStreak(history, 1)).toBe(2);
  });

  it("handles alternating win/loss sequences correctly", () => {
    const history: Array<[number, number]> = [
      [1, 2], // win
      [3, 1], // loss
      [1, 4], // win
      [5, 1], // loss
    ];
    expect(getMovieWinStreak(history, 1)).toBe(0);
  });
});

describe("hasLaurelBadge", () => {
  it("returns false for streaks below threshold (0, 1, 2)", () => {
    expect(hasLaurelBadge(0)).toBe(false);
    expect(hasLaurelBadge(1)).toBe(false);
    expect(hasLaurelBadge(2)).toBe(false);
    expect(hasLaurelBadge(STREAK_LAUREL_THRESHOLD - 1)).toBe(false);
  });

  it("returns true for streaks at or above threshold (3, 4, 10)", () => {
    expect(hasLaurelBadge(3)).toBe(true);
    expect(hasLaurelBadge(4)).toBe(true);
    expect(hasLaurelBadge(10)).toBe(true);
    expect(hasLaurelBadge(STREAK_LAUREL_THRESHOLD)).toBe(true);
  });
});
```

---

### 4.2 TMDB Tagline Pipeline Unit Tests (`src/lib/tmdb.test.ts`)
Add test suite verifying tagline extraction and shaping:

```typescript
describe("tagline handling in tmdb", () => {
  it("extracts and trims tagline in toCredit when present", () => {
    const raw = {
      id: 550,
      title: "Fight Club",
      tagline: "  Mischief. Mayhem. Soap.  ",
      poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
      release_date: "1999-10-15",
    };
    const credits = shapeCredits({ cast: [raw] });
    expect(credits[0].tagline).toBe("Mischief. Mayhem. Soap.");
  });

  it("normalizes empty or whitespace-only tagline to null", () => {
    const rawEmpty = { id: 1, title: "Film A", tagline: "", release_date: "2000-01-01" };
    const rawSpaces = { id: 2, title: "Film B", tagline: "   ", release_date: "2000-01-01" };
    const rawMissing = { id: 3, title: "Film C", release_date: "2000-01-01" };

    const credits = shapeCredits({ cast: [rawEmpty, rawSpaces, rawMissing] });
    expect(credits.find((c) => c.tmdbId === 1)?.tagline).toBeNull();
    expect(credits.find((c) => c.tmdbId === 2)?.tagline).toBeNull();
    expect(credits.find((c) => c.tmdbId === 3)?.tagline).toBeNull();
  });
});
```

---

## 5. Step-by-Step Implementation & Verification Plan

### Execution Steps
1. **Create `src/lib/streak.ts`**:
   - Implement `getMovieWinStreak`, `STREAK_LAUREL_THRESHOLD`, `hasLaurelBadge`.
2. **Create `src/lib/streak.test.ts`**:
   - Run `npx vitest run src/lib/streak.test.ts` to verify pure helper behavior.
3. **Extend TMDB Types & Normalization**:
   - In `src/lib/tmdb.ts`, add `tagline?: string | null` to `TmdbMovieCredit` and `TmdbRawCredit`.
   - Update `toCredit` to clean and assign `tagline`.
   - Add tests to `src/lib/tmdb.test.ts` and verify with `npx vitest run src/lib/tmdb.test.ts`.
4. **Extend Ranking & DB Types**:
   - In `src/lib/ranking.ts`, add `tagline?: string | null` to `RankedMovie`.
   - In `src/lib/lists-api.ts`, add `tagline` to `MovieInput`, `fetchResumableList`, and `fullMovieRow`.
   - In `src/app/api/lists/[id]/route.ts`, include `tagline` in `moviePatchRow`.
   - In `src/lib/list-view.ts`, include `tagline` in `ListMovieRow`.
   - In `src/app/(site)/home-client.tsx`, map `tagline: m.tagline ?? null` in `begin()`.
5. **Enhance `src/components/MatchupStage.tsx`**:
   - Add laurel SVG icons and badge above poster cards when `streak >= 3`.
   - Add italic tagline element below movie title.
   - Accept `history?: ReadonlyArray<readonly [number, number]> | null` in `MatchupStage`.
6. **Wire `play-room.tsx`**:
   - Pass `history={session?.history}` to `<MatchupStage>`.
7. **Run Full Test Suite & Build Verification**:
   - Run `npm test` -> ensure all 298+ tests pass plus new streak and tagline tests.
   - Run `npm run build` -> ensure 0 TypeScript or ESLint errors.

---

## 6. Architecture & Security Checklist
- [x] **Local Isolation**: All changes are local and do not push to origin or touch remote repositories.
- [x] **Data Integrity**: Empty taglines normalize to `null` to avoid rendering empty quotes or awkward layout gaps.
- [x] **No Mutating History**: `getMovieWinStreak` is a pure function that performs non-destructive backward iteration without mutating the history array.
- [x] **Reduced Motion & Accessibility**:
  - Laurel badge uses subtle static/fade styling without flashing or jarring animations.
  - Laurel badge includes `aria-label` for screen readers.
  - Taglines are nested within semantically clean paragraphs with appropriate text contrast against `--bg` / `--surface`.
