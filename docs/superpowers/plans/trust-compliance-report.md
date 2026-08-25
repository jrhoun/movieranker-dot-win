# Trust & Compliance Report — movieranker.win v1

Branch: `master` · Commits: `2e38f17`, `6a64d80`, `547efcf`

## What shipped

### 1. Copy fix
- `src/components/CandidateTray.tsx`: placeholder + aria-label changed from "Session title…" to "List title… e.g. Best Sci-Fi" (example kept).

### 2. Site footer
- New `src/components/SiteFooter.tsx`: slim muted single row "© 2026 movieranker.win · About · Privacy · Terms", thin gold rule matching the header. Rendered after children in `src/app/(site)/layout.tsx`.

### 3. Static pages
- `src/app/(site)/about/page.tsx` — what the site is, built by JR Houn, contact placeholder.
- `src/app/(site)/privacy/page.tsx` — plain-language policy covering actual app facts: stored data (email, lists/titles/descriptions/participants/votes aggregated into scores), the single strictly-necessary Supabase auth cookie + localStorage for in-progress games, third parties (Supabase, TMDB), rights (JSON export, immediate account deletion from My Lists).
- `src/app/(site)/terms/page.tsx` — decency rule for participant names/descriptions with removal right, as-is/no-warranty, suspension for abuse, TMDB attribution with non-endorsement.
- All three are dark-house prose on surface cards with marquee headings per DESIGN.md; no curtain treatment behind content.

### 4. Account self-service (`/u/me`)
- New "Account" section under the grid via `src/components/profile/AccountSection.tsx`.
- Export: `GET /api/account/export` returns `{ exported_at, lists }` as a JSON attachment (`Content-Disposition: attachment; filename="movieranker-lists.json"`); RLS-scoped query. Client downloads via blob.
- Deletion: inline confirm requiring typing DELETE with prominent warning ("This permanently erases your account and every list you've made."). `POST /api/account/delete` verifies session → deletes owned lists (RLS; movies cascade) → deletes the auth user via `supabase.auth.admin.deleteUser(userId)` on a service-role client → signs out and redirects to `/?bye=1`.
- New `src/lib/supabase/admin.ts`: service-role client from `SUPABASE_SERVICE_ROLE_KEY`, server-only by convention (never imported client-side).
- `.env.local.example`: service-role key comment updated (server-side only, powers account deletion).

## Verification
- `npm test` — 130/130 passing (15 files), incl. new tests: export shape/401/empty-lists; delete flow asserting RLS list delete before service-role `deleteUser(userId)` call, 401 unauthenticated touching nothing, 403 aborting before admin call, 500 without sign-out when admin deletion fails.
- `npx tsc --noEmit` clean · `npx eslint` clean · `next build` passes (all new routes present).

## Notes / concerns
- **Legal text is template-quality, not legal advice** — About/Privacy/Terms should get a real review before being treated as binding.
- Contact email is the literal placeholder `[CONTACT]` in `src/lib/site.ts` (`CONTACT_EMAIL`) — replace before launch (TODO marked in code).
- The home page does not yet surface anything special for `/?bye=1` (bare redirect target only); add a farewell toast if desired.

---

# Trust & Safety Round 2 — legal gaps + abuse limits

Branch: `master`

## What shipped

### A. Legal page gaps
- `src/app/(site)/privacy/page.tsx` — new "Who can use the site" (13+, note on 16+ jurisdictions) and "How long we keep it" sections; "Third parties" extended with processing roles: Supabase (EU/US hosting, auth, database), TMDB (movie metadata/poster images); no other sharing, no sale ever. Existing copy untouched.
- `src/app/(site)/terms/page.tsx` — new "Your content" (non-exclusive worldwide display license, you own your lists), copyright/reporting line folded into "Movies & posters" via `[CONTACT]` placeholder (`CONTACT_EMAIL` in `src/lib/site.ts`, same marked-editable pattern as About), and "Governing law" (State of Texas; disputes in Texas courts). Existing suspension clause untouched.

### B. Abuse limits
- New `src/lib/rate-limit.ts`: tiny sliding-window limiter keyed by userId (fallback: first `x-forwarded-for` IP). Constants in `LIMITS`: lists writes 20/min, proposals 5/min, account delete 3/hour. Injected clock → pure and unit-tested.
- Wired into POST/PATCH/DELETE `/api/lists` (+ `/api/lists/[id]`), POST `/api/proposals`, POST `/api/account/delete` — 429 `{ error }` with `Retry-After` header.
- `docs/qa-checklist.md`: appended "Abuse & moderation" section (email confirmation ON, proposal queue as content gate, `[CONTACT]` placeholder, rate-limit constants/tuning).

## Verification
- `npm test` — 148/148 passing (17 files), incl. new rate-limiter tests: limit enforcement + Retry-After value, window-boundary edge (hit at exactly `now - windowMs` is expired; one ms earlier still counts), key isolation, floor of 1s Retry-After.
- `npx tsc --noEmit` clean · `npx eslint` clean · `next build` passes.

## Notes / concerns
- **Legal text is template-quality, not legal advice** — recommend a generator/professional review before any EU-facing marketing (COPPA/GDPR age and consent nuances are jurisdiction-specific).
- Rate limiter is in-memory per instance (`ponytail:` comment in code); upgrade path documented in code and qa-checklist.
- Account-delete limiter keys directly on userId (no anonymous traffic reaches that route).
