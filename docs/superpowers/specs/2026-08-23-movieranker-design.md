# movieranker.win — Design Document

**Date:** 2026-08-23 (rev. 2)
**Status:** Approved direction, pending spec review

## Purpose

movieranker.win facilitates and memorializes movie-ranking discussions — "rank the Christopher Nolan films" at movie night, or a definitive solo ranking of every Pixar film. People build a candidate list together (or alone), settle it with head-to-head votes on a shared screen, and walk away with a permanent, shareable ranked poster wall attached to their profile. The tool is deliberately flexible: tonight's casual group debate and a carefully-curated personal canon are both first-class uses.

**Positioning:**

| Site | What it does | Where we differ |
|------|-------------|-----------------|
| FlickChart | Head-to-head builds ONE lifetime personal favorites list; account required up front; dated, browser-only | We do scoped lists (any theme, any size) built by groups in one sitting; play first, signup only at save |
| Shortlist | Mobile-native head-to-head for personal movie/TV taste | Occasion-based shared lists vs. personal taste profile |
| Letterboxd | Individual film diary: reviews, ratings, curated lists; huge social network | Letterboxd catalogs what YOU watched and loved after the fact; we settle what the group actually thinks, live, via forced pairwise choices — a different act entirely |

**Account philosophy:** zero-friction *play*, sticky *ownership*. Anyone can browse, build, and rank with no account. Saving requires one — so every list that exists on the site belongs to a real user, profiles accumulate a trophy shelf of rankings, and the save-time signup converts precisely the people who already got hooked. No orphaned floating lists, no retroactive claiming.

## Scope

### v1 (this spec)

1. Search movies via TMDB four ways: person (actor/director/writer credits), production company (e.g. A24, Disney), keyword, or exact/partial title for cherry-picking individual films. Results feed a candidate pool. Lists may be strictly themed or completely arbitrary.
2. Head-to-head ranking session designed for a **shared-screen consensus game** (one input device, social decision), no login needed to play.
3. Hybrid ranking engine: quick approximate phase → optional "sharpen" refinement.
4. **Supabase Auth accounts**, required only at save time: email + password, magic link, and OAuth (Google, Microsoft).
5. Minimal profile / "My Lists" page: saved lists, drafts and finished.
6. Finished list page: ranked posters, participants credited, public share link (viewable without login).
7. Art direction: dark cinema.

### Explicitly out of v1 (designed-for-later, built-never-yet)

- Participant accounts/invites linking friends' usernames to lists (v1 participants are free-text names)
- Private/public profile toggles, follower graph, notifications
- Premium tier, AI-assisted list building
- Mobile apps, live multi-device voting rooms
- TV shows, other media types

## Architecture

**Stack:** Next.js (App Router) deployed on Vercel Hobby · [PERSON_NAME] (existing account) for Postgres + Auth · [PERSON_NAME] server-side only, key never exposed to client.

```
Browser ──► Next.js (Vercel)
              ├─ Server Components / Route Handlers ──► TMDB API (cached)
              └─ Route Handlers ──► Supabase Postgres + Auth
Posters load client-side directly from TMDB CDN (image.tmdb.org) — zero bandwidth through us.
```

- **TMDB caching:** all TMDB fetches go through one server module with Next.js `revalidate` caching (searches ~5 min, movie details 24 h). Keeps us inside rate limits and fast.
- **Auth:** [PERSON_NAME] client-side session + server-side verification on all write routes. Anonymous in-progress sessions live in browser localStorage until saved.
- **Hosting costs:** $0 until genuine viral traffic ([PERSON_NAME] 100 GB bandwidth/mo, Supabase generous free tier incl. Auth).

## Data Model (Supabase Postgres)

```sql
-- Supabase Auth manages auth.users; our tables reference it.
create table lists (
  id            text primary key,           -- short URL-friendly nanoid
  owner_id      uuid not null references auth.users(id),
  title         text not null,
  participants  text[] not null default '{}',   -- free-text names of everyone in the room
  status        text not null default 'draft',  -- 'draft' | 'ranking' | 'done'
  created_at    timestamptz not null default now()
);

create table list_movies (
  id           bigint generated always as identity primary key,
  list_id      uuid not null references lists(id) on delete cascade,
  tmdb_id      int not null,
  title        text not null,              -- denormalized for display resilience
  poster_path  text,
  release_year int,
  elo          real not null default 1000,
  comparisons  int not null default 0,
  parked       boolean not null default false,  -- "haven't seen" parking
  final_rank   int                          -- set once when status flips to 'done'
);
```

**URL scheme:** list URLs are opaque flat IDs — `/l/<nanoid>` — never namespaced under usernames. Ownership is enforced server-side via `owner_id`; it is deliberately not expressed in the URL, so links survive username changes and don't leak handles when shared.

Votes are **not** persisted individually in v1 (`ponytail:` no `votes` table — undo uses a client-side Elo snapshot of the current matchup; audit/analytics would need it, add then). Elo lives on `list_movies`, updated per vote via an authenticated route handler. RLS: write access limited to `owner_id`; reads on `status='done'` lists are public (share links work logged-out).

## Ranking Engine (hybrid)

**Phase 1 — Quick rank (automatic).**
Elo-style update per vote (K=32), next matchup chosen as the two active movies whose ratings are closest among those with the fewest recent appearances. Convergence check after every vote:

> The top-k ordering has been stable for the last N votes AND every adjacent pair's rating gap exceeds a threshold → declare stable.
>
> (`ponytail:` N=6, gap threshold = 50 Elo points, tuned once against synthetic data; revisit only if real sessions feel wrong.)

Target: ~30–40 % fewer votes than a full sort. Progress bar shows estimated completion ("about 12 votes left"), computed from remaining instability, never a hard promise.

**Phase 2 — Sharpen (optional, user-initiated).**
Button appears when stable. Runs targeted binary-insertion comparisons resolving only close/uncertain adjacent pairs, tightening gaps until the user stops or nothing is within threshold. Each round shows what changed.

**Tie handling:** exact ties allowed in the final order (shown as tied) rather than forcing meaningless extra votes.

**Haven't-seen parking:** any movie can be marked "haven't seen" at any time — from its matchup card or the candidate tray. Parked movies sit out matchmaking in a visible strip below the vote; one tap reinstates them until the list finishes. Fewer than 2 active movies remain → prompt to reinstate or finish early.

**Undo:** single-level undo per matchup (client restores the pre-vote Elo snapshot).

## Flows

**Home `/`** — big search box + short pitch. Four search modes (person / company / keyword / title) backed by TMDB. Grid of poster cards; tap adds to the candidate tray. "Start ranking" creates a local anonymous session in localStorage → `/r/play`.

**Ranking room `/r/play`** — cast the tab to a TV or gather around a laptop. Each matchup goes up big; the group argues out loud; when consensus lands, whoever's driving taps the winning poster. One input device, social decision.

- Header: editable title, participant chips (free-text names, add/edit freely), progress bar.
- Body: two large poster cards; tap to pick; "haven't seen" per side parks that movie; undo.
- Stable state: celebration moment, order preview, "Sharpen the list" or "Finish".
- A persistent quiet reminder shows the session lives in this browser until saved.

- A single gentle banner appears once after ~10 comparisons for still-anonymous users: "Make an account now and this session is safe" — dismissible; converting mid-game resumes exactly where they were, logged in.
- Anonymous users get a browser leave-warning ("Your ranking isn't saved yet") if they try to navigate away mid-session.

**Save gate (at Finish):** signup/login sheet (email+password, magic link, Google, Microsoft). On success the draft + Elo state POSTs to the server and becomes an owned list under `/l/<id>`. User may also save-and-quit mid-session as a resumable draft.

**List `/l/<id>`** — ranked poster wall, participants credited ("Ranked by [PERSON_NAME] & friends"), native Web Share button with copy-link fallback. Publicly viewable logged-out; only the owner sees edit controls.

**Profile `/u/me`** — "My Lists": finished lists and resumable drafts. Bare-bones in v1.

**Error handling:** TMDB outage → friendly retry state on search; ranking itself works fully offline-from-TMDB since candidates are stored locally during play. Lost link → irrelevant: drafts and finished lists live in the profile. Auth failure → clear retry, session data preserved in localStorage throughout.

## Design & UX — Dark Cinema

**Feel:** near-black background (#0d0d10 range), warm amber/red accents, subtle film-grain texture. Poster art is the hero; cards are posters with minimal chrome. Big bold type; the two-up vote screen fills the viewport (it will be cast to TVs). Mobile-first responsive.

**Polish standard** — everything feels considered, nothing decorative-for-its-own-sake:

- **Motion:** 150–250 ms ease-out micro-transitions only. Poster cards lift ~2px on hover; the losing matchup card dims and slides out as the winner settles forward; the progress bar eases rather than jumps; the stable-state celebration is one short beat, not confetti spam. Respect `prefers-reduced-motion` throughout.
- **Spacing & rhythm:** consistent 4 pt-based scale (Tailwind defaults), generous whitespace around the vote pair — the matchup IS the page.
- **Type:** one display face for titles/versus moments, one clean sans for UI; clear hierarchy so each screen reads in under a second.
- **Color:** dark-cinema tokens defined once (background, surface, accent amber, muted text); semantic states (success/warn) derived, not ad-hoc hexes.
- **States:** every interactive element has designed hover, focus-visible (visible ring — keyboard users included), active, disabled, and loading states; TMDB fetches show skeleton posters, never layout shift.
- **Posters are sacred:** every poster container enforces the true movie-poster ratio of **2 : 3** (`aspect-[2/3]`, `object-cover`) — never squares, never arbitrary crops. Grids and matchup cards are sized around this ratio so posters always read as movie posters.
- **Touch targets:** ≥44 px on mobile — tapping a poster mid-argument must be unmissable.

At build time UI work follows the project's design-playbook/craft-guard skills (declaration-first specs, evidence-backed review) so "polished" gets verified against these criteria rather than eyeballed once.

## Testing

- **Engine unit tests (the real logic):** Vitest over pure ranking functions — Elo math, convergence detection, sharpen insertion order, tie handling, parking/reinstatement. Property-style test: synthetic votes recover a known planted ordering.
- **Route handlers + auth:** integration tests against throwaway Postgres covering create/save-list, authenticated vote updates, finish-assignment, and that non-owners cannot edit.
- **UI:** manual pass on mobile + large (TV-cast) viewport; no component-test framework in v1.

One runnable check ships with the engine module (`npm test`).

## Success Criteria for v1

A friend goes URL → finished, saved, shareable ranking in under 15 minutes, hitting signup only once at the end — and their new profile already contains their first trophy.
