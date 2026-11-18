# Review guide

This repo is public. Review comments and incident notes here describe fixed classes of defect only.

## Always
- No secrets, real project URLs, owner emails or tokens in any file or log. Never read or commit `.env.local`; new variables go in `.env.local.example` with a comment saying whether they are server-only.
- `AGENTS.md` applies: this is not the Next.js you know. A diff that uses a Next API you cannot find in `node_modules/next/dist/docs/` is Important.
- `src/lib/marquee-title.test.ts`, `src/lib/rate-limit.test.ts`, `src/lib/ranking.test.ts`, `src/app/api/profile/route.test.ts` and the other `*.test.ts` files enforce their own areas. A diff that loosens an assertion there is Important unless it says why the rule changed.
- Tests are node-only `*.test.ts`. A change to `.tsx` has not been tested until someone ran it in a browser at 360x800 and 1440x900; look for that in the `Verified:` trailer.
- A schema change goes in `supabase/migrations/` and in `supabase/schema.sql`, and says in the PR when the SQL must be applied relative to the deploy.

## Checklist
Check an item only when its trigger matches the diff.

### Client-supplied fields merged into stored profile data
- **Trigger:** the diff edits `src/app/api/profile/route.ts`, `src/lib/profile-showcase-write.ts` or `mergeShowcase`, or adds a field to the showcase or profile shape.
- **Check:** every server-owned field (`lifetimeXp`, `lifetimeXpCurve`, and any new one) is removed from the request body before merging, and every client-writable field is validated against what the server allows (as `avatarClaims` is). Add a case to `route.test.ts` that sends the field. Anything merged by union can never be removed later, so treat it as permanent.
- **Why:** commits 09b90f6 and 10a536e fixed fields a client could set on its own profile (XP, claims); commit 5f947d8 fixed banked XP being converted twice because a curve marker was not tracked.

### Stored value used as a URL, CSS or server fetch
- **Trigger:** the diff touches `opengraph-image.tsx`, `posterUrl` in `src/lib/og-card.tsx`, or builds `url(...)`, an `<img src>` or a `fetch` from a stored `poster_path` or other user-written string.
- **Check:** the value is shape-checked against the TMDB path form and only ever prefixed with the image host; it cannot be a full URL, a `data:` URI or contain a quote or parenthesis. Server-side renderers fetch every `src` from the app server.
- **Why:** commit 96c5eec (a stored URL became an outbound request on every share-card render) and commit 09b90f6 (a stored path reached an unquoted CSS `url()`).

### Marquee theme title or answer on a new surface
- **Trigger:** the diff renders a list title, `session.title`, a theme title, blurb or `theme_slug` in a component, share text, metadata, a card, or passes one as a prop from a server component.
- **Check:** the text goes through `maskListTitle()` in `src/lib/marquee-title.ts`; the live week is masked everywhere, and an unknown week is masked. Check the page source and the RSC payload, not only the visible text.
- **Why:** commits c78e89a and 512e0ff fixed the weekly theme title, which is the quiz answer, showing in the play header, list cards and the home RSC payload.

### Marquee rotation pool changes
- **Trigger:** the diff edits `src/lib/shortlist-themes.ts` or `src/lib/shortlist.ts`, changes the order or length of the theme pool, or changes how an approved proposal joins it.
- **Check:** compute `tonightsShortlist` for the current week before and after the change. It must return the same theme. The pool is indexed by `week % length`, so a length change re-maps every week; place the live theme at its new index, and state the deploy deadline if the week would change.
- **Why:** commit ce7ef5e fixed an approval that changed the live theme mid-week; `docs/marquee-theme-review-2026-09-28.md` section 2 describes the index arithmetic.

### Query that counts or aggregates lists across users
- **Trigger:** the diff adds a Supabase query over `lists` or `list_movies` for stats, a spotlight, a community verdict, trending or a comparison.
- **Check:** it filters `status` and `visibility` explicitly (`.in("visibility", ["unlisted","public"])`), because the owner's own rows are also readable by the owner policy and would make numbers differ by viewer. Add a test that issues the filter.
- **Why:** the shortlist build report, "themed verdict privacy fix": private rooms counted in an owner's aggregate.

### Swallowed error or fire-and-forget write
- **Trigger:** the diff adds a `catch` that returns an empty or default value, ignores a Supabase `error`, or does an unchecked `update`/`rpc` whose result is dropped.
- **Check:** the error is logged or surfaced (a typed error, a 4xx/5xx with plain words), and a test covers the failure path. A routine conflict such as a unique-index hit returns 409 with a sentence, not a raw 500.
- **Why:** commit 4ff0bf2 (a failing query showed only "Coming Soon"); commit b06efa9 (an unchecked ratchet update failed silently); commit 0b085bb (a taken Marquee week reached the owner as a raw database error).

### SQL migration with grants, policies or functions
- **Trigger:** the diff adds or edits a file in `supabase/migrations/` or `supabase/schema.sql` that changes a grant, an RLS policy or a function.
- **Check:** the app code on main works both before and after the SQL is applied, or the PR names the order (app first, then SQL). A `SECURITY INVOKER` function does not get `set search_path = ''` while it uses unqualified table names. A new foreign key to `auth.users` or `lists` has an `ON DELETE` action, and `src/app/api/account/delete/route.ts` still removes the account.
- **Why:** commit b06efa9 (SQL applied before the app moved to the new RPC, so profile saves failed); the deferred-minors report (an empty `search_path` broke `save_list` at runtime); the security sweep report finding 1 (a foreign key without `ON DELETE` made account deletion fail halfway), fixed in 131b042.

### User text in the header, nav or a card
- **Trigger:** the diff renders a handle, list title, participant name or film title in the site header, nav, identity pill, podium or a fixed-width card.
- **Check:** at 360 wide with a 12+ character handle and a long title, there is no horizontal scroll and nothing is cut without a way to read it (truncate with the full text as the accessible name, or wrap).
- **Why:** commit 613ea4a (a long handle made every signed-in page scroll sideways on a phone); commit 1acef13 (podium titles were truncated on the consensus screen).

### Share card or link preview
- **Trigger:** the diff edits `opengraph-image.tsx`, `generateImageMetadata`, or the data a share card draws.
- **Check:** the image id is a fingerprint of what the card draws, so a changed list gets a new URL; the card and the page agree on who is #1.
- **Why:** commit 2baab84: previews kept an old podium because the image path carried only a build hash.

### Ranking engine constants
- **Trigger:** the diff changes `K`, the close-call band, tie tolerance, the stability test or vote budgets in `src/lib/ranking.ts`.
- **Check:** run the seeded simulation in `ranking.test.ts` for 6, 12 and 20 films; a finished six-film ranking must not read as "Early result" or "still too close" by construction, and an intransitive player must reach a hard stop.
- **Why:** commit bce884b: with the old band, every six-film Marquee ended as an early result; the UX feedback report's stability simulation showed lists of 12 to 20 films never settling.

### New write route
- **Trigger:** the diff adds a `POST`, `PATCH` or `DELETE` handler under `src/app/api/`.
- **Check:** it checks the session first, applies `rateLimit` from `src/lib/rate-limit.ts` with a constant in `LIMITS`, validates the size and shape of the body, relies on RLS for ownership, and is covered by a test for 401, the limit (429 with `Retry-After`) and a bad body.
- **Why:** the trust and compliance report, round 2: every write route got an abuse limit.

### Test or source imports a package that is not in package.json
- **Trigger:** the diff adds an `import` of a package, or edits `package.json` dependencies.
- **Check:** the package is listed in `package.json`, and `npm ci && npm run build` works on a clean tree. A test must not write into `public/`.
- **Why:** commit e6e0492: a test imported hand-installed packages and rewrote committed SVGs, and a clean install failed to build.

## Findings
Tag each finding Important, Nit or Pre-existing. Pre-existing problems are reported apart and never held against the change.
