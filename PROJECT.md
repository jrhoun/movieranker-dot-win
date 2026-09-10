# Project: MovieRanker Public Beta Improvements & Bug Fixes

## Architecture
- **Framework**: Next.js 16.3.2 App Router (Turbopack), React 19, Tailwind CSS, Vitest.
- **Client/Server Structure**:
  - `src/app/(site)/*`: Site pages and client components.
  - `src/app/r/play/*`: Film ranking and duel room arena.
  - `src/app/api/*`: Route handlers for lists, feedback, profile, cosmetics equip.
  - `src/lib/*`: Core business logic, trending algorithms, gamification, cosmetics catalogue.
  - `src/components/*`: Reusable UI components (header, footer, modals, roulette, list controls).
  - `public/avatars/*`: Pre-generated CC0 SVG avatar library.
- **Database**: Supabase PostgreSQL. Existing schemas for `lists` (`visibility`, `theme_slug`, `curated`), `profiles`, etc.

## Feature Inventory
Every requirement and task from `ORIGINAL_REQUEST.md` and reference plan:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Hero Poster Fan Clearance | Expand `pb-8` to `pb-14` (>= 48px) in `home-client.tsx` to eliminate card clipping on mobile (360-414px) and hover | M1 | R1 |
| 2 | Theater Mode Cinema Blackout | Darken velvet drapes (`.bg-curtain-soft`) by ~85% with multiply blend and deep blackout in `globals.css` / `play-room.tsx` with sharp duel card projector spotlight | M1 | R1 |
| 3 | Curator Roulette Layout Hierarchy | Eliminate dead vertical space between blurb and filmstrip, balance columns with `lg:items-start lg:gap-8` | M1 | R1 |
| 4 | Smooth Anchor Scroll | Add smooth scroll to "or spin a reel while you wait" anchor link (`#reel`) in `home-client.tsx` | M1 | R1 |
| 5 | Marquee Settled Count Suppression | Hide "X rankings settled this week" marquee text when fewer than 25 settled in `home-client.tsx`, keeping theme credit | M1 | R5 |
| 6 | Community Spotlight Marquee Exclusion | Filter out weekly Marquee lists (`!l.theme_slug && !l.curated`) from `formatTrendingLists` in `src/lib/trending.ts` | M2 | R2 |
| 7 | Custom List Opt-In Checkbox | Add "Submit to Community Spotlight" opt-in checkbox during ranking wrap-up (`play-room.tsx`, `SaveGateSheet.tsx`) defaulting to unlisted | M2 | R2 |
| 8 | Owner Visibility Toggle | Add in-place visibility toggle for list owners on list page (`l/[id]/page.tsx`, `OwnerControls.tsx`) | M2 | R2 |
| 9 | Public Beta Branding Badge | Vintage cinema-styled BETA badge next to logo in `SiteHeader.tsx` (`BetaBadge.tsx`) | M3 | R3 |
| 10 | 3-Step Pioneer Challenge | Onboarding walkthrough on user dashboard tracking sign in, handle claim, public list contribution (`BetaWalkthroughCard.tsx`) | M3 | R3 |
| 11 | Beta Canister Cosmetics Unlock | Unlock `avatar.gen.beta-reel`, `frame.beta`, and `tagline.betamax` upon Pioneer Challenge completion with twin definitions in `og-card.tsx`, `classes.ts`, `globals.css`, and server equip validation | M3 | R3 |
| 12 | In-App Feedback Dialog & API | Native `<dialog>` modal (`FeedbackModal.tsx`) with category, message, email, triggered via nav/footer; `POST /api/feedback` route with rate limit | M4 | R4 |
| 13 | Release Announcements Update | Prepend September 2026 Public Beta announcement in `src/data/updates.ts` | M4 | R4 |
| 14 | Edit Profile Copy Cleanup | Rename "Dressing room" to "Edit Profile", remove cumbersome intro, rewrite featured ranking instruction | M5 | R5 |
| 15 | Collapsible Accordion Panes | Make `#tagline` and `#avatar` long categories collapsible with accessible accordions and expand/collapse controls | M5 | R5 |
| 16 | CC0 Avatar Expansion to 12 Seeds | Expand CC0 styles to 12 seeds each (72 total SVGs in `public/avatars/`), pacing levels across 2..100 without collision | M5 | R5 |
| 17 | Comprehensive Test Suite & E2E Validation | Pass 100% Vitest suites, clean Turbopack build, zero TypeScript errors, zero lint violations | M6 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | UI Theatrics & Responsive Polish | Features 1, 2, 3, 4, 5 (hero fan, theater mode, roulette layout, smooth scroll, marquee count suppression) | none | DONE |
| M2 | Community Spotlight & Custom List Opt-In | Features 6, 7, 8 (spotlight filter, opt-in checkbox, owner visibility toggle) | none | DONE |
| M3 | Beta Branding, Pioneer Challenge & Cosmetics | Features 9, 10, 11 (BetaBadge, BetaWalkthroughCard, beta_pioneer achievement, frame/tagline/avatar cosmetics) | none | DONE |
| M4 | Feedback Dialog & Release Announcements | Features 12, 13 (FeedbackModal, POST /api/feedback, updates.ts) | none | DONE |
| M5 | Copy Cleanup, Collapsible Panes & Avatars | Features 14, 15, 16 (Edit Profile copy, collapsible accordions, 72 CC0 SVGs + pacing) | none | DONE |
| M6 | Final E2E Verification & Hardening | Feature 17 (100% test pass, clean build, acceptance criteria check, adversarial review, audit) | M1..M5 | DONE |

## Interface Contracts
### Trending Filtering Contract (`src/lib/trending.ts`)
- `formatTrendingLists(lists: RawDbListRow[], profileHandles?: Map<string, string>, sortMode?: TrendingSortMode): TrendingListSummary[]`
- Must strictly filter: `l.status === "done" && l.visibility === "public" && !l.theme_slug && !l.curated`

### List Visibility Contract (`POST /api/lists`, `PATCH /api/lists/[id]`)
- Payload schema: `{ ..., visibility?: "public" | "unlisted" | "private" }`
- Wrap-up opt-in checkbox unchecked -> `visibility: "unlisted"`; checked -> `visibility: "public"`.

### Pioneer Challenge & Cosmetic Unlock Contract
- Achievement ID: `beta_pioneer` in `src/lib/gamification.ts`. Description must not end with a period (`.`).
- Unlocked items:
  - `avatar.gen.beta-reel` -> requires `public/avatars/beta-reel.svg`.
  - `frame.beta` -> requires entry in `FRAMES`, `FRAME_CLASS` (`.cf-beta` in `globals.css`), and `FRAME_STYLE` in `og-card.tsx`.
  - `tagline.betamax` -> "Betamax was better".
- Stats schema in `AchievementStats`: `{ publicDoneLists?: number; hasHandle?: boolean; isSignedIn?: boolean; ... }`.
- Must be passed in both `profile-data.ts` (client) and `api/profile/route.ts` (server equip validation).

### Feedback API Contract (`src/app/api/feedback/route.ts`)
- Endpoint: `POST /api/feedback`
- Body JSON: `{ category: "bug" | "idea" | "other", message: string, email?: string }`
- Validation: category must be valid, message trimmed length 1..2000, email optional string.
- Response: `{ ok: true }` (HTTP 200) or `{ error: string }` (HTTP 400/429/500).

### Avatar Asset & Progression Contract
- 6 CC0 styles: `adventurer-neutral`, `bottts-neutral`, `initials`, `lorelei-neutral`, `micah`, `shapes`.
- 12 seeds per style = 72 SVGs in `public/avatars/` + `manifest.json`.
- Each `avatar.gen.<filename>` must exist as `public/avatars/<filename>.svg`.
- Level-gated avatars must have unique unlocked levels <= 100 with zero collision.

## Code Layout
- `src/app/(site)/home-client.tsx` (M1 - DONE)
- `src/app/globals.css` (M1 - DONE; M3)
- `src/components/roulette/CuratorRoulette.tsx` (M1 - DONE)
- `src/app/r/play/play-room.tsx` (M1 - DONE; M2 - DONE)
- `src/lib/trending.ts` (M2 - DONE)
- `src/components/SaveGateSheet.tsx` (M2 - DONE)
- `src/app/(site)/l/[id]/page.tsx` (M2 - DONE)
- `src/components/list/OwnerControls.tsx` (M2 - DONE)
- `src/components/BetaBadge.tsx` (M3)
- `src/components/BetaWalkthroughCard.tsx` (M3)
- `src/components/SiteHeader.tsx` (M3, M4)
- `src/components/SiteFooter.tsx` (M4)
- `src/lib/gamification.ts` (M3)
- `src/lib/cosmetics/*` (M3, M5)
- `src/lib/og-card.tsx` (M3)
- `public/avatars/*` (M3, M5)
- `src/components/feedback/FeedbackModal.tsx` (M4)
- `src/app/api/feedback/route.ts` (M4)
- `src/data/updates.ts` (M4)
- `src/app/(site)/u/profile/customise/*` (M5)

## Acceptance Criteria & Quality Guardrails
- [x] Vitest test suites pass 100% with zero failures.
- [x] TypeScript type checks pass (`tsc --noEmit`) with zero errors.
- [x] ESLint checks pass with zero errors; unused imports and `any` types resolved (Package E).

