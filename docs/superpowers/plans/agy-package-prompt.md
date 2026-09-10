You are implementing work package **__PKG__** from the brief at docs/superpowers/plans/2026-09-09-beta-launch-readiness.md in this repo (Next.js 16 App Router, React 19, Tailwind v4, Supabase, Vitest). Read the brief first, in full. Then read AGENTS.md and follow it: this Next.js version differs from your training data, so check node_modules/next/dist/docs/ before using an API you are unsure of.

Rules, non-negotiable:
- Implement ONLY the items assigned to package __PKG__ in the "Work packages for delegation" table, and touch ONLY the files that row lists (plus new test files sitting next to those files). Other packages are running in parallel in this same working tree on other files. If you believe you must touch a file you do not own, stop and write why in your final report instead.
- Do NOT run git commit, git add, git stash, git reset, git checkout, or anything that changes git state. Leave your changes in the working tree; the reviewer commits.
- Do NOT push, deploy, or touch the live Supabase project. A migration is a .sql file in supabase/migrations only.
- Follow existing code style and the project's copy voice (plain, short, no marketing filler). Preserve existing comments.
- Write or update Vitest tests for behaviour you change. Then run: `npx vitest run <your test files>`, `npx tsc --noEmit`, `npx eslint <your files>`. Fix what you broke. Do not edit tests you do not own to make them pass; report instead.
- Finish with a report: files changed, what each change does, test results (paste the summary lines), and anything you could not do and why.
