# Test infra

## What runs
- Unit tests: `npm test` (vitest, node environment). 118 files, 2005 tests as of this writing.
- Type check: `npx next typegen && npx tsc --noEmit` (typegen first on a fresh checkout).
- Lint: `npm run lint`.
- Build: `npm run build`.
- There are no browser or end-to-end tests on this branch. Vitest only picks up `src/**/*.test.ts` (see `vitest.config.ts`); the one `*.test.tsx` file, `src/components/beta/BetaBadge.test.tsx`, is not run. So `.tsx` screens are checked only by hand (see `docs/qa-checklist.md`).

## Where the tests live
| Folder | Test files | Covers |
|---|---|---|
| `src/lib` | 61 | ranking engine, sessions, keyboard handling, gamification, shortlist and marquee rules, share text, rate limiting, plus several `*-stress.test.ts` files |
| `src/lib/cosmetics` | 11 | frames, taglines, avatars, ownership and unlock rules |
| `src/app/api` | 14 | route handlers: lists, upvotes, profile, account delete/export, feedback, search, marquee solve |
| `src/app` (outside `api`) | 13 | page-level logic, manifest, robots, sitemap, play-room helpers under `src/app/r/play` |
| `src/components` | 18 | beta, feedback, profile and share components, header/footer, completion card |
| `src/data` | 1 | static data |

Counts are of test files (`find src -name '*.test.ts'`) and drift as files are added; re-run the command rather than trusting this table.

## Old feature map removed
This file used to map 16 beta-round features to three "tiers" of tests and four walkthrough scenarios. The mapping named no test files and no longer matched the code, so it was cut.
