## 2026-09-02T23:01:14Z

You are Worker M3 for Milestone 3: Community Social & Discovery (Upvoting, Trending Showcases, Fork & Re-rank, Curator Roulette).
Your working directory is: /home/jrhoun/projects/movieranker-dot-win/.agents/worker_m3/

MANDATORY READINGS BEFORE WRITING CODE:
1. /home/jrhoun/projects/movieranker-dot-win/.agents/ORIGINAL_REQUEST.md
2. /home/jrhoun/projects/movieranker-dot-win/PROJECT.md
3. /home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_3/report.md (or survey_report.md)
4. /home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_3/handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement all Milestone 3 features with highest craft and thorough automated tests:
1. **Community Upvoting System (R3)**:
   - Add SQL schema / migration in `supabase/schema.sql` (and `supabase/migrations/20260902_list_upvotes.sql`) for `list_upvotes (id, list_id, user_id, created_at)` with `UNIQUE(list_id, user_id)`, index on `(list_id)`, index on `(user_id)`, and `upvotes_count` trigger/column on `lists`.
   - Create route handler `src/app/api/lists/[id]/upvote/route.ts` with `GET` and `POST` handlers:
     - `GET`: returns `{ upvotesCount: number, hasUpvoted: boolean }`
     - `POST`: toggles upvote for authenticated user, returns updated `{ upvotesCount, hasUpvoted }`, returns `401` for unauthenticated guests, rate-limited via `src/lib/rate-limit.ts`.
   - Create unit tests in `src/app/api/lists/[id]/upvote/route.test.ts` (or `src/lib/upvote.test.ts`) testing toggle logic, count updates, authentication checks, and rate limits.
   - Create `<UpvoteButton />` in `src/components/community/UpvoteButton.tsx` with optimistic toggle, count display, gold heart/up-arrow styling, and sign-in prompt modal when guest tries to upvote.
   - Wire `<UpvoteButton />` into `src/app/(site)/l/[id]/page.tsx` header and showcase list cards.
2. **Trending & Popular Showcases on Homepage (R3)**:
   - Implement `getTrendingLists(supabase, limit)` in `src/lib/trending.ts` (or `shortlist.ts`), querying public done lists ordered by `upvotes_count DESC, created_at DESC`.
   - Create `src/lib/trending.test.ts` with unit tests for trending sorting, visibility filters, and fallbacks.
   - Update `src/app/(site)/page.tsx` and `src/app/(site)/home-client.tsx` to display a "Trending & Community Showcases" section with list cards (showing title, creator, upvotes, movie count, and quick preview/fork).
3. **"Fork & Re-rank" Button (R3)**:
   - Create `src/lib/fork.ts` with `createForkSession(list: { title: string; movies: RankedMovie[] | ListMovieRow[] }): PlaySession` that resets Elo to 1000, comparisons to 0, parked to false, initializes clean `PlaySession`, and saves via `saveSession(...)`.
   - Create `src/lib/fork.test.ts` with comprehensive unit tests for session cloning, Elo reset, participant clearing, and storage.
   - Create `<ForkButton />` in `src/components/community/ForkButton.tsx` (or integrated into public lists) and mount prominently on `/l/[id]` header and list views, navigating to `/r/play` on click.
4. **Curator Roulette ("Roll the Reel") Instant Start (R4)**:
   - Create `src/lib/curator-roulette.ts` defining micro-packs:
     - 90s Cyberpunk, A24 Gems, Noir Classics, Oscar Snubs, Studio Ghibli, 70s Paranoia.
     - Include helper `getRandomMicroPack()`, `getMicroPackBySlug()`, `launchMicroPackSession(slug)`.
   - Create `src/lib/curator-roulette.test.ts` with tests for micro-pack validity, TMDB ID formats, and session generation.
   - Create `<CuratorRoulette />` in `src/components/roulette/CuratorRoulette.tsx` with vintage spinning reel animation, random pick selector, theme badges, sound integration, and 1-click instant launch to `/r/play`.
   - Mount `<CuratorRoulette />` on homepage (`home-client.tsx`).

VERIFICATION REQUIREMENTS:
- Run `npx vitest run src/lib/fork.test.ts src/lib/trending.test.ts src/lib/curator-roulette.test.ts`
- Run full test suite `npm test` ensuring all tests pass cleanly.
- Run `npm run build` ensuring 0 TypeScript/ESLint errors.
- Document all modified and created files, test execution outputs, and verification commands in `handoff.md`.
- Send a message when finished.
