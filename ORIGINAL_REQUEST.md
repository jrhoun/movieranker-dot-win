# Original User Request

## Initial Request — 2026-09-09T00:14:05Z

Implement the 12 bugs, enhancements, and public beta feature updates for MovieRanker from the spec and implementation plan on branch `beta-improvements-fixes`. Do not push to main or remote; all work must remain local on the branch for test driving.

Working directory: /home/jrhoun/projects/movieranker-dot-win
Branch: beta-improvements-fixes
Integrity mode: development

Reference plan: docs/superpowers/plans/2026-09-08-bugs-and-improvements.md

## Requirements

### R1. Front-End UI, Theatrics & Responsive Polish
- Eliminate homepage hero poster clipping across mobile (360px–414px) and desktop viewports, accounting for card tilt, arc, and hover transforms.
- Enhance the "Dim the Lights" theater mode into a dramatic cinema blackout by darkening the velvet curtain drapes by ~85% with multiply blending while concentrating a high-contrast projector spotlight on the two active duel cards.
- Fix the layout hierarchy on the Curator Roulette card by removing dead vertical space between blurb and filmstrip and rebalancing columns across breakpoints.
- Add smooth scrolling to the "or spin a reel while you wait" anchor link.

### R2. Community Spotlight Filtering & Custom List Opt-In
- Filter out weekly Marquee runs from the homepage Community Spotlight (formatTrendingLists), preserving Community Spotlight exclusively for custom community lists.
- Provide an explicit "Submit to Community Spotlight" opt-in checkbox when completing custom rankings (defaulting to unlisted if unchecked), as well as a visibility toggle for owners on their list page.

### R3. Public Beta Branding & 3-Step Pioneer Challenge
- Add a vintage cinema-styled BETA badge next to the logo in the header and navigation.
- Implement a 3-step interactive onboarding card on the user dashboard tracking: (1) create account / sign in, (2) claim a handle, and (3) rank one list and contribute it publicly.
- When all 3 are completed, unlock the exclusive Beta Canister granting all three cosmetics: Beta Reel Avatar (avatar.gen.beta-reel), Beta Cassette Frame (frame.beta), and the tagline "Betamax was better" (tagline.betamax).

### R4. In-App Feedback & Release Announcements
- Build an accessible in-app feedback dialog (accessible via nav and footer) with category selection (Bug, Idea, Other), message textarea, and email input, backed by POST /api/feedback.
- Add a September 2026 Public Beta release announcement to src/data/updates.ts detailing the public beta launch (4–6 week duration), the Pioneer Challenge, Curator Roulette, and theater enhancements.

### R5. Copy Cleanup, Collapsible Panes & Avatar Expansion
- Replace robotic AI-sounding prose: rename "Dressing room" to "Edit Profile", remove the cumbersome intro copy, and rewrite the featured ranking instruction into concise, natural prose.
- Make the long scrolling categories on the Edit Profile page (#tagline and #avatar) collapsible with accessible accordions and expand/collapse controls.
- Suppress the "X rankings settled this week" marquee text when fewer than 25 rankings have finished, while preserving the "Theme proposed by @handle" credit.
- Expand the CC0 avatar catalogue to 12 seeds per style (72 total SVGs across the 6 CC0 styles) and update catalogue progression pacing without adding gradients.

## Acceptance Criteria

### Verification & Test Guardrails
- [ ] npm test passes 100% of Vitest test suites with zero failures.
- [ ] npm run build succeeds cleanly with zero TypeScript errors and zero lint violations.
- [ ] Weekly Marquee lists (theme_slug != null or curated: true) never render inside Community Spotlight.
- [ ] Completing the 3 Pioneer steps unlocks frame.beta, tagline.betamax, and avatar.gen.beta-reel in the user's owned cosmetics.
- [ ] Hero poster fan in home-client.tsx provides at least 48px vertical padding/clearance (pb-12 or pb-14) and does not clip cards on mobile viewports.
- [ ] All 12 seeds per CC0 style are generated and committed as valid SVGs in public/avatars/ with no non-CC0 assets.
- [ ] Work remains entirely on git branch beta-improvements-fixes with no commits pushed to main or remote.
