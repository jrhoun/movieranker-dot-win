# Handoff Report: Explorer 3 (Phase 0 Survey)

**From:** Explorer 3 (`.agents/explorer_survey_3/`)  
**To:** Parent Orchestrator (`55187bbe-b5b2-46b6-b40d-042e1622efe8`)  
**Timestamp:** 2026-09-02T22:25:00Z  
**Type:** Hard Handoff (Survey Complete)

---

## 1. Observation

1. **Database & Schema:**
   - Database technology is **Supabase PostgreSQL** via `@supabase/ssr` (v0.12.4) and `@supabase/supabase-js` (v2.112.3) in `package.json` (lines 13-14). No Prisma ORM is present.
   - Core database schema is defined in `supabase/schema.sql` (lines 1-160) and `supabase/upgrade-1.sql` (lines 1-118).
   - Tables include `lists` (lines 3-11), `list_movies` (lines 12-18), `profiles` (lines 138-147), `participant_attributions` (lines 109-116), and `shortlist_proposals` (lines 87-95).
   - Lists have a `visibility` column check (`'unlisted'`, `'public'`, `'private'`) and `status` (`'draft'`, `'ranking'`, `'done'`).
   - RLS policies on `lists` and `list_movies` permit anyone to read `status = 'done'` and `visibility IN ('unlisted', 'public')` (lines 31-39).

2. **Upvoting State & Endpoints:**
   - There is currently no `list_upvotes` table in `supabase/schema.sql`.
   - List API routes reside in `src/app/api/lists/route.ts` and `src/app/api/lists/[id]/route.ts`. No `/api/lists/[id]/upvote` route currently exists.
   - Rate limiting helper `src/lib/rate-limit.ts` defines sliding-window limits for `lists`, `proposals`, `accountDelete`, `profile`, `claimHandle`, `claimParticipant` (lines 5-14).

3. **Homepage & Public Lists Discovery:**
   - `src/app/(site)/page.tsx` (lines 13-82) queries `getTonightsShortlist()` from `src/lib/shortlist.ts` (lines 214-220) and checks if the logged-in user has already ranked this week's marquee theme (lines 52-63).
   - `src/app/(site)/home-client.tsx` (lines 70-611) renders the velvet curtain hero (`.bg-curtain`), fanned poster strip (`FAN_POSTERS` fallback or weekly theme credits), and two premiere paths: "Build your own list" (`SearchPanel`) and "This week's marquee" (filmstrip with `scrollMarquee`).
   - `src/app/(site)/l/[id]/page.tsx` (lines 105-312) renders public lists, header actions (`CompareModal`, `ShareButton`), `OwnerControls`, `ListViews`, `MarqueeConnectionGame`, and `CommunityStatsGrid`.
   - There is currently no "Fork & Re-rank" button in `src/app/(site)/l/[id]/page.tsx` or `src/components/list/ListViews.tsx`.

4. **Curator Roulette & Thematic Packs:**
   - `src/lib/shortlist-themes.ts` defines 43 curated themes in `SHORTLIST_THEMES` (lines 32-400), each with `slug`, `title`, `blurb`, `movieIds`, and optional `connectionGame`.
   - The user requested specific micro-packs including 90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, Studio Ghibli, and 70s Paranoia.
   - Session initiation in `src/app/(site)/home-client.tsx` (lines 171-197) creates a `PlaySession` and calls `saveSession(...)` (`src/lib/session.ts`: lines 47-52) before navigating to `/r/play`.

5. **Test Suite & Build Pipeline:**
   - `vitest.config.ts` (lines 1-10) defines the test environment as `node` targeting `src/**/*.test.ts`.
   - Execution command `npm test` runs 27 test files, passing all 298 tests in 604ms:
     ```
     Test Files  27 passed (27)
          Tests  298 passed (298)
       Duration  604ms
     ```
   - Execution command `npm run build` with Next.js 16.3.2 Turbopack compiles 25 static & dynamic routes cleanly in 1.25s with 0 TypeScript or ESLint errors.

---

## 2. Logic Chain

1. **R3 (Upvoting & Trending):**
   - From Observation 1 & 2, adding upvotes requires a standard Supabase migration: creating `list_upvotes (id, list_id, user_id, created_at)` with `UNIQUE(list_id, user_id)`, indices, RLS policies, and an atomic `upvotes_count` trigger on `lists`.
   - Adding `src/app/api/lists/[id]/upvote/route.ts` with `GET` and `POST` handlers will allow authenticated users to toggle upvotes while returning `401` to guests and enforcing rate limits via `rateLimit`.
   - In the frontend, `<UpvoteButton />` can render in `src/app/(site)/l/[id]/page.tsx` header and showcase cards, prompting unauthenticated users to sign in.
   - For trending lists, `src/app/(site)/page.tsx` can query public done lists sorted by `upvotes_count DESC, created_at DESC`, passing them into `HomeClient` to render a "Trending & Community Showcases" grid.

2. **R3 (Fork & Re-rank):**
   - From Observation 3 & 4, a public list's movies (`rows: ListMovieRow[]`) contain all necessary metadata (`tmdbId`, `title`, `posterPath`, `releaseYear`).
   - When a visitor clicks "Fork & Re-rank" on `/l/[id]`, a client helper `createForkSession(...)` resets Elo to 1000, comparisons to 0, and parked to false, saves the clean `PlaySession` to `localStorage` via `saveSession(...)`, and pushes to `/r/play`.

3. **R4 (Curator Roulette / "Roll the Reel"):**
   - From Observation 4, the existing 43 themes in `SHORTLIST_THEMES` provide a strong foundation. Creating a dedicated `CURATOR_MICRO_PACKS` catalog (with 90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, Studio Ghibli, 70s Paranoia) with curated TMDB IDs will satisfy R4.
   - Building `<CuratorRoulette />` on the homepage gives visitors a theatrical spinning reel animation with instant 1-click launch into `/r/play`.

4. **R5 (Testing & Quality Guardrails):**
   - From Observation 5, all new endpoints and features must be tested using the existing Vitest patterns (`src/**/*.test.ts`), maintaining the 298+ test passing threshold and zero build errors.

---

## 3. Caveats

- **Network Mode:** The local test suite runs with Node.js in-memory mocks without requiring a live connection to TMDB or external Supabase servers.
- **Rate Limiting Persistence:** Rate limits in `src/lib/rate-limit.ts` are in-memory per serverless instance; this matches the existing architecture across all API routes.
- **Local Isolation:** Remote origin must not be touched (`git push` prohibited).

---

## 4. Conclusion

The architecture of `movieranker.win` is robust, performant, and well-structured. Implementing R3 (Community Upvoting, Trending Showcases, Fork & Re-rank) and R4 (Curator Roulette Micro-Packs) is straightforward and requires:
1. SQL migration for `list_upvotes` and `lists.upvotes_count` trigger.
2. Route handler `src/app/api/lists/[id]/upvote/route.ts` with tests.
3. `<UpvoteButton />` and `<ForkButton />` components for `/l/[id]` and showcase cards.
4. `getTrendingLists()` query and "Trending Showcases" UI section in `HomeClient`.
5. Micro-pack definitions (`src/lib/curator-roulette.ts`) and `<CuratorRoulette />` component.
6. Comprehensive automated test suites for all new functions.

Full detailed report is saved at `/home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_3/survey_report.md`.

---

## 5. Verification Method

To independently verify the findings and performance benchmarks:
```bash
# 1. Run all unit and integration tests
npm test

# 2. Run production build and TypeScript / ESLint checks
npm run build

# 3. Inspect survey report and handoff
cat .agents/explorer_survey_3/survey_report.md
cat .agents/explorer_survey_3/handoff.md
```
