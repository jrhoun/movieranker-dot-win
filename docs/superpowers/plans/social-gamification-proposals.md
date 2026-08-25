# Social & Gamification Proposals — movieranker.win

**Date:** 2026-08-24 · **Status:** Proposals for review (nothing built)
**Framing:** Every feature is scored against three questions: Does it make movie night *more fun*? Does it give people a reason to come back? Does it depend on things we haven't built?

## Ground rules (carried from v1 philosophy)

- The room is sacred: nothing may add friction to the in-person game.
- Guest-first: social features are opt-in layers ON TOP of play, never gates.
- One primary action per view still applies.

---

## Tier 1 — Quick wins (small effort, high delight, no new infrastructure)

### 1. Share Cards 🖼
Auto-generate a beautiful OG/social image for every finished list: top-3 posters fanned on velvet curtain, gold rank numerals, title + participants. Links shared in group chats unfurl into a mini poster wall instead of a bare URL.
**Value:** every share becomes an ad. **Effort:** S (edge function + image composition). **Depends on:** nothing.

### 2. Consensus Meter 📊
Track, per movie, how often it wins its head-to-heads across ALL rooms site-wide. Show "% of rooms where Inception beat Interstellar" on the list page. Turns private arguments into a site-wide conversation.
**Value:** the seed of "what does everyone think?" — our differentiation from Letterboxd made visible. **Effort:** M (aggregation job + UI). **Depends on:** persisting votes (currently deliberately not stored — would need a votes table).

### 3. Hot Takes Thermometer 🌶 [PARKED pending mechanic decision]
At finish, surface the most contrarian calls. TWO possible mechanics: (a) attributed — participants tap their name before voting (honor system) enabling "SARAH was the only one…"; (b) unattributed group version — flag only the list's biggest consensus-divergence without naming anyone. User found (a)'s value clear but the mechanic needs deciding; parked until then.
**Value:** laughter at finish. **Effort:** S-M either way. **Depends on:** votes table; (a) also needs participant attribution.

### 4. Better List Embeds & Print View 📄
A print-friendly poster-wall layout (for the fridge) and themed embeds. Small, but finishing rituals matter.
**Effort:** S. **Depends on:** nothing.

---

## Tier 2 — The account era (requires Supabase Auth rollout, planned anyway)

### 5. Real Participants 👥
The big one. When creating a session you invite friends by handle/email; accepting links their ACCOUNT to the participant chip. The finished list appears on every real participant's profile ("Ranked with Dave & Sarah"). This converts every movie night into N signups instead of 1, and builds the social graph organically.
**Value:** growth loop + stickiness. **Effort:** L (invites, claim flow, profile surfaces). **Depends on:** Auth (exists), notifications (email fine).

### 6. Versus Mode ⚔️
"Your Nolan ranking vs Sarah's" — side-by-side comparison with disagreement highlighting and a compatibility score ("82% aligned"). The single most requested feature class in this genre.
**Value:** re-engagement between movie nights; shareable conflict. **Effort:** M. **Depends on:** two rankings of comparable movies (works day one with any two public lists!).

### 7. Profiles Worth Visiting 🗿
Public `/u/<handle>` pages: trophy shelf, favorite genres (computed from ranked movies), recent lists, "often ranks with" row. Privacy toggle (public/lists-only/private).
**Value:** identity = retention. **Effort:** M. **Depends on:** handles (Auth exists).

### 8. Rematch ⏳
Re-run an old list months later; see the drift diff ("Oppenheimer fell from #2 to #5 since March"). Memory + change = irresistible content.
**Value:** nostalgia loop. **Effort:** M (fork-list mechanics). **Depends on:** nothing technical.

---

## Tier 3 — The game layer (build when there's an audience)

### 9. Weekly Marquee 📅
Site-wide prompt ("This week's marquee: HEIST MOVIES") everyone can rank; live consensus leaderboard all week; results crowned Sunday night. Creates appointment behavior and a shared front page that changes.
**Value:** habitual visits; the "tonight's argument" brand at site scale. **Effort:** L. **Depends on:** Tier 2 profiles.

### 10. Oracle Points 🔮
Before ranking begins, each participant secretly predicts the final #1 (or full podium). Score points for accuracy across sessions; season leaderboards. Transforms watching the Elo engine settle into suspense.
**Value:** the room game gains a meta-game. **Effort:** M-L. **Depends on:** attributed participants (Tier 2 #5).

### 11. Levels, Flair & Unlockables 🏅 [user-directed 2026-08-24]
Steam-profile-style progression: every movie you rank earns XP; levels unlock PROFILE DECORATIONS — avatar frames (wooden → gold → velvet), curtain themes for your profile header, title flair ("Film Buff" → "Commissioner" → "Projectionist"), extra trophy-shelf slots, animated badges. Achievements layer on top (First Premiere, Marathoner 10+ lists, Contrarian, Time Capsule). The decoration shop IS the retention loop: visible status earned through play.
**Value:** Steam proved decoration-hunting drives decades of engagement. **Effort:** L (XP curve, unlock catalog, profile rendering). **Depends on:** profiles, attributed movies-ranked counts.

### 12. Reactions 💬
Lightweight emoji reactions on individual list entries ("💀" on a controversial mid-list placement). No comment threads — reactions only, keeping it light and moderation-free.
**Value:** social texture without moderation burden. **Effort:** S-M. **Depends on:** nothing (anonymous reactions fine).

---

## Explicitly deferred (say no until evidence demands)

- Follower feeds / home timelines (content firehose we can't fill)
- Direct messaging
- Mobile push notifications
- Anything requiring real money/prizes

## Suggested sequence if approved

1. **Now-ish:** Share Cards (#1), Better embeds (#4) — pure polish wins
2. **With first auth release:** Real Participants (#5) + Profiles (#7) — the graph
3. **Once lists accumulate:** Versus (#6), Rematch (#8), Consensus Meter (#2 — requires votes table decision)
4. **When there's traffic:** Weekly Marquee (#9), Oracle Points (#10), Badges (#11)

## Open decisions for the human

- Votes table: persisting individual votes unlocks #2/#3/#10 but reverses a deliberate v1 simplification. Cheap now, cheaper later than after data accumulates? (Recommendation: add the table soon even if unused.)
- Handle namespace: reserve now (`movieranker.win/u/handle`)?
- Moderation stance on public descriptions once strangers meet (basic profanity filter + report button is probably enough at this scale).
