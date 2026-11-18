---
name: verify
description: Run before committing a behavior change in movieranker-dot-win (the Next.js app in src/, Supabase SQL in supabase/). Cheap checks, boot the dev server, drive the changed page in a browser at phone and desktop size, report.
---

# Verify (movieranker-dot-win)

Next.js 16 App Router, React 19, Tailwind 4, TypeScript, Supabase, vitest. `AGENTS.md` says this Next.js has breaking changes: before using a Next API you are unsure of, read the matching guide in `node_modules/next/dist/docs/`. `TEST_INFRA.md` maps features to tests.

## 1. Cheap checks

Run from the repo root, in this order. Times were measured on this PC (WSL2, Node 22).

| Step | Command | Time |
|---|---|---|
| Install (fresh tree) | `npm ci` | 2 min 14 s |
| Route types (fresh tree, needed by tsc) | `npx next typegen` | under 1 s |
| Lint | `npm run lint` | 10 s |
| Types | `npx tsc --noEmit` | 9 s |
| Unit tests, targeted | `npx vitest run <path-or-name>` | under 1 s for one file |
| Unit tests, files related to your diff | `npx vitest related --run <changed src files>` | about 3 s |
| Unit tests, everything | `npm test` | 15 s (118 files, 2005 tests) |

- Without `next typegen` (or an earlier `next build`/`next dev`), `tsc` fails with `Cannot find name 'LayoutProps'` in `src/app/layout.tsx`. That is a missing generated file, not your change.
- Lint prints 8 warnings on main and no errors. Fix errors and any warning your diff adds.
- Tests are `src/**/*.test.ts` in a node environment. There are no component or browser tests, so a change to `.tsx` is not verified by `npm test`.
- `npm test` is quick enough to run on every commit. `npm run build` runs once per PR (not timed here; it needs the env file below).

## 2. Run the change

There is no e2e suite. Running the app in a browser is the check for any UI, route or API change.

**Env.** `npm run dev` needs `.env.local`. Do not read or print it. The variable names are in `.env.local.example`. Before you drive any flow that writes (save a list, edit a profile, delete an account, propose a theme, send feedback), confirm with JR, or from the file's variable names in a way that does not print values, that `NEXT_PUBLIC_SUPABASE_URL` points at a non-production Supabase project. If you cannot tell, drive only the read-only paths and say so in the trailer. Never run the SQL in `supabase/` against the live project.

**Boot.**

```bash
npx next typegen && npm run dev      # http://localhost:3000
```

**Drive** with Playwright or Chrome DevTools MCP, at 360x800 and at 1440x900:

- Core flow, signed out: `/` then search a title (TMDB through `/api/search`), add at least three films to the tray, start ranking, vote through `/r/play`, reach the finish screen. A signed-out ranking is kept in the browser, so it writes nothing until you save.
- Save, sign-in, profile (`/u/me`, `/u/<handle>`), list pages (`/l/<id>`) and `/admin` need a signed-in test account on the non-production project.
- Look at the changed page and the pages that share its component. Use `docs/qa-checklist.md` for what a screen should do (focus order, the double-tap vote guard, safe-area padding).
- At 360 wide, check there is no horizontal scroll (`document.documentElement.scrollWidth` equals the viewport width), with a long handle and a long list title where the change shows user text.
- Console: no errors or hydration warnings. Network: no failed or repeated requests, no 4xx or 5xx you did not expect. Server log (the `npm run dev` terminal): no stack traces.
- For an API route, also call it with `curl` signed out and expect 401 (or 404 for `/api/admin/*`).

Stop the dev server when you finish, and close the browser you opened.

## 3. Heavier checks

- `npm run build` once per PR, and when the diff touches `next.config.ts`, route segment config, metadata or `opengraph-image.tsx`.
- Diffs under `supabase/`: say in the PR which SQL runs when, and apply it only to a non-production project.
- Share cards: load `/l/<id>/opengraph-image` and `/u/<handle>/opengraph-image` in the browser and look at them.
- There is no performance or Lighthouse gate in this repo. Do not claim one.

## 4. Report

Put in the `Verified:` trailer what ran on that commit, for example:

`Verified: lint, tsc, npm test; ran dev server, /r/play at 360x800 and 1440x900, signed out; no save flow driven`

Docs-only commits: `Verified: none (docs only)`. Say plainly if you could not run the app, or ran it against nothing but read paths. Never list a check that did not run.

## 5. Stop rule

After three fix rounds on the same failing check, stop and report: the command, the output, what you tried.
