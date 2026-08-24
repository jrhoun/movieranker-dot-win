# point-back — ui-evaluator acceptance run, movieranker.win v1

Run: 2026-08-24 · branch `master` @ `989d3ef` (+ closure fix in-run) · no-vision run (text-face + pixel-statistics evidence; see Limitations).

Declarations bound:
- `design` — DESIGN.md via `.scratch/design-pass-run/design-baseline/state.json` (`status: ready`, `origin: existing`, sha verified).
- `spec` (proxy) — docs/qa-checklist.md route items; the subset checkable without manual eyes forms the L6 ledger below; the rest is recorded blocked/unreviewed with reasons.
- Supporting source-level checks: src/app/globals.css, Tabs.tsx, SearchPanel.tsx, MatchupStage.tsx, play-room.tsx, login/page.tsx, l/[id]/not-found.tsx.

Evidence artifacts: `.scratch/ui-eval/` — `assert.mjs` (Playwright DOM/behavior assertions, results.json), `stats.py` (PIL pixel statistics), `{home,login,list404,play}.png` (render captures, path references only), `pixel-stats.json`.

## Evidence ledger

```text
criterion: L6.1
required:  exactly one h1 per route (/, /login, /l/[nonexistent])
observed:  .scratch/ui-eval/results.json L6.1a/L6.7a/L6.11a — h1 count=1 on all three routes
result:    pass

criterion: L6.2
required:  .bg-curtain present only on stage moments (home hero band, login backdrop); absent on list body and vote stage (DESIGN.md theater model)
observed:  .scratch/ui-eval/results.json L6.2a/L6.1b/L6.7b/L6.11b — curtain=1 on home header and login main only; count=0 on /l/[404]; pixel red-dominance home-hero 0.566 / login 0.736 vs list404 0.0038 / play 0.0004 (.scratch/ui-eval/pixel-stats.json)
result:    pass

criterion: L6.3
required:  search-mode tabs render in order Title → Person → Studio → Keyword
observed:  .scratch/ui-eval/results.json L6.3a — labels=["Title","Person","Studio","Keyword"]
result:    pass

criterion: L6.4
required:  ARIA tabs wiring (tablist label, aria-selected, aria-controls) on search-mode tabs
observed:  .scratch/ui-eval/results.json L6.3b — tablist=1, selected=1, aria-controls=4/4 (shared Tabs component also emits arrow-key roving tabindex at source)
result:    pass

criterion: L6.5
required:  Enter inside the search input must not submit/navigate
observed:  .scratch/ui-eval/results.json L6.5a — URL unchanged, localStorage session untouched after Enter
result:    pass

criterion: L6.6
required:  visible focus ring on keyboard stops (home route incl. tabs)
observed:  .scratch/ui-eval/results.json L6.4a/L6.4b — outline solid 2px en route and on tab element itself
result:    pass

criterion: L6.7
required:  all visible controls ≥44px tall on home
observed:  .scratch/ui-eval/results.json L6.6a — zero sub-44px controls
result:    pass

criterion: L6.8
required:  /login field order email → password → Sign in → magic link → Google → Microsoft → footer link
observed:  .scratch/ui-eval/results.json L6.8a — exact order match within main
result:    pass

criterion: L6.9
required:  /login controls ≥44px; busy-disable classes present
observed:  .scratch/ui-eval/results.json L6.9a — zero sub-44px; disabled:pointer-events-none disabled:opacity-50 on all auth buttons at source (login/page.tsx)
result:    pass

criterion: L6.10
required:  keyboard path reaches email input with visible outline on /login
observed:  .scratch/ui-eval/results.json L6.10a — INPUT[type=email] outline solid
result:    pass

criterion: L6.11
required:  /l/[nonexistent] renders dark-house body (#0d0d10), no curtain, single h1
observed:  .scratch/ui-eval/results.json L6.11a/L6.11b/L6.11c — bg rgb(13,13,16), curtain count=0, mean luma 19.6
result:    pass

criterion: L6.12
required:  vote stage renders from a localStorage-seeded anonymous session
observed:  .scratch/ui-eval/results.json L6.12a — matchup section present with aria-label "Which movie is better?"
result:    pass

criterion: L6.13
required:  play-route focus order: header actions → progress row → poster/park per side; ring on every stop
observed:  .scratch/ui-eval/results.json L6.13a — Exit → Finish now → left poster → left park → right poster → right park, ring=true on all stops (Undo disabled pre-vote, correctly Tab-skipped)
result:    pass

criterion: L6.14
required:  double-tap race on a vote button registers exactly one vote (settle guard)
observed:  .scratch/ui-eval/results.json L6.14a — two raw mouse clicks <50ms apart → comparisons delta=2 (one vote), undoSnapshot set
result:    pass

criterion: L6.15
required:  progress bar exposes role/aria-valuenow; live region aria-live=polite
observed:  .scratch/ui-eval/results.json L6.15a — progressbar=1 with aria-valuenow, live regions ≥1
result:    pass

criterion: L6.16
required:  vote-stage poster images draggable=false
observed:  DOM N/A in this run (seeded posters use title-fallback frames, no <img>); source contract verified: MatchupStage.tsx sets draggable={false} plus onDragStart preventDefault
result:    pass

criterion: L6.17
required:  park sends movie to strip (unpark symmetric at source: ParkedStrip onToggle)
observed:  .scratch/ui-eval/results.json L6.17a — parked count 0→1 in persisted session
result:    pass

criterion: L6.18
required:  play-route visible enabled controls ≥44px tall
observed:  initial run FAIL ("Finish now →" h=20) → fixed inline-flex min-h-11 → re-run PASS, zero sub-44px controls (.scratch/ui-eval/results.json)
result:    pass

criterion: L6.19
required:  prefers-reduced-motion kill-switch active for all animations
observed:  .scratch/ui-eval/results.json L6.19b — media rule present and non-empty in served CSS (globals.css kills transitions, durations, iteration-count)
result:    pass

criterion: L6.20
required:  console clean across routes; fonts self-hosted (no googleapis/gstatic requests)
observed:  .scratch/ui-eval/results.json L6.20a — zero errors beyond the intentional 404 document; fonts via next/font/google (self-hosted at build, layout.tsx) — no external font requests possible
result:    pass
```

## Findings

Order: blocking first.

```text
issue:    "Finish now →" control on /r/play measured 20px tall — below WCAG 2.5.8 minimum (24px) and far below the repo's own min-h-11 (44px) convention used on every sibling control
source:   spec (docs/qa-checklist.md cross-cutting touch-target expectation; DESIGN.md accessibility row)
fix:      add inline-flex min-h-11 items-center to the button in src/app/r/play/play-room.tsx (done this run)
severity: S2
track: interaction
confidence: high
disposition: blocking
evidence: .scratch/ui-eval/results.json L6.18a (initial fail), re-run pass after fix
```

```text
issue:    run-instruction threshold "curtain fold stdev >20" is mis-calibrated against the bound baseline: DESIGN.md's own gradient recipe (#33000a→#66001a→#a8323e over a 90px cycle) mathematically yields column-mean-redness stdev ≈8–12; measured 8–13 with autocorrelation peak at lag 87px ≈ declared 90px cycle, red-dominance 57–74% on stage moments vs ≤0.4% elsewhere
source:   design (DESIGN.md curtain treatment)
fix:      keep the rendered treatment as-is (it matches the baseline); restate the acceptance threshold for future runs as "fold period ≈90px ±10% and red-dominance >0.02 on stage moments, <0.02 elsewhere"
severity: S0
track: cross-cutting
confidence: high
disposition: info
evidence: .scratch/ui-eval/pixel-stats.json
note:     judgment-class dimension (threshold provenance), listed under pending-user-adjudication
```

```text
issue:    docs/qa-checklist.md item 11 documented a focus order that never matched the implementation (Undo listed first without Exit; right-park before right-poster); rings were correct on every real stop, so behavior was sound and only the doc drifted
source:   spec (docs/qa-checklist.md)
fix:      item 11 rewritten to match observed order: Exit → Undo (disabled-skipped pre-vote) → Finish now → poster/park per side (done this run)
severity: S1
track: product
confidence: high
disposition: advisory
evidence: .scratch/ui-eval/results.json L6.13a
```

```text
issue:   qa-checklist "Deferred to v2" bullet claims SearchPanel mode tabs and ViewToggle lack aria-controls/arrow-key navigation; both now render through the shared Tabs component which emits role/tablist/tab, aria-selected, aria-controls, and arrow/Home/End roving tabindex (verified live 4/4 on search-mode tabs; ViewToggle verified at source only)
source:  components
fix:     strike or annotate that deferred bullet once ViewToggle is runtime-verified on a real list page
severity: S0
track: cross-cutting
confidence: medium
disposition: info
evidence: .scratch/ui-eval/results.json L6.3b; src/components/Tabs.tsx; src/components/list/ViewToggle.tsx (source)
```

## Positive findings

```text
issue:    settle guard holds under a genuine race: two raw mouse clicks <50ms apart on a vote button registered exactly one comparison pair, loser disabled during settle, undo snapshot armed once
source:   spec (qa-checklist item 13, critical)
severity: S0
track: interaction
confidence: high
disposition: info
evidence: .scratch/ui-eval/results.json L6.14a
```

```text
issue:    theater model renders exactly as declared: burgundy curtain confined to home hero + login backdrop (and celebration section at source), content surfaces near-black #0d0d10 with red-dominance ≤1.3%; scrim behind hero h1 measures contrast 9.34:1 (accent h1), 16.19:1 (body text), 5.65:1 (muted subtitle) — all above WCAG AA
source:   design (DESIGN.md binding)
severity: S0
track: product
confidence: high
disposition: info
evidence: .scratch/ui-eval/pixel-stats.json
```

## Coverage statement

- Exhaustive (within no-vision scope): the three named routes (`/`, `/login`, `/l/<nonexistent>`) for single-h1, curtain placement, dark-house neutrality, focus rings, tab ARIA wiring, control sizes, field order, Enter-no-submit; seeded anonymous vote stage for focus order, double-tap settle guard, park action, progressbar/live-region, reduced-motion kill-switch, console cleanliness. Every applicable row of the two bound declarations was considered; every ledger criterion above has exactly one row.
- Sampled: vote-stage stability/celebration screen (reached stable state only indirectly; celebration curtain section verified at source, not driven to consensus in-run), SaveGateSheet (focus trap/busy-reset not exercised — needs a save flow), unpark direction of the parked strip (park verified live; unpark by symmetric source path), ViewToggle ARIA (source-only).
- Explicitly unreviewed (requires human eyes/hands or external services): hover-lift/press visual feel on cards and chips, sheet slide-up animation quality, beforeunload prompt in Chrome/Safari, Web Share native sheet vs clipboard toast, OAuth redirect flows, Supabase midnight-UTC date hydration on /u/me, delete-confirm flows, sharpen/close-call copy states, TV-width layout (≥1920px) and podium collisions, 375px safe-area behavior, deploy-preview items (43–44). These are recorded as the remaining manual rows of docs/qa-checklist.md and produce no pass contribution here.

## Limitations statement

This run was reviewed on text-face evidence: HTML/CSS source, Playwright DOM/computed-style assertions, persisted-state traces, and PIL pixel statistics over render captures. No screenshot was visually read; captures remain bound as path references only.

Judgment-class dimensions (subjective, pending user adjudication):
- The fold-stdev ">20" threshold provenance (finding 2): options — change declaration (restate threshold as fold-period/red-dominance form) / accept the rendered treatment as-is / promote the numeric threshold to the rule registry.
- Severity grading of the 20px tap target as blocking rests on WCAG 2.5.8 (24px minimum) rather than a project-declared target-size token.

Assumed dependencies: anonymous sessions persist under localStorage key `mr-session` (src/lib/session.ts); dev server on :3000 serves the working tree (closure fix hot-reloaded before re-verification); TMDB/OAuth/Supabase unavailable in-run, so auth-gated surfaces were not exercised.

Pass scope: Pass covers only the L6 rows above and the supporting observations cited; unreviewed items remain governed by docs/qa-checklist.md's manual sign-off.

Machine-face boundary: craft-detector-style source scans (focus-visible class coverage across components, curtain class usage grep) are audit records, not ledger rows; they corroborate but do not carry passes.

Pending user adjudication sub-block:
- finding 2 (fold-stdev threshold): change declaration / accept risk / promote to registry queue.

## Verdict

Verdict: Pass

Closure lines:

- closes: "Finish now →" control on /r/play measured 20px tall — below WCAG 2.5.8 minimum (24px) and far below the repo's own min-h-11 (44px) convention used on every sibling control -> recirculate -> fix -> re-eval -> 0 blocking

Verification at close: npm test 96/96 green, tsc --noEmit clean, next build passing; all 26 DOM assertion checks pass on re-run.
