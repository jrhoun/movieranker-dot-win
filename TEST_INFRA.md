# E2E Test Infra: MovieRanker Beta Improvements

## Test Philosophy
- Opaque-box, requirement-driven. Derived from `ORIGINAL_REQUEST.md` and user acceptance criteria.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Interaction + Real-World Workloads.
- Execution environment: Vitest (`npm test`) and Turbopack Next.js build (`npm run build`).

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) |
|---|---------|--------|:-----------------:|:-----------------:|:---------------------:|
| 1 | Hero Poster Fan Clearance | R1 | Fan clearance >= 48px, padding class verified | Mobile viewports (360px, 390px, 414px) arcY offset | With card tilt and hover effects |
| 2 | Theater Mode Cinema Blackout | R1 | Curtain drapes darkened ~85% with multiply blend | Contrast & brightness values, projector spotlight | Interactive toggle state during duel |
| 3 | Curator Roulette Layout | R1 | Blurb-filmstrip vertical spacing, alignment | Multi-breakpoint columns (mobile, tablet, desktop) | With filmstrip card selection |
| 4 | Smooth Anchor Scroll | R1 | `#reel` anchor smooth scroll behavior | Missing element fallback | Navigation click flow |
| 5 | Marquee Settled Count Suppression | R5 | Settled count hidden when < 25 | Threshold boundary at exactly 24 and 25 | Preserving proposedBy handle credit |
| 6 | Community Spotlight Filtering | R2 | Marquees excluded (`theme_slug`, `curated`) | Empty list, 0 results, 100+ mixed lists | Sorting modes (top, recent, controversial) |
| 7 | Custom List Opt-In Checkbox | R2 | Wrap-up checkbox controls `visibility` | Unchecked -> unlisted, Checked -> public | Custom ranking save flow |
| 8 | Owner Visibility Toggle | R2 | Owner can toggle spotlight visibility | Non-owner cannot toggle | Instant toggle update on list page |
| 9 | Public Beta Branding Badge | R3 | Vintage cinema BETA badge in header/nav | Viewport responsiveness | Link/tooltip interaction |
| 10 | 3-Step Pioneer Challenge | R3 | Step 1, 2, 3 progression tracking | Completed state vs partial states | User dashboard integration |
| 11 | Beta Canister Cosmetics Unlock | R3 | Unlocks frame.beta, tagline.betamax, avatar.gen.beta-reel | Partial progress denies unlock | Server-side equip verification |
| 12 | In-App Feedback Dialog & API | R4 | Dialog open/close, category selection, submission | Empty message rejection, 2000-char limit | Rate limiting (5 per min) |
| 13 | Release Announcements Update | R4 | September 2026 Public Beta announcement present | Date ordering, required fields | Updates page rendering |
| 14 | Edit Profile Copy Cleanup | R5 | "Edit Profile" title, concise instruction | Legacy copy ("Dressing room") absent | Profile navigation |
| 15 | Collapsible Accordion Panes | R5 | `#tagline` and `#avatar` accordions collapse/expand | Expand all / Collapse all controls | Keyboard accessibility & ARIA |
| 16 | CC0 Avatar Expansion to 12 Seeds | R5 | 72 SVGs across 6 styles in `public/avatars/` | Unique levels 2..100 without collision | Catalogue unlocking progression |

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Target |
|---|----------|--------------------|--------|
| 1 | Complete Public Beta Pioneer Walkthrough | F9, F10, F11, F7 | End-to-end user signs up, claims handle, ranks list with opt-in, unlocks Beta Canister cosmetics |
| 2 | Community Spotlight Curation Flow | F6, F7, F8 | Custom list saved with opt-in appears in spotlight; marquee list never appears; owner toggles visibility |
| 3 | Theater Mode Cinema Duel Experience | F1, F2, F3, F4, F5 | User lands on hero, spins roulette, enters duel, activates blackout theater mode |
| 4 | Profile Customisation & In-App Feedback | F12, F13, F14, F15, F16 | User navigates to Edit Profile, tests accordions and avatars, opens feedback modal and submits feedback |

## Test Execution Commands
- Full suite: `npm test`
- Build verification: `npm run build`
- Type verification: `npx tsc --noEmit`
