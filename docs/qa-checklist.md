# movieranker.win v1 — human QA checklist (Task 12)

Headless-verification was done for code-level concerns (61/61 tests, tsc, eslint,
build, static Lighthouse equivalents — see task-12-report.md). The items below
need eyes and hands. Work top to bottom; check every box before sign-off.

Test envs: phone or DevTools 375×812, desktop 1440×900, and the widest screen
you have (TV / 4K). Use Chrome for the reduced-motion toggle
(DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion`),
and Safari if available for the beforeunload prompt.

---

## Route: `/` — home (search + candidate tray)

1. [ ] Tabs render in order Title → Person → Studio → Keyword. Tab key moves:
       tab buttons left-to-right → search input → result poster cards →
       (tray, see step 5). Visible focus ring on every stop.
2. [ ] Search "nolan" in Person mode. Pressing Enter inside the search input
       must not submit anything (input is not in a form).
3. [ ] Poster results: hover lifts card; Tab focus gives same lift + accent
       outline; mouse-down shrinks slightly (active state). Same behavior at
       375px.
4. [ ] Pick a person → name chips appear. Each chip: hover raises surface,
       active press feedback, focus ring. Click "back to people search"
       link-style button — it also has hover + focus states.
5. [ ] Candidate tray: add 3 movies. Hover a poster shows the red ✕ badge;
       keyboard Tab to it shows the badge too (focus-visible); press has
       scale-down feedback. Removing works via both click and Enter/Space.
6. [ ] Tray inputs: title + participant fields show brighter ring on hover and
       accent outline on focus.
7. [ ] With <2 movies, Start ranking is disabled: grayed, cursor-not-allowed,
       unclickable. Add a 2nd movie → enabled; press has feedback.
8. [ ] Participant chips: removing via click AND keyboard works; hover turns
       text red, active returns it.
9. [ ] **375px:** tray stays pinned to bottom, poster row scrolls horizontally,
       nothing overlaps iOS home-indicator area (safe-area padding). Start
       button reachable without scrolling the page behind it.
10. [ ] **TV width (≥1920px):** search grid caps at 6 columns, tray content
        centers at max-w-5xl, no stretched full-width inputs.

## Route: `/r/play` — voting

11. [ ] Focus order from page top: session title area (skip) → Exit button →
        Undo button (disabled until the first vote, so Tab skips it) →
        progress-row "Finish now →" → left poster vote button →
        left "Haven't seen" → right poster vote button → right "Haven't seen"
        → parked strip items. Every stop shows a visible accent focus ring.
12. [ ] Vote with mouse: loser dims/slides up ~220ms, then next pair appears.
        No layout jump of the VS column.
13. [ ] **Double-tap race test (critical):** tap the LEFT poster twice as fast
        as possible. Second tap must be ignored (settle guard) — exactly one
        vote registered (Undo button becomes enabled once, list count advances
        by one comparison). Repeat tapping left-then-right within the settle
        window; no double-count, no stuck dimmed poster.
14. [ ] During settle animation both posters are briefly non-interactive
        (`disabled` on losing side, guard on winner). Keyboard users: holding
        Enter on a vote button must not queue multiple votes.
15. [ ] Park/unpark: "Haven't seen" sends movie to bottom strip; strip item
        hover lifts + brightens, active scales down; click restores it.
16. [ ] Progress bar fills smoothly (200ms ease-out); "~N votes left" live
        region updates without screen-reader spam (aria-live polite).

## Route: `/r/play` — stability & finish screens

17. [ ] Reach consensus ("Consensus reached"). If close calls remain you see
        "Some calls are still close — settle them?" + Sharpen button. If none
        remain you see ONLY "No close calls left — ready to finish." — never
        both copies stacked (regression fix under test here).
18. [ ] Sharpen flow: closest pair offered; undo during sharpening returns to
        previous state and keeps/exits sharpen mode coherently.
19. [ ] Finish screen: focus order Save & finish → Save & quit as draft →
        Keep voting. All three have hover lift/bg change + focus rings +
        active press.

## Route: `/r/play` — SaveGateSheet (auth sheet)

20. [ ] Sheet slides up (~220ms). On open, focus lands on first field (email).
21. [ ] Focus trap: Tab cycles email → password → Sign up → magic link →
        Google → Microsoft → (close ✕) → back to email. Shift+Tab reverses.
22. [ ] Escape closes; clicking the dark overlay closes; ✕ closes. All three
        closers are ignored while a save is in flight (submit, then hammer
        Escape — sheet must stay until navigation or error note).
23. [ ] Kill network (DevTools offline), submit sign-up with valid data → after
        auth attempt/save failure an error note appears and buttons re-enable
        (busy reset). Retry online succeeds. (Regression: performSave network
        throw used to leave the sheet locked.)
24. [ ] Buttons show disabled styling while busy (opacity + no pointer).
25. [ ] **375px:** sheet is bottom-anchored, scrollable within max-h 90dvh,
        all controls ≥44px tall.

## Route: `/u/me` — my lists (signed in)

26. [ ] Card focus order: triptych link → View/Resume button → Delete button.
27. [ ] Triptych link has visible focus ring (was missing). Card hover lifts;
        Delete hover tints red.
28. [ ] Created date matches the date shown in Supabase for lists created near
        midnight UTC (hydration TZ fix — verify server-rendered date equals
        post-hydration date; no console hydration warning).
29. [ ] Delete asks confirm; cancel keeps list; confirm removes card.
30. [ ] Draft card links to `/r/play?id=…`, done card to `/l/…`.

## Route: `/l/[id]` — public list

31. [ ] Stacked/Rows toggle: selected tab is accent-filled; unselected has
        hover brighten + active press; focus ring on both. Crossfade ≤250ms.
32. [ ] Share button: hover bg, active scale, focus ring. On device with
        Web Share → native sheet; otherwise clipboard + toast that
        auto-dismisses (~2.5s) and does not trap focus.
33. [ ] Owner-only: Edit opens inline form; inputs have hover ring + focus
        outline; Save/Cancel disabled while saving; Cancel restores original
        values; empty title blocked with note. Delete confirms and redirects
        to /u/me.

## Route: `/login`

34. [ ] Field order: email → password → Sign in → magic link → Google →
        Microsoft → footer "Start ranking" link. All have focus rings.
35. [ ] Submit while busy disables all auth buttons (opacity, no pointer).
36. [ ] Bad password falls back to signup path message; note text readable
        (accent color).

## Cross-cutting

37. [ ] **Reduced motion:** enable `prefers-reduced-motion: reduce` emulation.
        Reload every route: sheet appears instantly (no slide), celebrate/
        fade animations skipped, spinner/pulse skeletons static (iteration-
        count kill), transitions instant but ALL feedback still present
        (hover colors, focus rings, disabled opacity remain).
38. [ ] **beforeunload:** anonymous session with ≥1 vote → closing/refreshing
        the tab prompts "Leave site?" in Chrome AND Safari (returnValue
        legacy path). After finishing/saving or with zero votes: no prompt.
39. [ ] **Keyboard-only pass:** complete an entire ranking (search → add 3 →
        vote to stability → finish → save sheet) using only Tab/Enter/Space/
        Escape. No focus traps outside the sheet, no invisible focus.
40. [ ] **TV width:** podium/rank badges don't collide at 2560px+; matchup
        posters capped at 62svh so both sides fit without scrolling.
41. [ ] Console clean on every route: no hydration mismatches, no 404s for
        fonts (fonts are self-hosted via next/font — verify Network panel
        shows no requests to fonts.googleapis.com/gstatic).
42. [ ] `npm run build && npm start` smoke: hit each route once against the
        production build.

## Deploy preview (manual, user-gated)

43. [ ] Push feat/v1 → Vercel preview; repeat items 13, 22–24, 28, 38 against
        the preview URL (real OAuth redirect + RLS).
44. [ ] Verify share URLs on preview use the preview host (shareUrl host
        pinning deferred to v2 — expected quirk, note actual behavior).

---

## Deferred to v2 (do NOT fix in v1)

- Schema: no CHECK constraint on `lists.status`; add with first migration.
- Schema: missing `unique(list_id, tmdb_id)` on list_movies — duplicate rows
  possible on retry races; also causes React key-collision risk.
- ARIA tabs wiring: SearchPanel mode tabs and ViewToggle lack
  `aria-controls`/arrow-key navigation (incomplete tabs pattern).
- List save POST/PATCH is not transactional; mid-failure retry can duplicate
  a list; PATCH duplicate tmdbIds last-wins.
- Anonymous sessions use single-slot localStorage — resuming a draft and
  playing anonymously overwrites the other session's save.
- `shareUrl` trusts `x-forwarded-host` — pin production host when domain lands.

## Abuse & moderation

45. [ ] **Email confirmation stays ON** in the Supabase dashboard (Auth →
        Providers → Email → "Confirm email"). If it's ever turned off,
        anyone can sign up with an address they don't own.
46. [ ] The proposal queue is the public-content gate: nothing a user submits
        goes public without review (`shortlist_proposals.status = 'pending'`
        until approved). Verify no other route publishes user content
        unreviewed.
47. [ ] Report-abuse / copyright contact is still the `[CONTACT]` placeholder
        in `src/lib/site.ts` (`CONTACT_EMAIL`) — replace before launch; it's
        referenced by About, Privacy, and Terms.
48. [ ] Rate limits (constants live in `src/lib/rate-limit.ts` `LIMITS` —
        tune there): lists writes 20/min per key, proposals 5/min, account
        delete 3/hour. Keys are userId, falling back to first
        `x-forwarded-for` IP for anonymous traffic. Exceeding returns 429
        with a `Retry-After` header.
49. [ ] Note: limiter is in-memory and resets per serverless instance — fine
        for v1 single-instance; move to Upstash (or similar) if abuse shows
        up across instances.
