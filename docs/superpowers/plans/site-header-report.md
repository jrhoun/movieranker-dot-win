# Site Header Report — feat: site header with auth-aware nav

Branch: `feat/v1`

## What shipped

- **`src/components/SiteHeader.tsx`** (new): async server component. Resolves the
  session via `createSupabaseServerClient().auth.getUser()`. Left: "🎬 movieranker"
  link to `/`. Right: signed-out shows "Sign in" → `/login`; signed-in shows
  "My lists" → `/u/me` plus a "Sign out" button.
  - Sign-out is a module-level Server Action (`"use server"`): calls
    `supabase.auth.signOut()` (clears auth cookies via the SSR cookie adapter),
    then `redirect("/")`. No client component needed; header state refreshes
    because both paths end in a fresh server render. Sign-in updates the same
    way: `/login` does `router.push("/u/me")`, which refetches the RSC tree.
  - Styling reuses existing dark-cinema tokens/patterns (`bg-surface`,
    `border-white/10`, `min-h-11` ≥44px targets, `focus-visible:outline-accent`
    rings, `hover:bg-white/10`).

## Route wiring

`/` and `/login` are client pages and cannot import an async server component,
so the four chrome routes moved into a `(site)` route group with one shared
server layout:

- `src/app/page.tsx` → `src/app/(site)/page.tsx`
- `src/app/login/` → `src/app/(site)/login/`
- `src/app/l/` → `src/app/(site)/l/`
- `src/app/u/` → `src/app/(site)/u/`
- New: `src/app/(site)/layout.tsx` rendering `<SiteHeader />{children}`.

Route groups don't change URLs — `/`, `/l/[id]`, `/u/me`, `/login` are
unchanged. `/r/play`, `/api/*`, `/auth/*` stay outside the group and get no
header (the play room keeps its immersive full-viewport layout; its Exit menu
already returns home).

## Verification

- `npm run build` — passes; all routes present at unchanged URLs.
- `npx tsc --noEmit` — clean.
- `npx eslint src` — clean.
- `npm test` — 9 files, 79 tests passed (no new tests; no pure logic extracted).
- No live Supabase/TMDB calls made.

## Notes

- `/u/me` keeps its "Your lists" h1 (page content, not duplicate chrome);
  only the shared bar was added above it.

## Return-to-origin after OAuth / magic link sign-in (feat/v1)

**Problem:** `/auth/callback` hardcoded a redirect to `/r/play` after `exchangeCodeForSession`, so header and `/login` sign-ins dumped users into the ranking room.

**Fix:** thread a validated `next` param through every auth entry point.

- `src/lib/redirect.ts` (new): `safeNext()` — relative paths only (`/...`, not `//...`) else `/`. Open-redirect guard.
- `src/app/auth/callback/route.ts`: redirects to `${origin}${safeNext(?next)}`; error path unchanged (`/?auth_error=1`).
- `src/components/SaveGateSheet.tsx`: OAuth + magic-link redirect URLs now carry `?next=%2Fr%2Fplay` — mid-game conversion still resumes the draft flow.
- `src/app/(site)/login/page.tsx`: all methods honor an incoming `?next=` (password sign-in pushes there; OTP/OAuth forward it to the callback).
- `src/components/SignInLink.tsx` (new, client): header "Sign in" link passes `?next=<pathname>`; omitted on `/login`.
- Tests: `src/app/auth/callback/route.test.ts` — valid next redirects; `//evil.com` and `https://evil.com` fall back to `/`; missing next → `/`; exchange error → `?auth_error=1`.

**Verification:** 96 tests pass (10 files), tsc clean, eslint clean, production build passes. No live traffic.
