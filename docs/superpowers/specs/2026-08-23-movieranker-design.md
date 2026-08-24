# movieranker.win — Design Document

**Date:** 2026-08-23
**Status:** Approved direction, pending spec review

## Purpose

movieranker.win facilitates and memorializes group movie-ranking discussions — "rank the Christopher Nolan films" at movie night. Friends build a candidate list together, settle it with head-to-head votes on a shared screen, and walk away with a permanent, shareable ranked poster wall.

**Positioning:** FlickChart ranks your life in movies (one giant lifetime personal list, account required). Shortlist ranks individual taste in an app. movieranker.win ranks *tonight's argument* — a scoped, occasion-based list built by a specific group of people in one sitting. Zero-friction guest access is core identity, not a shortcut.

## Scope

### v1 (this spec)

1. Search movies by person (actor/director/writer) or keyword via TMDB; add results to a candidate pool.
2. Head-to-head ranking session on a shared screen (pass-around voting, no logins).
3. Hybrid ranking engine: quick approximate phase → optional "sharpen" refinement.
4. Finished list page: ranked posters, participant names, one shareable link.
5. Art direction: dark cinema.

### Explicitly out of v1 (designed-for-later, built-never-yet)

- Accounts, invites, private/public profiles, social graph (Supabase Auth when built)
- Premium tier, AI-assisted list building
- Mobile apps, live multi-device voting rooms
- TV shows, other media types

## Architecture

**Stack:** Next.js (App Router) deployed on Vercel Hobby · Supabase Postgres (existing account) · TMDB API (server-side only, key never exposed to client).

```
Browser ──► Next.js (Vercel)
              ├─ Server Components / Route Handlers ──► TMDB API (cached)
              └─ Route Handlers ──► Supabase Postgres
Posters load client-side directly from TMDB CDN (image.tmdb.org) — zero bandwidth through us.
```

- **TMDB caching:** all TMDB fetches go through one server module with Next.js `revalidate` caching (searches ~5 min, movie details 24 h). Keeps us inside rate limits and fast.
- **No auth anywhere in v1.** A random list ID (nanoid) is the capability: possession of `/r/<id>` or `/l/<id>` = access.
- **Hosting costs:** $0 until genuine viral traffic (Vercel 100 GB bandwidth/mo, Supabase 500 MB DB).

## Data Model (Supabase Postgres)

Two tables. No users table in v1.

```sql
create table lists (
  id            text primary key,          -- nanoid, used in URLs
  title         text not null,             -- e.g. "Nolan Rankings"
  participants  text[] not null default '{}',  -- free-text names, editable anytime
  status        text not null default 'ranking',  -- 'ranking' | 'done'
  created_at    timestamptz not null default now()
);

create table list_movies (
  id          bigint generated always as identity primary key,
  list_id     text not null references lists(id) on delete cascade,
  tmdb_id     int not null,               -- canonical reference; details re-fetched from TMDB
  title       text not null,              -- denormalized for display resilience
  poster_path text,                       -- nullable; some TMDB entries lack posters
  release_year int,
  elo         real not null default 1000,
  comparisons int not null default 0,
  final_rank  int                         -- set once when status flips to 'done'
);
```

Votes are **not** persisted individually in v1 (`ponytail:` no `votes` table — undo/audit/analytics would need it; add then). Elo lives on `list_movies` and is updated per vote via a single route handler.

## Ranking Engine (hybrid)

**Phase 1 — Quick rank (automatic).**
Elo-style update per vote (K=32), next matchup chosen by picking the two movies whose current ratings are closest among those with the fewest recent appearances (keeps it fair-feeling and informative). Convergence check after every vote:

> The top-k ordering has been stable for the last N votes AND every adjacent pair's rating gap exceeds a threshold → declare stable.

Target: ~30–40 % fewer votes than a full sort. Progress bar shows estimated completion ("about 12 votes left"), computed from remaining instability, never a hard promise.

**Phase 2 — Sharpen (optional, user-initiated).**
Button appears when stable. Runs targeted binary-insertion comparisons that resolve only the close/uncertain adjacent pairs, tightening gaps until the user stops or nothing is within threshold. Each round shows what changed.

**Tie handling:** exact ties allowed in the displayed final order (same rank shown as tied) rather than forcing meaningless extra votes.

**Edge cases:** lists of 1–2 movies skip straight to "done". A voter can flag "haven't seen it" on either movie → matchup is replaced with a different pair; flagged pairs are avoided but the movies stay eligible against others. Undo last vote (restores prior Elo snapshot, single-level).

## Flows

**Home `/`** — big search box + short pitch. Search returns person credits (actor/director/writer via TMDB `person/{id}/combined_credits`) and keyword results. Grid of poster cards; tap adds to the candidate tray. "Start ranking" creates the list row and redirects to `/r/<id>`.

**Ranking room `/r/<id>`** — shared pass-around screen:
- Header: list title (editable), participant chips (add/remove/edit freely), progress bar.
- Body: two large poster cards side by side, tap to choose; "haven't seen it" per side; undo.
- When stable: confetti-ish moment, final order preview, "Sharpen the list" or "Finish".
- Finish → confirm → status='done', `final_rank` assigned, redirect to `/l/<id>`.

**List `/l/<id>`** — ranked poster wall, participants credited ("Ranked by Dave, Sarah & friends"), share button using native Web Share API with copy-link fallback. In-progress links (`/r/<id>`) show the same room so a friend can resume a session from any device.

**Error handling:** TMDB outage/failure → friendly retry state on search; ranking works fully offline-from-TMDB since candidates are already stored. Lost list ID → unrecoverable in v1 (no accounts); home page copy warns "bookmark your link" before leaving the ranking room.

## Art Direction — Dark Cinema

Near-black background (#0d0d10 range), warm amber/red accent, subtle film-grain texture. Poster art is the hero: cards are just posters with minimal chrome. Big bold type for titles; the two-up vote screen fills the viewport. Mobile-first responsive (pass-around device is most likely a phone). No design system framework — Tailwind defaults tuned to this palette.

## Testing

- **Engine unit tests (the real logic):** Vitest over the pure ranking functions — Elo math, convergence detection, sharpen insertion order, tie handling, haven't-seen replacement. Property-style test: feeding synthetic votes recovers a known planted ordering.
- **Route handlers:** integration tests against a throwaway Postgres (Supabase local or Docker) covering create-list, vote-update, finish-assignment.
- **UI:** manual pass on mobile viewport; no component-test framework in v1.

One runnable check ships with the engine module (`npm test`).

## Success Criteria for v1

A friend can go from URL → finished shared Nolan ranking in under 15 minutes with no signup wall, and the link still works months later.
