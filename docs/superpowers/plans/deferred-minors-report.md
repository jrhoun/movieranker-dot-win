# Deferred Minors Sweep — Report (items 5–12)

Branch `feat/v1`. Items 1–4 were already committed as ba5b34b (not repeated here).
All work landed in four logical commits; no live network calls were made, `.env.local`
was never read, and no raw API payloads appear in this report.

## Commits

| Commit | Message | Items |
|---|---|---|
| 937b69f | feat: real keyword search | 5, 6 |
| 583c55a | fix: a11y tabs + touch affordances | 7, 8 |
| c7cb607 | fix: atomic save_list rpc + resume safety | 9, 10 |
| e5da6f0 | chore: remaining minors | 11, 12 |

## What changed

### Item 5 — empty/whitespace `q` returns 400 (937b69f)
`src/app/api/search/route.ts`: a `Q_MODES` allowlist (`person`, `company`,
`keyword`, `title`) short-circuits with `{ error: "q required" }`, status 400,
when `q.trim()` is empty. `company-discover` and `person-credits` are ref-based
and unaffected. New `src/app/api/search/route.test.ts` covers the guard for all
four modes (asserting zero TMDB-layer calls) plus ref-mode behavior.

### Item 6 — real keyword semantics (937b69f)
`src/lib/tmdb.ts`: new `searchByKeyword(q)` calls `GET /search/keyword?query=`,
takes the first result's id, then discovers via
`GET /discover/movie?with_keywords=<id>&sort_by=popularity.desc`, merging pages
1–3. The page-merge logic was extracted into a shared `discoverMovies(params)`
helper that `discoverByCompany` also uses (same 3600s revalidate window). No
keyword match returns `[]`. Results flow through `toCredit`, so the shared credit
shape (incl. `shapeCredits` consumers) is preserved. Route handler now maps
`mode=keyword` to `searchByKeyword`. Tests in `tmdb.test.ts` stub `fetch`
(no network): no-match → `[]`; first-keyword-id routing, pages 1–3 fetched,
popularity-desc sort param verified.

### Item 7 — ARIA tabs pattern (583c55a)
New shared component `src/components/Tabs.tsx`: roving-tabindex tablist with
automatic activation (`ArrowLeft`/`ArrowRight` wrap, `Home`, `End`), tabs expose
`role="tab"` + `aria-selected` + `aria-controls="${idPrefix}-panel"` +
`id="${idPrefix}-tab-<key>"`. Both call sites converted:

- `SearchPanel.tsx`: mode tabs rendered via `<Tabs idPrefix="search-mode">`; the
  results area is now `role="tabpanel"` with `id="search-mode-panel"` and
  `aria-labelledby` pointing at the active tab.
- `ViewToggle.tsx`: layout tabs via `<Tabs idPrefix="view-toggle">`;
  `ListViews.tsx` marks both view containers as `tabpanel`s with matching ids /
  `aria-labelledby`, focusable only while visible.

### Item 8 — CandidateTray remove affordance (583c55a)
The "×" badge on candidate posters is now always visible at reduced opacity
(`opacity-60`), reaching full opacity on hover or keyboard focus instead of
being hover-only.

### Item 9 — atomic `save_list` RPC (c7cb607)
`supabase/schema.sql`: added `save_list(p_id text, p_title text,
p_participants text[], p_status text, p_movies jsonb)` — `security invoker` so
RLS applies, `set search_path = ''` for safety. It inserts into `lists` (owner =
`auth.uid()`) and `list_movies` via `jsonb_to_recordset` with the same defaults
the route previously applied client-side (`elo` 1000, `comparisons` 0,
`parked` false). A comment above the function notes it must be re-run after any
future schema change.
`POST /api/lists` (`src/app/api/lists/route.ts`) now issues a single
`supabase.rpc("save_list", {...})` replacing the two-step list+movies inserts;
movie rows still go through `fullMovieRow` so validation/default behavior is
unchanged. `route.test.ts` mock gained an `rpc()` recorder; assertions verify
one rpc call, its arguments, and RLS-denial → 403 mapping.

### Item 10 — resume safety on home page (c7cb607)
`src/app/page.tsx`: starting a new ranking reads the anonymous localStorage
session at interaction time (no hydration concerns). If `mr-session` holds ≥2
movies, an inline confirm card (`role="alertdialog"`) replaces `window.confirm`:
"You have an unfinished ranking." with **Resume** (→ `/r/play`) and **Start
fresh** (clears the session, then proceeds). Sessions under 2 movies proceed
without prompting.

### Item 11 — `NEXT_PUBLIC_SITE_URL` (e5da6f0)
`shareUrl()` in `src/app/l/[id]/page.tsx` prefers
`process.env.NEXT_PUBLIC_SITE_URL` (trailing slash trimmed) and falls back to
the existing host/proto resolution when unset. `.env.local.example` gains an
optional commented `NEXT_PUBLIC_SITE_URL=` line.

### Item 12 — ListCard cleanup (e5da6f0)
Removed the redundant per-poster re-mapping before `triptychSlots`; the generic
helper now receives `list.posters` directly (identical output).

## Verification

- `npm test`: 72 passed (was 61), 9 files — grows by 11 tests.
- `npx tsc --noEmit`: clean.
- `npx eslint`: 0 errors.
- `npm run build`: passes (10 routes prerendered/generated).

## Concerns / notes

- The `save_list` RPC must be executed in the Supabase dashboard **before**
  deploying the POST route change, otherwise saves fail (route surfaces DB
  errors via the existing 500 path). The schema file carries the re-run note.
- Keyword search resolves only TMDB's *first* keyword match, per spec; very
  ambiguous queries may discover an unexpected theme. Upgrade path: let users
  pick from multiple keyword matches (two-step like person/company).
- `Tabs` activates selection on arrow-key movement (automatic activation),
  which both current tablists want since switching is cheap and stateless.
