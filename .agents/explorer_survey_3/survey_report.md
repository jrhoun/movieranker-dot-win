# Phase 0 Survey Report: movieranker.win
**Explorer:** Explorer 3  
**Date:** 2026-09-02  
**Scope:** R3 (Community Discovery, Upvoting, Trending, Forking), R4 (Curator Roulette / Roll the Reel), R5 (Test Suite & Build Architecture)  
**Target Repository:** `/home/jrhoun/projects/movieranker-dot-win`

---

## 1. Executive Summary

A comprehensive, read-only architectural investigation was conducted on `movieranker.win` to evaluate the existing implementation and design actionable blueprints for:
1. **R3: Community Discovery & Social Elements** — Adding list upvoting (database table, RLS, REST endpoint/Server Actions, optimistic UI toggle), homepage "Trending & Popular Showcases" alongside the Weekly Marquee, and a 1-click "Fork & Re-rank" button on all public lists.
2. **R4: Curator Roulette ("Roll the Reel")** — Defining thematic micro-packs (90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, Studio Ghibli, 70s Paranoia, etc.) and building a theatrical roulette component on the homepage for instant 1-click ranking session launches.
3. **R5: Test Suite & Build Architecture** — Documenting the Vitest testing configuration, test suites (currently 27 test files, 298 tests passing in ~600ms), Next.js 16.3.2 Turbopack build pipeline (passing with 0 errors), and creating a rigorous test expansion plan.

### Key Architectural Insights
- **Database Engine:** The application uses **Supabase (PostgreSQL with Row-Level Security)** with `@supabase/ssr` and `@supabase/supabase-js`, not Prisma. Schema definitions are maintained in `supabase/schema.sql` and `supabase/upgrade-1.sql`.
- **Session Architecture:** Matchup duels run on client-side state in `localStorage` (`mr-session`), loaded and modified through pure algorithms in `src/lib/session.ts` and `src/lib/ranking.ts`, and synced to Supabase when saved or resumed.
- **Styling & Creative Direction:** The UI adheres to "Premiere Night" (`DESIGN.md`): velvet curtain gradients (`.bg-curtain`, `.bg-curtain-soft`), gold accents (`--gold: #f5c518`), Bebas Neue display typography, ambient spotlight glows, and 2:3 aspect-ratio poster cards.

---

## 2. R3: Community Discovery & Social Elements

### 2.1 Database Schema & Upvoting Architecture

#### Existing Database Models
The current Supabase schema (`supabase/schema.sql`) defines:
- `lists`: `id` (text PK, 10-char nanoid), `owner_id` (uuid -> auth.users), `title`, `description`, `participants` (text[]), `status` (`draft` | `ranking` | `done`), `visibility` (`unlisted` | `public` | `private`), `theme_slug` (text), `curated` (boolean), `created_at` (timestamptz).
- `list_movies`: `id` (bigint PK), `list_id` (text -> lists.id ON DELETE CASCADE), `tmdb_id` (int), `title` (text), `poster_path` (text), `release_year` (int), `elo` (real default 1000), `comparisons` (int default 0), `parked` (boolean default false), `final_rank` (int). Unique on `(list_id, tmdb_id)`.
- `profiles`: `id` (uuid PK -> auth.users), `handle` (text UNIQUE), `visibility` (`private` | `public`), `showcase` (jsonb), `referred_by` (uuid), `created_at` (timestamptz).
- `participant_attributions`: `(list_id, user_id)` unique, links users to participant chips.
- `shortlist_proposals`: community proposed themes.

#### New Upvoting Schema (`list_upvotes` & `lists.upvotes_count`)
To support upvoting public lists with strict integrity:

```sql
-- 1. Create list_upvotes table
create table if not exists list_upvotes (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);

-- 2. Indices for fast lookups & aggregation
create index if not exists idx_list_upvotes_list_id on list_upvotes(list_id);
create index if not exists idx_list_upvotes_user_id on list_upvotes(user_id);

-- 3. Optional denormalized upvote count on lists for blazing-fast trending queries
alter table lists add column if not exists upvotes_count int not null default 0;
create index if not exists idx_lists_trending on lists(visibility, status, upvotes_count desc, created_at desc);

-- 4. Row-Level Security
alter table list_upvotes enable row level security;

-- Read policy: Anyone can see upvotes for public or unlisted done lists
create policy "anyone reads upvotes for readable lists" on list_upvotes
  for select using (
    exists (
      select 1 from lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or (l.status = 'done' and l.visibility in ('unlisted','public')))
    )
  );

-- Insert policy: Authenticated users can upvote done public/unlisted lists
create policy "authenticated users upvote readable done lists" on list_upvotes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from lists l
      where l.id = list_id
        and l.status = 'done'
        and l.visibility in ('unlisted', 'public')
    )
  );

-- Delete policy: Authenticated users can remove their own upvote
create policy "authenticated users remove own upvote" on list_upvotes
  for delete using (auth.uid() = user_id);
```

#### SQL Trigger / RPC for Atomic Count Maintenance
To guarantee `lists.upvotes_count` remains consistent without race conditions:
```sql
create or replace function update_list_upvote_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update lists set upvotes_count = upvotes_count + 1 where id = NEW.list_id;
  elsif (TG_OP = 'DELETE') then
    update lists set upvotes_count = greatest(0, upvotes_count - 1) where id = OLD.list_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create or replace trigger trg_list_upvotes_count
after insert or delete on list_upvotes
for each row execute function update_list_upvote_count();
```

---

### 2.2 Upvoting Backend API & Server Actions

#### API Route: `src/app/api/lists/[id]/upvote/route.ts`

1. **`GET` Handler** (`/api/lists/[id]/upvote`):
   - Fetches current upvote count and whether the requesting user has upvoted.
   - Scoped by RLS.
   - Response: `{ count: number, userUpvoted: boolean }`.

2. **`POST` Handler** (Toggle Upvote):
   - Auth check: `supabase.auth.getUser()`. If no user, returns `401 { error: "unauthenticated" }`.
   - Rate limit: `rateLimit(await rateKey("upvote", request, user.id), { limit: 30, windowMs: 60_000 })`. If tripped, returns `429 tooManyRequests`.
   - Validation: Checks if list exists and is `done` with visibility `public` or `unlisted`.
   - Toggle logic:
     - Query `list_upvotes` for `list_id` and `user.id`.
     - If row exists: `DELETE FROM list_upvotes WHERE list_id = ... AND user_id = ...`.
     - If row does not exist: `INSERT INTO list_upvotes (list_id, user_id) VALUES (...)`.
     - Query updated count (or calculate delta).
     - Response: `200 { upvoted: boolean, count: number }`.

#### Rate Limiting Update
In `src/lib/rate-limit.ts`:
```typescript
export const LIMITS = {
  // ... existing limits ...
  upvote: { limit: 30, windowMs: 60_000 },
} as const;
```

---

### 2.3 Upvoting UI & Interaction Design

#### Component: `src/components/list/UpvoteButton.tsx`
- **Props**: `listId: string`, `initialCount: number`, `initialUpvoted: boolean`, `isOwner?: boolean`.
- **States**:
  - `upvoted`: boolean
  - `count`: number
  - `loading`: boolean
  - `showAuthPrompt`: boolean (opens `AuthToast` or `SaveGateSheet` modal when unauthenticated visitor clicks).
- **Aesthetic**:
  - Default: Subtle brass/gold outlined badge with `▲` or `✦` and numeric counter.
  - Upvoted state: Glowing filled gold badge (`bg-gold/20 text-gold ring-1 ring-gold shadow-[0_0_16px_rgba(245,197,24,0.3)]`).
  - Tactile micro-bounce animation on toggle.
- **Locations**:
  - `src/app/(site)/l/[id]/page.tsx` header alongside `CompareModal` and `ShareButton`.
  - Homepage Trending Showcase cards.
  - Profile showcase list rows.

---

### 2.4 Homepage Structure & "Trending & Popular Showcases"

#### Current Homepage Flow (`src/app/(site)/page.tsx` & `home-client.tsx`)
- `src/app/(site)/page.tsx` is an async Server Component.
- Fetches `getTonightsShortlist()` (theme, movies from TMDB, community settled count, previews).
- Renders `<HomeClient tonight={...} />`.
- `home-client.tsx` presents:
  1. Velvet Curtain Hero (`.bg-curtain`) with Bebas wordmark, gold CTA, and fanned poster row.
  2. "Choose your premiere" section with two equal columns on desktop:
     - Left: "Build your own list" (SearchPanel).
     - Right: "This week's marquee" (Weekly theme line-up).
  3. Docked Candidate Tray (`CandidateTray.tsx`).

#### New "Trending & Popular Showcases" Architecture

1. **Data Query (`src/lib/trending.ts` or `src/lib/lists-api.ts`)**:
   ```typescript
   export interface TrendingListSummary {
     id: string;
     title: string;
     description: string | null;
     ownerHandle: string | null;
     ownerLevel?: number;
     upvotesCount: number;
     movieCount: number;
     createdAt: string;
     posters: { title: string; posterPath: string | null }[];
     participants: string[];
   }
   
   export async function getTrendingLists(limit: number = 6): Promise<TrendingListSummary[]> {
     const supabase = await createSupabaseServerClient();
     // Fetch public done lists with highest upvotes and recent activity
     const { data } = await supabase
       .from("lists")
       .select(`
         id, title, description, participants, created_at, upvotes_count, owner_id,
         list_movies (title, poster_path, final_rank),
         profiles:owner_id (handle)
       `)
       .eq("status", "done")
       .eq("visibility", "public")
       .order("upvotes_count", { ascending: false })
       .order("created_at", { ascending: false })
       .limit(limit);
     // Shape and return summary with top-3 poster triptych
   }
   ```

2. **UI Presentation in `HomeClient`**:
   - Added as a theatrical section:
     `<MarqueeHeading as="h2">Trending & Community Showcases</MarqueeHeading>`
   - Grid layout of showcase cards:
     - Title with gold divider.
     - Curated by `@handle` (linked to `/u/[handle]`).
     - Triptych of top-3 ranked posters.
     - Upvote counter badge.
     - Action buttons:
       - "View Ranking →" (links to `/l/[id]`).
       - "Fork & Re-rank ✦" (1-click launch).

---

### 2.5 "Fork & Re-rank" Architecture & Flow

#### Concept & Value
Any visitor (guest or authenticated) viewing a public done list (`/l/[id]`) or seeing a trending showcase card can immediately fork the exact movie roster to create their own head-to-head duel.

#### Implementation Blueprint

1. **Client Action / Helper (`src/lib/fork.ts` or inline in `src/components/list/ForkButton.tsx`)**:
   - Reads the list's movies (`rows: ListMovieRow[]` containing `tmdbId`, `title`, `posterPath`, `releaseYear`).
   - Resets ranking metrics to baseline:
     ```typescript
     export function createForkSession(
       listTitle: string,
       movies: ListMovieRow[],
       ownerHandle?: string | null,
     ): PlaySession {
       const cleanMovies: RankedMovie[] = movies.map((m) => ({
         tmdbId: m.tmdbId,
         title: m.title,
         posterPath: m.posterPath,
         releaseYear: m.releaseYear,
         elo: 1000,
         comparisons: 0,
         parked: false,
       }));
       return {
         title: `Re-rank: ${listTitle}`,
         participants: [],
         movies: cleanMovies,
         votesSinceOrderChange: 0,
         nudgeShown: false,
       };
     }
     ```
   - Persists the new session to `localStorage` using `saveSession(...)`.
   - Navigates to `/r/play` via `router.push('/r/play')`.
   - If an unfinished duel already exists in `localStorage`: Prompts with a non-destructive modal ("You have an unfinished ranking in progress. Start fresh with this forked list or resume saved?").

2. **UI Placement**:
   - Primary placement: In the list header on `src/app/(site)/l/[id]/page.tsx` (right next to Compare and Share).
   - Secondary placement: On all Trending Showcase cards on the homepage.

---

## 3. R4: Curator Roulette ("Roll the Reel")

### 3.1 Thematic Micro-Packs Catalog & Schema

`src/lib/shortlist-themes.ts` currently hosts 43 weekly themes. We can establish a rich, dedicated micro-pack catalog (`src/lib/curator-roulette.ts` or expanded `shortlist-themes.ts`) optimized for instant spinning and ranking.

#### Micro-Pack Data Model
```typescript
export interface CuratorMicroPack {
  id: string;
  title: string;
  subtitle: string;
  blurb: string;
  genre: string;
  badge: string;
  accentColor: string; // Tailwind color or hex for spotlight
  movieIds: number[];  // Curated TMDB IDs (6-8 films)
}
```

#### Thematic Micro-Packs Catalog
| Pack ID | Title | Badge | Curated TMDB IDs | Representative Films |
|---|---|---|---|---|
| `cyberpunk-90s` | 90s Cyberpunk | 💾 Cyberpunk | `[603, 9331, 280, 78, 27205, 10585]` | The Matrix, Ghost in the Shell, Strange Days, Total Recall, Dark City, Johnny Mnemonic |
| `a24-gems` | A24 Modern Gems | 💎 A24 | `[546554, 493922, 497698, 480530, 37165, 473033, 447332]` | EEAAO, Past Lives, Hereditary, The Lighthouse, Uncut Gems, Moonlight, Midsommar |
| `noir-classics` | Film Noir Legends | 🕵️ Noir | `[807, 389, 539, 15, 15121, 640]` | Double Indemnity, The Maltese Falcon, Sunset Boulevard, Touch of Evil, Chinatown, Laura |
| `oscar-snubs` | Greatest Oscar Snubs | 🏆 Oscar Snub | `[278, 680, 62, 105, 238, 597]` | Shawshank Redemption, Pulp Fiction, 2001: Space Odyssey, Taxi Driver, Citizen Kane, Goodfellas |
| `studio-ghibli` | Studio Ghibli Magic | 🍃 Ghibli | `[129, 128, 8392, 4935, 16859, 15370]` | Spirited Away, Princess Mononoke, My Neighbor Totoro, Howl's Moving Castle, Grave of the Fireflies, Kiki |
| `paranoia-70s` | 70s Paranoia & Spies | 📻 70s Paranoia | `[891, 1949, 10377, 37799, 115, 640]` | The Conversation, All the President's Men, Network, Marathon Man, Three Days of the Condor, Klute |
| `whodunit-manor` | Manor Whodunits | 🔍 Whodunit | `[546554, 661374, 15196, 392044, 745, 1124]` | Knives Out, Glass Onion, Clue, Gosford Park, Murder on the Orient Express, Memento |
| `neon-dystopia` | Electric Dreams | ⚡ Neon Sci-Fi | `[78, 335984, 603, 27205, 1726, 264660]` | Blade Runner, Blade Runner 2049, The Matrix, Inception, Ex Machina, Dark City |

---

### 3.2 Homepage UI Component: "Roll the Reel" (Curator Roulette)

#### Component: `src/components/CuratorRoulette.tsx`
- **Visual Design:**
  - Styled as a vintage brass & gold cinema reel housed in a velvet surface card.
  - Searchlight beams and warm ambient spotlight behind the active reel.
  - Rapid filmstrip ticker / reel spin animation (`@keyframes reel-spin`) that decrescendoes smoothly (`cubic-bezier(0.12, 0.8, 0.32, 1)`) to land on a randomly selected micro-pack.
  - Option for subtle opt-in Web Audio mechanical click/ticker sound as cards pass.
- **Single-Click Interaction:**
  1. Visitor clicks **"Roll the Reel 🎲"**.
  2. Reel spins through micro-pack cards for ~1.5s, stopping on a winner.
  3. Displays the revealed pack: Bebas title, gold badge, atmospheric blurb, and hydrated movie poster strip.
  4. Primary CTA lights up: **"Rank this Pack ✦"**.
  5. Clicking immediately creates a `PlaySession` and pushes to `/r/play`.

---

## 4. R5: Test Suite & Build Architecture

### 4.1 Vitest & Build Infrastructure

#### Configuration
- **Test Runner:** Vitest v4.1.11 (`vitest run` in `package.json`).
- **Config File:** `vitest.config.ts`:
  ```typescript
  import { defineConfig } from "vitest/config";
  import { fileURLToPath } from "node:url";

  export default defineConfig({
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: { environment: "node", include: ["src/**/*.test.ts"] },
  });
  ```
- **Next.js & React:** Next.js 16.3.2 with Turbopack, React 19.2.8.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`).

#### Verification Execution Results
- `npm test`: **27 test files passed (100%), 298 unit/integration tests passed in 604ms.**
- `npm run build`: **Compiled successfully with TypeScript 5 in 1245ms; 25 static & dynamic routes generated with zero errors.**

---

### 4.2 Existing Test Inventory Breakdown

| Module / Domain | Test Files | Primary Responsibilities |
|---|---|---|
| **Ranking & Elo Algorithm** | `src/lib/ranking.test.ts`, `src/lib/session.test.ts` | Elo updates, convergence stability, pairwise selection, undo snapshotting, close calls. |
| **API Endpoints** | `src/app/api/lists/route.test.ts`, `src/app/api/lists/[id]/route.test.ts`, `src/app/api/lists/[id]/participants/claim/route.test.ts`, `src/app/api/profile/route.test.ts`, `src/app/api/profile/availability/route.test.ts`, `src/app/api/account/delete/route.test.ts`, `src/app/api/account/export/route.test.ts`, `src/app/api/search/route.test.ts`, `src/app/auth/callback/route.test.ts` | Request validation, auth gating (401), RLS policy mapping (403), atomic RPC calls, rate limits (429). |
| **Shortlist & Themes** | `src/lib/shortlist.test.ts`, `src/lib/theme-stats.test.ts`, `src/lib/proposals-api.test.ts` | Deterministic weekly epoch math, community proposal aggregation, consensus metrics, connection games. |
| **Versus & Compare** | `src/lib/versus.test.ts` | List intersection, order agreement percentage, biggest rank arguments, tier copy. |
| **Gamification & Handles** | `src/lib/gamification.test.ts`, `src/lib/handles.test.ts`, `src/lib/public-profile.test.ts`, `src/lib/referrals.test.ts` | Handle normalization/validation, XP calculation, levels, achievements, showcase parsing. |
| **UI & TMDB Helpers** | `src/lib/tray.test.ts`, `src/lib/list-view.test.ts`, `src/lib/search-filter.test.ts`, `src/lib/tmdb.test.ts`, `src/lib/triptych.test.ts`, `src/lib/rate-limit.test.ts`, `src/app/(site)/l/[id]/page.test.ts` | Tray merge/dedup, ranking decorator, TMDB URL generation, triptych slicing, sliding-window rate limiter. |

---

### 4.3 Test Implementation Strategy for R3 & R4

To preserve the 100% pass guarantee and maintain strict quality standards, the following automated tests should be added during implementation:

1. **`src/app/api/lists/[id]/upvote/route.test.ts`**
   - Returns 401 when unauthenticated.
   - Enforces rate limits (429 when exceeding threshold).
   - Toggles upvote on (insert) when not yet upvoted.
   - Toggles upvote off (delete) when already upvoted.
   - Rejects upvoting on non-existent, draft, or private lists.
   - Accurately returns updated `count` and `userUpvoted`.

2. **`src/lib/trending.test.ts`**
   - Filters only public done lists.
   - Correctly sorts lists by upvote count descending and recency.
   - Safely extracts top-3 posters for triptych display without out-of-bounds errors.

3. **`src/lib/curator-roulette.test.ts`**
   - Validates all micro-pack definitions (valid TMDB ID arrays with minimum 5 films per pack).
   - Verifies random selection produces valid packs without throwing.
   - Verifies session conversion seeds clean `PlaySession` with Elo 1000 and comparison 0.

4. **`src/lib/fork.test.ts`**
   - Verifies list forking resets movie Elo and comparisons.
   - Preserves title prefix ("Re-rank: ...") and candidate movie metadata.
   - Cleans parked status.

---

## 5. File Inventory & Proposed Modifications

| File Path | Status | Planned Changes |
|---|---|---|
| `supabase/schema.sql` & `supabase/upgrade-1.sql` | Modify | Add `list_upvotes` table, unique constraints, indices, RLS policies, and trigger. |
| `src/lib/rate-limit.ts` | Modify | Add `upvote` rate limit configuration. |
| `src/app/api/lists/[id]/upvote/route.ts` | New | Implement `GET` and `POST` handlers for toggling list upvotes. |
| `src/app/api/lists/[id]/upvote/route.test.ts` | New | Comprehensive Vitest suite for upvote endpoint. |
| `src/components/list/UpvoteButton.tsx` | New | Interactive gold upvote button with optimistic updates and guest auth modal trigger. |
| `src/components/list/ForkButton.tsx` | New | 1-click "Fork & Re-rank" button seeding `localStorage` and routing to `/r/play`. |
| `src/lib/fork.ts` | New | Helper function converting list rows into clean `PlaySession`. |
| `src/app/(site)/l/[id]/page.tsx` | Modify | Mount `UpvoteButton` and `ForkButton` into header actions; display upvote counter and owner attribution. |
| `src/lib/curator-roulette.ts` | New | Thematic micro-packs catalog (90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, Ghibli, 70s Paranoia) & spin logic. |
| `src/lib/curator-roulette.test.ts` | New | Unit tests for micro-packs and session generation. |
| `src/components/CuratorRoulette.tsx` | New | Theatrical spinning reel UI component with instant 1-click launch. |
| `src/lib/trending.ts` | New | Server-side query helper for fetching and caching trending public showcases. |
| `src/lib/trending.test.ts` | New | Unit tests for trending queries and ranking. |
| `src/app/(site)/page.tsx` | Modify | Query trending showcases and pass to `HomeClient`. |
| `src/app/(site)/home-client.tsx` | Modify | Integrate `CuratorRoulette` and "Trending & Popular Showcases" section into homepage layout. |

---

## 6. Conclusion

The `movieranker.win` architecture is clean, highly modular, and exceptionally fast. The Next.js 16 App Router + Supabase + Vitest stack provides ideal extension points for R3 (Community Upvoting, Trending Showcases, Forking) and R4 (Curator Roulette micro-packs). All proposed additions integrate directly with existing patterns, preserve local isolation, and maintain strict test coverage.
