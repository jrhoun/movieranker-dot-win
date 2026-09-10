# Beta launch readiness — review findings and work packages

Reviewed 2026-09-09 on branch `beta-improvements-fixes` (commits 13b3f9e..34012b1) against a
running dev server, the live Supabase project, and real 390px / 1440px screenshots.

Verification state at review time:

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx vitest run` | 95 files, 1829 tests, all pass |
| `npx eslint .` | **2 errors** (`no-explicit-any` in `src/lib/cosmetics/avatars.test.ts:63`), 16 warnings |
| Horizontal overflow at 390px | none on /, /about, /updates, /login, /compare, /privacy |
| Console errors | none |

Live DB snapshot: 7 lists (5 marquee, 1 public custom, 1 unlisted custom), 2 profiles,
**no `feedback` table**.

---

## P0 — fix before anyone outside sees it

### 1. Feedback is discarded
`src/app/api/feedback/route.ts:96-119`. The route logs only `messageLength`, then inserts into a
`feedback` table that does not exist in the live project, inside a bare `try/catch`, and returns
`{ ok: true }`. Every beta bug report submitted today is lost while the UI says "Feedback received".

Fix:
- Migration `supabase/migrations/20260909_feedback.sql`: `feedback(id uuid pk default gen_random_uuid(), created_at timestamptz default now(), category text check (category in ('bug','idea','other')), message text not null, email text, user_id uuid null references auth.users, page_url text, user_agent text)`. RLS on, no anon policies; write via the service-role admin client (`src/lib/supabase/admin.ts`) from the route, never the cookie client.
- Route: on insert error, `console.error` the Supabase error and return 500. Include `user_id` when signed in, `page_url` from the request body (client passes `location.pathname`), and `user-agent` header.
- Client: `FeedbackModal.tsx` sends `pageUrl`. Show a real error state on non-2xx.
- Owner visibility: add a "Feedback" section to `/admin` (`src/app/(site)/admin/page.tsx`) listing the last 50 rows via the existing owner-gated pattern in `src/app/api/admin/stats/route.ts`.
- Test: `route.test.ts` asserts 500 on insert failure and that the body includes message/page/user.

### 2. Community Spotlight says "Coming Soon" on launch day
`src/app/(site)/home-client.tsx:708-757` requires 3 trending lists. The live DB has 1. The largest
section of the homepage reads as abandoned.

Fix: render real cards whenever `trendingLists.length >= 1`, and fill remaining slots up to 3 with a
single "Be the first — start a ranking" card. Keep the blurred skeleton only for the true-zero case.
Add a unit test on the threshold logic (extract it to `src/lib/trending.ts` as
`spotlightSlots(lists)` so it is testable without React).

### 3. Pioneer step 3 copy does not match what it measures
`src/components/beta/BetaWalkthroughCard.tsx:460` says "Rank 1 list & share to Spotlight", but
`publicDoneLists` (`src/app/api/profile/route.ts:307`) counts marquee lists, which are public by
default. Most users complete step 3 without doing what the copy says.

Fix (keep the challenge easy — that is good for a beta): change the copy to "Finish one ranking and
publish it" and the helper text to explain that the weekly Marquee counts. Update the test in
`BetaWalkthroughCard.test.ts`.

### 4. Lint errors
Fix the two `any` usages in `src/lib/cosmetics/avatars.test.ts:63`; clear the unused-import
warnings in `challenger-m4-2-stress.test.ts` and `SiteHeader` / `NAV_AUTH_WIDTH`. Acceptance
criterion "zero lint violations" is currently false.

---

## P1 — needed for traction, do in the same pass

### 5. No funnel instrumentation
`@vercel/analytics` is mounted but no custom events exist anywhere in `src/`. You will not know
whether visitors finish a ranking or where the save gate loses them.

Fix: `src/lib/analytics.ts` exporting `trackEvent(name, props)` wrapping `track` from
`@vercel/analytics` (no-op in tests). Fire: `ranking_started` (source: marquee | custom),
`ranking_finished` (votes, movies), `connection_guessed` (correct: bool), `save_gate_shown`,
`signup_completed` (provider), `share_clicked` (surface: list | pass | referral),
`feedback_sent` (category). Insert points: `play-room.tsx` start/finish/sheet, `SaveGateSheet.tsx`,
`ShareButton.tsx`, `PremierePassCard.tsx`, `FeedbackModal.tsx`, `auth/callback/route.ts` (server
side use `track` from `@vercel/analytics/server`).

### 6. Hero: two doors (decided 2026-09-09, see design canvas)
`home-client.tsx:263-300`. Replace the fold copy and CTA with the chosen direction:
- Eyebrow unchanged ("✦ movieranker.win ✦").
- h1 line 1 "Rank movies", line 2 (gold shimmer) "head-to-head."
- New subhead directly under the h1, 16px mobile / 20px desktop, `text-wrap: pretty`, max ~560px:
  "Play this week's curated list, or build a custom one from any films you like. Then share the result."
- Remove the line "This week's marquee, no. 3 · What is this?" from the fold. Keep the "What is this?"
  info modal reachable from the countdown pill (make the pill the trigger).
- Poster fan unchanged.
- Under the fan, TWO buttons in one wrapping row, gap 10px, both 48px tall:
  primary gold pill "Play this week's list" (existing start action); secondary outlined pill
  "Build your own" that smooth-scrolls to the builder section and focuses the search input.
- Countdown pill stays below the buttons.
- Spoiler rule unchanged: the theme title never appears.
- Update `e2e-theatrical.test.ts` assertions that match on the old copy.

### 7. Floating FEEDBACK pill covers content on mobile
`src/components/feedback/FloatingFeedback.tsx`. At 390px the fixed pill sits over the search tabs
on `/` and over posters on `/l/[id]`.

Fix: on `< sm` render a 44px icon-only button, move it to `bottom: calc(env(safe-area-inset-bottom) + 12px)`,
and hide it entirely on `/r/play` where the tray owns the bottom edge (the header/footer triggers
remain). Verify with a 390px screenshot of `/`, `/l/[id]`, `/r/play`.

### 8. Copy that will read badly to coworkers
The voice is JR's and should stay. Tighten, do not sanitize:
- `src/data/updates.ts:29-37`: the beta post is ~450 words in one card on mobile. Cut to ~200,
  split into 4 short paragraphs with the 5 highlight bullets kept. Remove "list-a-holic" and the
  "limits of what I can put together with an LLM" line (move the LLM note to About, one sentence).
  Replace "Beta Canister cosmetic swag" with "three beta-only profile cosmetics".
- `src/app/(site)/about/page.tsx:52-62`: keep the human-written point, cut "typing them with my fingers" and "Now, back to the show!".
- `src/components/SiteFooter.tsx:22-23`, `src/app/manifest.ts:7`: "hidden thread" → "hidden connection"; "community consensus" → "see how everyone else ranked them".
- `src/components/feedback/FeedbackModal.tsx:243`: placeholder → "What happened, or what would you like to see?"

### 9. Consensus screen contradicts itself
After 9 votes on 6 films the wrap-up shows "Consensus reached" directly above "5 of 5 matchups
still too close to call". Fix in `play-room.tsx` / `CompletionSummaryCard.tsx`: when
`closeCalls === totalPairs` or votes < a floor, title it "Early result" and make "Sharpen close
calls" the primary button, "Finish" secondary.

### 10. Dead Microsoft/Azure stub
`src/app/(site)/login/page.tsx:128` and `src/components/SaveGateSheet.tsx:223` type the OAuth
handler as `"google" | "azure"`, but Microsoft login was never implemented and no button renders.
Google login is confirmed working in production. Fix: narrow the type to `"google"`, delete the
azure branch and the "Google sign-in isn't set up yet" fallback copy at `login/page.tsx:122`.

### 11. Mobile type scale (see design canvas "Type scale" sheet)
Measured at 390px: on `/l/[id]` 95 of 132 text nodes are 12px or smaller, 21 at 9-10px; on `/`
and `/updates` 12px is the most common size. Two floors: 14px for anything read, 12px only for
tracked uppercase eyebrows and mono years. Apply on mobile (unchanged at `sm:` where already larger):

| Role | Now | Proposed | Files |
|---|---|---|---|
| List title (Bebas) | 24 | 28 | `l/[id]/page.tsx:439` |
| Action pills (Share, Rank these yourself, Compare, upvote) | 12 / 30px tall | 14 / 40px tall | `ShareButton.tsx`, `UpvoteButton.tsx`, `l/[id]/page.tsx:472` |
| Podium winner name | 12 | 15, allow 2-line wrap | `StackedView.tsx:104` |
| Podium runner-up names | 11 | 14 | `StackedView.tsx:104` |
| Year (mono) everywhere | 10 | 12 | `StackedView.tsx:121,190`, `RowsView.tsx` |
| Pedestal labels | 12/10/9 | 13/12/11 | `StackedView.tsx:127` |
| Rest-of-list names | 12 | 14 | `StackedView.tsx:178` |
| Rank chip (mono) | 10 | 12 | `StackedView.tsx:160` |
| Muted helper paragraphs | 12 | 15 | `home-client.tsx` spotlight blurb, `l/[id]/page.tsx:547,586,612` |
| Footer links | 12 | 14 | `SiteFooter.tsx` |
| Bebas eyebrows | 12 | 12 (keep) | — |

Also on `/l/[id]` for finished lists: "Rank these yourself" becomes the primary gold pill with
Share beside it as secondary; upvote and Compare stay in the quiet row, with "by @handle" right-aligned
in that row. Fix the icon/label vertical alignment in the compact pills (icon `display:block`,
label `line-height:1`, container `inline-flex items-center`). Re-measure with the same script
after: no visible text below 12px on `/`, `/l/[id]`, `/updates`.

### 12. Beta path has a hole
`BetaWalkthroughCard` renders only on `/u/profile` (`u/profile/page.tsx:156`), but after a first
save the user is sent to `/l/<id>?finished=1` (`play-room.tsx:581`, `SaveGateSheet.tsx:123`) and
may never visit the dashboard. Fix:
- On `/l/[id]` when `finished=1` and the viewer is the owner and the Beta Test Screener
  achievement is not yet complete, show a one-line banner above the podium: "You're in the beta.
  Two quick steps unlock your Beta Screener cosmetics →" linking to `/u/profile#beta`.
- Header avatar / identity dropdown shows a small gold dot until the three steps are done
  (`IdentityDropdown.tsx`), server-decided like the existing owner boolean.
- Step 3 in the card links straight to the marquee ranking (`/r/play` via the existing start
  action), not to `/`.

---

## P2 — hygiene, batch into one commit

- `src/app/manifest.ts`: add 192/512 PNG maskable icons (`public/icons/`); align `theme_color`
  with `viewport.themeColor` (`#0d0d10`).
- `.env.local.example`: add `NEXT_PUBLIC_GA_ID`, `OWNER_EMAIL`. `README.md` says `ADMIN_EMAILS`;
  code reads `OWNER_EMAIL` (`src/lib/proposals-api.ts:56`). Fix the README.
- `src/app/(site)/page.tsx:66`: the homepage `catch` swallows TMDB/Supabase failures silently.
  `console.error` with the cause so Vercel logs show it.
- `PROJECT.md` / `ORIGINAL_REQUEST.md` acceptance boxes: update lint claim once #4 is done.

---

## Non-code launch checklist (JR)
1. Rank 3+ custom lists yourself and opt them into Spotlight so day one is not empty.
2. Set `OWNER_EMAIL` in Vercel; open `/admin` once and confirm it renders.
3. Enable Google OAuth in Supabase prod; send yourself a magic link.
4. Submit one feedback item after #1 ships and confirm it appears in `/admin`.
5. Paste `https://www.movieranker.win/` and one `/l/<id>` into Slack/iMessage and confirm the
   OG card renders (root OG image verified working locally, 1200×630 PNG).

---

## Work packages for delegation

Order: A, B, C, D, E in parallel; then F; then G. Each package otherwise independent; strict file ownership; no `git reset`/`stash`; commit per package on
`beta-improvements-fixes`; run `npx vitest run`, `npx tsc --noEmit`, `npx eslint .` before commit.

| Pkg | Scope | Files owned |
|---|---|---|
| A | P0-1 feedback persistence + admin view | `supabase/migrations/20260909_feedback.sql`, `src/app/api/feedback/*`, `src/components/feedback/FeedbackModal.tsx`, `src/app/(site)/admin/page.tsx`, `src/app/api/admin/feedback/route.ts` (new) |
| B | P1-5 analytics events | `src/lib/analytics.ts` (new), `play-room.tsx`, `SaveGateSheet.tsx`, `ShareButton.tsx`, `PremierePassCard.tsx`, `auth/callback/route.ts` |
| C | P0-2 spotlight cold start, P1-6 two-door hero, P1-9 consensus copy | `home-client.tsx`, `src/lib/trending.ts` + test, `CompletionSummaryCard.tsx`, `e2e-theatrical.test.ts` |
| D | P0-3 pioneer copy, P1-7 floating pill, P1-8 copy pass, P1-10 login cleanup | `BetaWalkthroughCard.tsx` + test, `FloatingFeedback.tsx`, `updates.ts` + test, `about/page.tsx`, `SiteFooter.tsx`, `manifest.ts`, `login/page.tsx` |
| F | P1-11 mobile type scale + list page primary action | `StackedView.tsx`, `RowsView.tsx`, `l/[id]/page.tsx`, `ShareButton.tsx`, `UpvoteButton.tsx`, `SiteFooter.tsx` (font sizes only) |
| G | P1-12 beta path banner + header dot | `l/[id]/page.tsx` (banner slot only, coordinate with F), `IdentityDropdown.tsx`, `BetaWalkthroughCard.tsx` step-3 href, new `src/components/beta/BetaPathBanner.tsx` |
| E | P0-4 lint, all of P2 | `avatars.test.ts`, `challenger-m4-2-stress.test.ts`, `SiteHeader.tsx`, `.env.local.example`, `README.md`, `page.tsx`, `manifest.ts` icons, `PROJECT.md` |

Conflict note: `manifest.ts` appears in D and E; E owns it. `l/[id]/page.tsx` is shared by F and G: F owns the header/action markup, G adds one `<BetaPathBanner />` slot above the podium and nothing else; run G after F. `home-client.tsx` spotlight blurb size belongs to C, not F. `BetaWalkthroughCard.tsx` is D-owned; G changes only the step-3 href, run G after D. `FeedbackModal.tsx` is A-only; D must
not touch it (D changes the placeholder via A — hand that one string to A).
