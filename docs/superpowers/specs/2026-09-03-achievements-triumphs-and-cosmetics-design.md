# Architecture Specification: Evolving Achievements, Canister Unboxing & Living Cosmetics

**Date:** 2026-09-03
**Revised:** 2026-09-04 — **REVISION 2. This document supersedes Revision 1 but does not replace its history; §0 records exactly what changed and why.**
**Status:** Revised for implementability. The design is approved; three of its numbers and one of its claims were not implementable as written and have been corrected here.
**Target Repository:** `jrhoun/movieranker-dot-win`

---

## 0. Revision Log (2026-09-04)

Revision 1 was approved on design merit and it is mostly right. §1.1's separation of concerns is the best idea in the document and is untouched. §2.1's tier art vocabulary, §7's live wardrobe mirror, and §8's copy revision are kept as written. What follows changed because the original could not be built from it.

| # | What changed | Why |
|---|---|---|
| **R1** | **§9.1 "Zero Database Migrations Required" is deleted and replaced by "§9.1 One Migration Required, And It Is The Security Fix".** | The claim was false, and the omission was a security hole, not a paperwork oversight. `profiles.showcase` is directly writable from the browser under the `"write own"` RLS policy. Rev 1 moved the entire reward economy into that blob. See §9.1. |
| **R2** | **§3.2's secret achievements are audited against what is actually persisted (§3.4). Two are cut, two are kept, and one new `settle_facts` mechanism (§3.5) is specified for the survivors.** | `src/lib/gamification.ts`'s header states the invariant: *"every XP source must be re-derivable from data we already query. Anything that cannot be is not an XP source."* Three of the four secrets needed data that is never persisted. §2.2's seven evolving achievements are audited the same way; one (`spotlight_sensation`) was not even well-defined. |
| **R3** | **Every tier threshold in §2.2 is retuned (§2.4), and a total XP budget is imposed on the achievement system (§2.5).** | Tier V at 52 weeks / 200 rankings / 2,000 films / 1,000 upvotes / 50 recruits is a year-old site's numbers. This site is weeks old, so the top two tiers of every card would read as permanently locked — which defeats evolving art, whose whole reward *is* the crest changing. Separately, Rev 1's XP awards summed to **6,285 XP against a career ceiling of 2,340**, i.e. achievements would have paid 2.7× the entire level curve and made §1.1's separation of concerns collapse on contact. |
| **R4** | **§6 gains a hard contract: the share card renders the RESTING FRAME of every animated cosmetic, and "resting frame" is defined per animation (§6.2).** | `src/lib/og-card.tsx` hand-maintains a twin of every cosmetic class because Satori reads no stylesheet and renders no CSS animation. `src/app/globals.css` already learned the resting-frame lesson the hard way on `.co-dust`. Rev 1's `.cf-neon-cyan` keyframes silently disagreed with the shipped base rule *and* with the og-card twin — three-way desync in a five-line snippet. |
| **R5** | **§10's testing strategy is corrected.** | It asked for "reduced-motion CSS assertions". Every one of the repo's ~80 test files runs in the `node` environment and `vitest.config.ts` includes only `src/**/*.test.ts` — `.test.tsx` files are not collected at all. Such a test can only string-match `globals.css`. See §10. |
| **R6** | **A sequencing section is added (§11), and canisters are explicitly moved to last-or-never.** | Rev 1 presented five subsystems as one deliverable. Their costs and risks differ by an order of magnitude. |
| **R7** | **§3.1's singular milestones are reconciled against the achievements that already ship.** | Two of the four duplicated existing `ACHIEVEMENTS` entries at different thresholds, and one ("Ticket Stamped") was not derivable either. |

Nothing in this revision waters down the design. Three of the seven changes make it *more* opinionated than Rev 1, not less.

---

## 1. Executive Summary & Core Principles

This specification designs a progression and cosmetic ecosystem for MovieRanker inspired by Destiny 2's Triumph system, Steam achievement loops, and classic cinema culture. It unifies achievements, profile progression, loot canisters, and profile cosmetics into a clean hierarchy.

### 1.1 Strict Separation of Concerns (Deduplication)

*Unchanged from Revision 1. This is the load-bearing idea of the document and everything below is arranged to protect it.*

To avoid confusing overlapping reward channels:

1. **Career Level & XP Curve (`src/lib/gamification.ts`)**: Exclusively unlocks **functional site capabilities and profile showcase expansions** (e.g. pinning 1 list → 3 lists → 5 lists; pinning 1 badge → 3 badges → 5 badges; theme proposal permissions). Levelling does not award random cosmetic clutter.
2. **Achievements (Triumphs)**: Exclusively awards **specific milestones, tiered badge evolutions, secret easter eggs, and high-prestige cosmetics** (animated profile auras, prismatic frames, director taglines).
3. **Reel Canisters (Loot Boxes)**: Awarded from **weekly Marquee completions** and **every 5 Career Levels**, opened via an interactive 35mm film canister unboxing ceremony to unlock droppable wardrobe cosmetics.
4. **Retirement of "Challenges"**: The redundant "Challenges" terminology is consolidated into **Achievements**.

> **Retiring "Challenges" — the code that has to change.** `Achievement.challenge?: boolean` in `src/lib/gamification.ts` (three entries carry it: `cryptologist`, `the_long_take`, `the_programmer`), and `LevelProgressionModal`'s `challenges?: {...}[]` prop, passed from `src/app/(site)/u/profile/page.tsx:472` and `:542`. Both are a rename plus a re-grouping, not a behaviour change — the three `check` functions and their unlock semantics stay exactly as they are. The `frame.prism` catalogue entry's `unlock: { kind: "challenge", key: "cryptologist" }` is a *different* use of the word (`Unlock.kind`, in `src/lib/cosmetics/types.ts`) and must NOT be renamed with it: changing that discriminant changes ownership derivation for everyone who owns the frame.

### 1.2 The Derivability Invariant (new in Rev 2)

Every design decision below is constrained by the note at the head of `src/lib/gamification.ts`:

> XP is DERIVED from list data rather than recorded by an event system: there is no awards table, no XP ledger, no engagement log. That is deliberate and worth protecting. […] The constraint it imposes: every XP source must be re-derivable from data we already query. Anything that cannot be is not an XP source.

`src/lib/completion.ts` restates it for achievements, and `src/lib/cosmetics/ownership.ts` restates it for cosmetics. `docs/superpowers/plans/social-gamification-proposals.md` reached the same conclusion independently back in August, parking the Consensus Meter and Hot Takes with *"depends on persisting votes (currently deliberately not stored — would need a votes table)"*.

This is not a stylistic preference. It is the reason a deleted list cannot leave a phantom balance, the reason `supabase/audit-lifetime-xp.sql` can exist at all, and the reason there is no tracking apparatus to secure. §3.4 is an audit against it, and §2.6 explains the one narrow place this design departs from it and how the departure is contained.

### 1.3 What this revision does not change

The five subsystems, their names, the 5-tier structure, the tier art vocabulary, the claim ceremony's shape, the wardrobe mirror, and the ticket-stub rename all stand. §11 sequences them; it does not cut any of them except canisters, and canisters are deferred rather than deleted.

---

## 2. Evolving Achievements Subsystem ("Pokémon-Style" In-Place Evolution)

Each evolving achievement is represented on the profile as a **single evolving badge card** that upgrades its visual crest through 5 distinct tiers rather than cluttering the grid with duplicate entries.

### 2.1 Visual Crest Evolution

*Unchanged from Revision 1. This vocabulary is good and should be implemented as written.*

- **Tier I**: Weathered Cardstock Ticket Stub (perforated edges, vintage serif stamp).
- **Tier II**: Cast Polished Bronze Emblem (beveled coin rim, warm bronze tone).
- **Tier III**: Etched Sterling Silver Crest (obsidian inlay, cool silver metallic sheen).
- **Tier IV**: 24K Gilded Gold Foil (ornate filigree border, specular highlights).
- **Tier V (Legendary)**: Radiant Holographic Prismatic Seal (shimmering hue-shift animation, gold marquee glow).

Note that Tier V is animated, which puts it under §6's resting-frame contract.

### 2.2 Derivability Audit — the seven evolving achievements

Each proposed achievement, against what the database actually holds.

| Key | Rev 1 definition | Data required | Available today? | Verdict |
|---|---|---|---|---|
| `marquee_veteran` | Consecutive weekly marquee completions | Which weeks the user finished a marquee in | **Partly.** `lists.theme_slug` + `lists.created_at` give *which* marquees and *when*. "Consecutive" needs a week index, and `weeksSinceUtcEpoch()` (the Monday-anchored integer `upgrade-3.sql` documents) already provides one. What is *not* cleanly derivable is mapping a `theme_slug` back to its scheduled week — curated themes rotate on a fixed array, community themes carry `shortlist_proposals.scheduled_week`, and the rotation is not invertible from the slug alone. | **KEEP, REDEFINED.** Count consecutive *ISO weeks in which the user finished at least one marquee list*, from `weeksSinceUtcEpoch(created_at)` on rows with a non-empty `theme_slug` and `status='done'`. Fully derivable, needs no new column, and is what a user means by "streak" anyway. |
| `master_curator` | Total settled rankings finished | Count of done lists | **Yes.** `AchievementStats.doneLists` already exists and is already computed in three places. | **KEEP AS-IS.** |
| `celluloid_devotion` | Total individual films ranked | Sum of `list_movies` across done lists | **Yes.** `countMoviesRanked()` in `gamification.ts` is exactly this — uncapped, finished lists only, and explicitly documented as "the honest headline stat". | **KEEP AS-IS.** |
| `spotlight_sensation` | "Lists breaking into Community Spotlight / Top Voted" | A record of which lists were ever *in* the Spotlight | **No — and the metric is not well-defined.** The Community Spotlight is a live query: `getTrendingLists()` selects a candidate pool and sorts it in memory with `calculateHotScore(upvotes, created_at)`, which has a 24-hour time-decay term. Nothing is ever written down. There is no `was_spotlighted` flag, no snapshot table, and no cron. Worse, "breaking into" has no threshold: whether a list was in the Spotlight depends on how many rows the request asked for (`limit`, default 6), which sort mode the visitor had selected (`hot` / `top` / `new`), and what minute they loaded the page. Two visitors could correctly disagree. | **KEEP THE SLOT, REPLACE THE METRIC.** Redefine as **cumulative upvotes RECEIVED** across the user's public finished lists: `sum(lists.upvotes_count) where owner_id = user and status='done' and visibility='public'`. That column already exists (`20260902_list_upvotes.sql`) and is trigger-maintained atomically. It is monotonic-ish, visitor-independent, and means the same thing to everyone. Retitle to **"Top of the Bill"** so the name stops promising a Spotlight appearance. |
| `cryptologist` | Weekly marquee connections cracked | Count of correct solves | **Yes — confirmed.** `marquee_solves` (`supabase/upgrade-2.sql`) is a real table with `primary key (user_id, theme_slug)`, and `fetchCareerXp()` in `src/lib/career-xp.ts` already counts it: `.from("marquee_solves").select(..., { count: "exact", head: true }).eq("user_id", userId).eq("correct", true)`. `/api/profile` even recovers the count back out of the XP breakdown (`breakdown.connections / CONNECTION_SOLVE_XP`) rather than re-querying. | **KEEP AS-IS.** Note the key `cryptologist` already exists in `ACHIEVEMENTS` as a flat 5-solve challenge; the evolving version replaces it and Tier II must be set at 5 so nobody loses a badge they already have (see §2.4). |
| `film_club_patron` | Community upvotes CAST on others' rankings | Count of the user's own `list_upvotes` rows | **Yes, with one caveat.** `select count(*) from list_upvotes where user_id = me` is trivially derivable. The caveat: the existing select policy on that table is scoped to the **list**, not the voter, so an upvote you cast on a list whose owner later flips it to `private` vanishes from your own count and a tier appears to un-earn itself. | **KEEP.** Fixed by Part C of `supabase/migrations/20260904_showcase_server_writes.sql`, which adds a permissive `"read own upvotes"` policy. One line, no schema change. |
| `the_recruiter` | Friends who register and complete a ranking via your link | Referral graph plus each referee's list activity | **Yes.** `profiles.referred_by` (indexed) plus `getReferralStats()` in `src/lib/referrals.ts`, which already defines an *active* referral as "any referred user who has published at least 1 'done' list" — precisely Rev 1's wording. It also counts participant-attribution referrals, which is a superset; keep that behaviour. | **KEEP AS-IS.** |

**Summary: 5 of 7 derivable today with no change, 1 needs a redefinition (`marquee_veteran`), 1 needs a replacement metric (`spotlight_sensation`), and 1 wants a one-line RLS policy (`film_club_patron`). Zero new tables.**

### 2.3 Pace calibration — reading the actual XP curve

Before retuning thresholds, the level curve has to be measured, because the achievement pace and the level pace must agree rather than contradict each other.

From `src/lib/gamification.ts`: `levelCost(level) = 10 + floor(level / 10) * 3`, cumulative:

| Level | Total XP | Unlocks |
|---|---|---|
| 1 | 0 | — |
| 5 | 40 | Canister (every 5 levels) |
| **10** | **90** | `MIN_PIN_LIST_LEVEL` — pin a featured list |
| 15 | 155 | `frame.projector` |
| **20** | **220** | `MIN_PROPOSAL_LEVEL` — propose a theme; `overlay.grain` |
| 25 | 300 | Gilded nameplate |
| 30 | 380 | — |
| 50 | 790 | Velvet nameplate |
| 75 | 1,475 | Marquee nameplate |
| **100** | **2,340** | Cinema Legend, projector halo, `MAX_BASE_XP` |

The file's own note says the ceiling was raised from 495 to 2,340 so that *"Cinema Legend is a year of real use instead of a month."* Solving for that:

```
2340 XP / 52 weeks = 45 XP per week
```

**45 XP/week is the design's own implied pace**, and it is a realistic week: one weekly Marquee of ~15 films (15 movie XP, capped at `MAX_XP_PER_LIST` = 20) + `MARQUEE_COMPLETION_XP` 10 + `CONNECTION_SOLVE_XP` 10 = 35, plus one personal 10-film list = 10. Total 45.

At that rate:

| Milestone | Weeks |
|---|---|
| Level 10 (pin a list) | 2 |
| Level 20 (propose a theme) | 5 |
| Level 30 | 8.5 |
| Level 50 | 17.5 |
| Level 100 (Cinema Legend) | 52 |

So the level curve's own answer to "what does a month of real use look like?" is **~180 XP, or roughly Level 17–18** — past the first capability gate, approaching the second. Achievement Tier III should land in the same place.

**Hard ceilings the tiers must respect.** Two metrics are rate-limited by the site itself and cannot be ground:

- **Marquee weeks** are one per week. There is no way to earn two.
- **Connection solves** are one per week *and* one attempt per week: `marquee_solves`'s primary key is `(user_id, theme_slug)` and `upgrade-2.sql` says so explicitly — *"the FIRST attempt for a (user, theme) is the only one that can ever be recorded, right or wrong."* Rev 1's Tier V of 52 is therefore not "a year of use". It is **52 consecutive correct first guesses from four options**, with no retries, ever. That is not a hardcore goal; it is a coin-flip tournament nobody wins.

### 2.4 Retuned Evolving Achievement Roster

**Design rule:** Tier I is earnable on a first visit (the curve deliberately levels you up on your first finished Marquee — *"the point is to reward someone for showing up"*). Tier III lands at roughly one month of real use, matching Level ~17. Tier V is 6–8 months: genuinely long, visibly approaching, and reachable by a real person on this site's actual cadence.

| Key | Title | Metric (derivable from) | I | II | III | IV | V | Tier V at 45 XP/wk pace |
|---|---|---|---|---|---|---|---|---|
| `marquee_veteran` | **The Marquee Veteran** | Consecutive ISO weeks with a finished marquee list (`lists.theme_slug`, `created_at`) | 1 wk | 2 wk | **4 wk** | 12 wk | **26 wk** | ~6 months |
| `master_curator` | **The Master Curator** | `doneLists` | 1 | 5 | **12** | 30 | **75** | ~30 wk at 2.5 lists/wk |
| `celluloid_devotion` | **Celluloid Devotion** | `countMoviesRanked()` | 20 | 60 | **150** | 400 | **1,000** | ~33 wk at 30 films/wk |
| `spotlight_sensation` | **Top of the Bill** *(retitled)* | `sum(lists.upvotes_count)` on own public done lists | 1 | 5 | **15** | 50 | **150** | community-rate dependent |
| `cryptologist` | **The Cryptologist** | `count(marquee_solves where correct)` | 1 | **5** | 12 | 20 | **30** | ~30 wk, hard-capped 1/wk |
| `film_club_patron` | **Film Club Patron** | `count(list_upvotes where user_id = me)` | 3 | 10 | **30** | 100 | **300** | ~30 wk at 10 casts/wk |
| `the_recruiter` | **The Recruiter** | `getReferralStats().activeReferrals` | 1 | 2 | **4** | 10 | **20** | the hardest; see note |

**Notes on individual retunes:**

- **`cryptologist` Tier II is pinned at 5, not scaled.** The flat `cryptologist` achievement already ships and already fires at 5 solves, and `frame.prism` is gated on it (`unlock: { kind: "challenge", key: "cryptologist" }`). Anyone who has earned it must land at Tier II or higher on migration day, or `ownedItemIds()` stops returning `frame.prism` for them and `resolveEquipped()` silently swaps their legendary frame for `frame.brass`. Tier V drops from 52 to 30 because of the one-attempt rule above: 30 correct first guesses over 30+ weeks is already extraordinary.
- **`the_recruiter` is the one metric a user cannot earn alone**, so its ceiling is the lowest in absolute terms. 20 friends who each finished a ranking is a genuinely large personal contribution for a site of this size. 50 was aspirational fiction.
- **`spotlight_sensation` / Top of the Bill** thresholds are the softest numbers here because they depend on community upvote volume, which does not yet exist. Treat 1 / 5 / 15 / 50 / 150 as provisional and revisit once there are four weeks of real `list_upvotes` data. This is flagged in §12.

**On adding a Tier VI later.** Adding a sixth tier is cheap and un-demoralising: `AchievementTier[]` is an array, the crest vocabulary in §2.1 has obvious headroom above prismatic, and a user who has maxed a card discovers *more* to do. Launching with unreachable numbers is the opposite — it is unrecoverable, because the fix (lowering a threshold) hands out tiers retroactively and makes every earlier grind look like it was priced wrong. **Ship low, extend upward.**

### 2.5 XP Budget (new in Rev 2)

Revision 1's XP awards summed as follows:

| Achievement | Rev 1 total XP |
|---|---|
| `marquee_veteran` | 875 |
| `master_curator` | 675 |
| `celluloid_devotion` | 675 |
| `spotlight_sensation` | 1,060 |
| `cryptologist` | 875 |
| `film_club_patron` | 485 |
| `the_recruiter` | 960 |
| §3.1 milestones | 355 |
| §3.2 secrets | 325 |
| **Total** | **6,285** |

Against `MAX_BASE_XP = 2340`. **Achievements would have paid 2.7× the entire career ceiling.** Everyone would reach Cinema Legend from badges, the level curve would become decoration, and §1.1's "Level = functional capability, Achievement = prestige" separation would invert: badges would be the primary source of the capability gates.

**Rule: total claimable achievement XP must stay under 30% of `MAX_BASE_XP` (≤ 700 XP).** Ranking films remains the primary XP source; a badge's XP is a courtesy nudge, not the payoff. **The payoff is the crest and the cosmetic** — which is exactly what §1.1 says, and what §2.1's tier art is for.

**Uniform tier awards:**

| Tier | XP |
|---|---|
| I | 5 |
| II | 10 |
| III | 15 |
| IV | 20 |
| V | 30 |
| **per achievement** | **80** |

7 evolving achievements × 80 = **560**. Plus §3.3's surviving milestone (40) and §3.4's surviving secrets (50) = **650 XP total, 27.8% of the ceiling.** A Tier I is half a level early on; a Tier V is roughly two late levels. That reads as a reward without competing with the curve.

### 2.6 Where this design departs from §1.2, and how it is contained

`showcase.claimedAchievements` is **recorded state** — the first piece of recorded reward state in a system that has deliberately had none. That is a real departure from the invariant and it should be named rather than smuggled in.

It is contained by a single rule:

> **A claim is a ledger of what you have SEEN, never a balance of what you are OWED.**
>
> ```ts
> // XP contributed by achievements. NOT sum(tierXp(claimedTier)).
> achievementXp = Σ_over_achievements  tierXpTotal( min(claimedTier[key] ?? 0, derivedTier(key, stats)) )
> ```

`derivedTier(key, stats)` is computed from list data exactly as `evaluateAchievements()` already is. So the stored claim map can *withhold* XP (you must claim to collect) but can never *manufacture* it: a forged or stale `claimedAchievements` entry pays nothing the underlying rows do not already prove. The blast radius of the entire achievement economy therefore collapses to *"someone could skip their own confetti"*.

Three consequences worth stating:

1. This holds **even without** the §9.1 migration. The migration is still required — `unopenedCanisters` has no derivable counterpart and `avatarClaims` is permanent-on-merge — but the achievement half of the economy is safe by construction, not by privilege.
2. Achievement XP must enter through `calculateXpBreakdown()` as a new `achievements` field in `XpBreakdown`, so `career-xp.ts` stays the single definition of career XP. Its header exists because four places once computed this independently and none agreed.
3. A tier the user has claimed but whose underlying stat later *falls* (a deleted list) shows as claimed and pays nothing until it recovers. The `lifetimeXp` ratchet already softens this at the level layer; do not add a second ratchet at the achievement layer.

---

## 3. Singular Milestones & Secret Easter Eggs

### 3.1 Reconciliation with achievements that already ship

Revision 1's §3.1 proposed four singular milestones. Three collide with entries already in `ACHIEVEMENTS`:

| Rev 1 milestone | Collides with | Resolution |
|---|---|---|
| **Heavyweight Division** — 16+ films in one list | `heavyweight` (12 films, rare) and `the_long_take` (24 films, legendary) already exist | **CUT.** A third threshold on the same metric, 4 above one and 8 below the other, teaches nobody anything. |
| **Double Feature** — a ranking crediting a co-curator | `double_feature` already exists and already checks `coCuratedLists >= 1` | **CUT as a new item; it already ships.** Also rename `the_recruiter`'s Tier III tagline, which Rev 1 called *"Double Feature"* — a tagline sharing a name with an unrelated achievement is a support ticket. Use *"Bring a Friend"*. |
| **Ticket Stamped** — export or share your ticket stub | nothing | **CUT.** Not derivable, and not fixable by §3.5: exporting is a pure client action (`downloadPremierePass` / `copyPremierePassToClipboard` in `src/lib/ticket-canvas.ts`) that touches no row. Recording it would mean a write with no other purpose than to record it — the event system §1.2 exists to avoid. If the ritual deserves acknowledgement, give it a toast, not XP. |
| **The Pitch / Opening Night** — your proposed theme is chosen and published | nothing | **KEEP.** Derivable: `shortlist_proposals where proposer_id = me and status = 'approved' and scheduled_week is not null`. The `"read own"` policy covers it, `scheduled_week` exists as of `upgrade-3.sql`, and "approved but not yet scheduled" is correctly *not* an unlock — `upgrade-3.sql` is explicit that unscheduled is the resting state and that approval alone puts nothing on screen. **Reward: +40 XP, Legendary *"Programmer"* gold tagline, Marquee Bulbs Frame.** |

### 3.2 Secret presentation (unchanged)

In the profile UI before unlock, secret achievements display with a locked silhouette and redacted text: *"Keep ranking and exploring cinema to discover this secret."*

### 3.3 Derivability Audit — the four secrets

| Secret | What it needs | What exists | Verdict |
|---|---|---|---|
| **"Clean Sweep" / "Flawless Reel"** — one film wins every duel in a 10+ list | The win/loss matrix for the session | **Nothing.** `PlaySession.history` (`src/lib/session.ts:20`, `Array<[winnerId, loserId]>`) is written to `localStorage` under key `mr-session` and is *never* sent to the server — `POST /api/lists` accepts only `MovieInput` (`tmdbId, title, posterPath, releaseYear, tagline, elo, comparisons, parked, finalRank`), and `save_list` persists exactly those. `list_movies` has `elo` and `comparisons`, which give a film's *rating* and how many duels it *played*, but not who it beat. A 10-film Elo winner with 1000-adjacent losses is indistinguishable from an undefeated one. | **NOT DERIVABLE.** Recoverable via §3.5 → **KEEP.** |
| **"Midnight Screening"** — finalised 00:00–03:00 local | A settle timestamp in the user's timezone | **Nothing usable.** `lists` has `created_at` only — which is when the list row was *created*, not settled, and is UTC with no offset recorded. A curated Marquee list created Monday and settled Thursday reads as Monday. | **NOT DERIVABLE.** Recoverable via §3.5 → **KEEP.** |
| **"Fast Cut"** — 10+ films in under 45s via keyboard blitz | A client stopwatch and the input modality | **Nothing**, and unlike the two above this one should not be built. | **CUT — see §3.4.** |
| **"Cinema Verité / The Purist"** — every film released before 1965 | Release years for a list's films | **Available now.** `list_movies.release_year` exists (`schema.sql:15`), is populated by `fullMovieRow()` from `MovieInput.releaseYear`, and is already selected by `getTrendingLists()`. A single aggregate over rows already in reach. | **DERIVABLE TODAY. KEEP AS-IS, ZERO MIGRATION.** Reward: +25 XP, **Silver Screen Nitrate Dust** overlay (`overlay.dust` / `.co-dust`, which already exists — this becomes a second unlock path, and note the `Unlock` type is a single discriminated value, so an item cannot be both `drop` and `challenge`; `ownership.ts` warns that an item which is both would silently rewrite every past canister draw. Grant a *different* item, or move `overlay.dust` out of the drop pool as a deliberate, one-way decision.) |

### 3.4 What is cut, and why

- **"Fast Cut" is cut.** Not merely because it is unrecorded, but because it is the one secret that should not exist even if it were free. `gamification.ts` says of its challenge tier: *"These are the hard ones, and they are deliberately not awarded for being fastest."* `DESIGN.md`'s first rule is *"the room is sacred: nothing may add friction to the in-person game"* — and a 45-second timer converts a group argument about films into a speedrun. It is also the most forgeable of the four (a stopwatch and a modality flag, both client-authored, with no row to cross-check them against) and the only one needing new input-modality plumbing through the vote stage. Cutting it removes the entire `inputModality` field from §3.5 and roughly halves that section's surface.
- **"Ticket Stamped" is cut** (§3.1) — an unrecorded client action.
- **"Heavyweight Division" and "Double Feature" are cut** as new items (§3.1) — both already ship.

**Recommendation carried forward: cut rather than over-build wherever the payoff is thin.** §3.5 exists to rescue exactly two achievements. If either looks expensive when it comes to be built, cut it too; the system loses very little.

### 3.5 `settle_facts` — a frozen, narrow record of how a list was settled

**DDL: Part B of `supabase/migrations/20260904_showcase_server_writes.sql`.** Independent of Part A; safe to apply early.

```sql
alter table public.lists add column if not exists settled_at   timestamptz;
alter table public.lists add column if not exists settle_facts jsonb;
```

#### 3.5.1 Exactly which fields

Allowlisted in the trigger; anything else is **rejected, not stored**, so this column cannot quietly become the votes table the project decided not to build.

```ts
/**
 * Written ONCE, at settle time, from the session the client submits. Frozen
 * thereafter. Client-ASSERTED — see the trust properties below.
 */
export interface SettleFacts {
  /** Currently 1. Lets a reader refuse facts it does not understand. */
  schema: 1;
  /** Films in the settled roster. Cross-checkable against list_movies.length. */
  filmCount: number;
  /** Completed head-to-heads (session.history.length). */
  duels: number;
  /** First duel to settle, milliseconds. */
  elapsedMs: number;
  /** Date#getTimezoneOffset() at settle. The one value taken purely on faith. */
  tzOffsetMinutes: number;
  /** 0-23, settle hour in the user's own zone. Derived from the two above. */
  localHour: number;
  /** The film that won every duel it played, if exactly one did. */
  undefeatedTmdbId: number | null;
  /** Oldest / newest film in the roster. */
  minReleaseYear: number | null;
  maxReleaseYear: number | null;
}
```

`minReleaseYear` / `maxReleaseYear` are included even though The Purist is derivable from `list_movies` without them: they make the fact blob self-describing and let an achievements read answer from one row instead of a join. They are a convenience, not a dependency — if `list_movies` and `settle_facts` ever disagree, **`list_movies` wins**, because it is the row the user's own list page renders.

#### 3.5.2 Who writes them

The client computes them at settle and sends them with the existing save. `save_list`'s signature does **not** change and does not need re-running: facts arrive on the **follow-up owner UPDATE** that `POST /api/lists` already performs for `visibility` / `theme_slug` / `curated` (`src/app/api/lists/route.ts` ~line 100). That path is the cheapest possible integration point.

#### 3.5.3 What makes them immutable

**Chosen mechanism: a `BEFORE INSERT OR UPDATE` trigger, `lists_freeze_settle_facts()`.** Justification, since three options were on the table:

- **RLS cannot express write-once.** It is a statement about the relationship between `OLD` and `NEW`, and an RLS `UPDATE` policy cannot reference both: `using` sees the old row, `with check` sees the new, and neither can see the other. There is no formulation of `create policy` that says "this column may go from null to a value once".
- **A `SECURITY DEFINER` RPC would only bind callers who use it.** These columns are meant to be written by the ordinary owner-scoped path, and the `"owner all"` policy on `lists` means a direct `.update({ settle_facts })` from devtools would sail straight past an RPC. (This is the opposite of `showcase`, where the column privilege is revoked outright and the RPC *is* the only door — see §9.1.)
- **A trigger holds for every writer**, including the ones nobody has thought of yet, and it is the mechanism the codebase already uses for a cross-row invariant (`update_list_upvote_count` on `list_upvotes`). It runs `SECURITY INVOKER` with **no** `set search_path`, matching the reasoning in `schema.sql`'s comment on `save_list`: that idiom belongs to `SECURITY DEFINER` functions and would break unqualified references here.

The trigger enforces:

| Rule | Effect |
|---|---|
| `settle_facts` null → value: allowed once | The settle write succeeds. |
| `settle_facts` value → anything different: **raise `25006`** | No retry, no re-roll, no editing yesterday's list into a better one. |
| `settled_at` is always overwritten with server `now()` | A backdated clock cannot mint "Midnight Screening". |
| `settled_at` value → different value: **raise `25006`** | Write-once in both directions. |
| Must be a JSON object, ≤ 2 kB, allowlisted keys only | Not a scratchpad. |
| `status` must be `'done'` | Facts exist only on a genuinely settled list. |
| INSERT path validated identically | `"owner all"` permits a direct client INSERT, so skipping this would be the way around it. |

#### 3.5.4 Trust properties, stated honestly

**These facts are client-asserted and the server cannot verify them.** The browser is the only party that ever saw the duel history; the server can only decide whether to believe the summary. What the design buys is not authenticity but a **far narrower trust surface than a mutable counter in a JSONB blob**:

- **Bound to a real row** — facts exist only alongside a `lists` row the user genuinely owns, with genuine `list_movies`, at genuine `status='done'`. Forging "Clean Sweep" requires actually creating and settling a 10-film list. The floor on cheating is doing the thing.
- **Frozen** — write-once. One shot, no re-rolls. Compare `unopenedCanisters`, which a client could set to 10,000 and re-set after every draw.
- **Bounded** — nine allowlisted integers, 2 kB.
- **Cross-checkable** — `filmCount` against `list_movies.length`, `duels` against `sum(list_movies.comparisons) / 2` (`totalComparisons()` already defines the relationship: 2 comparisons per completed vote), `undefeatedTmdbId` against membership in the roster, `minReleaseYear` against `list_movies.release_year`. The claim route should run these; they cannot prove honesty but they reject the lazy forgeries.
- **Not self-timestamping** — `settled_at` is server time, always.

Only `tzOffsetMinutes` is taken purely on faith, and that is unavoidable: the server does not know the user's timezone. It gates a +15 XP cosmetic secret. That is the right thing to be relaxed about.

#### 3.5.5 What this unlocks

| Achievement | Enabled by | Reward |
|---|---|---|
| **Clean Sweep / Flawless Reel** | `undefeatedTmdbId != null and filmCount >= 10 and duels >= filmCount - 1` | +25 XP, **Radioactive Toxic Frame** (`.cf-toxic`, animated per §6) |
| **Midnight Screening** | `localHour in (0,1,2)` | +15 XP, *"Creature of the Night"* tagline, Midnight Velvet stub material |
| *(The Purist needs none of this)* | `list_movies.release_year` | +25 XP, animated nitrate overlay |

Two achievements, 40 XP, two columns, one trigger. If that trade looks thin when it comes to be built, **cut both and keep The Purist**. The Purist is free.

---

## 4. In-Game Notifications & The Profile Claiming Lifecycle

*Ceremony unchanged from Revision 1.*

```
┌─────────────────────────────────────────────────────────────┐
│ 1. In-Game Trigger (Vote settles, connection cracked, etc.) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Corner Notification Toast (Steam / Game Console Style)   │
│    • Slide in at bottom-right viewport                      │
│    • "✦ ACHIEVEMENT UNLOCKED ✦"                             │
│    • Icon + Title + "Claim on your profile →"               │
│    • Elegant cinema chime (if sound enabled)                │
│    • Auto-fades out after 3.8s (or on click-through)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Ambient Beacon Guidance                                  │
│    • Navigation Bar: Subtle glowing gold dot by user avatar │
│    • Profile Header: "Achievements · 1 Ready to Claim" pill │
│    • Unclaimed Badge Card: Breathing gold aura              │
│    • Pulsing Claim Button: [ ✦ Claim Tier II (+10 XP) ✦ ]   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. The Claim Ceremony (User clicks "Claim")                 │
│    • Celebratory audio chime & sparkle burst                │
│    • Badge crest evolves in-place (e.g. Bronze -> Silver)   │
│    • Unmasks secret description and lore                    │
│    • XP bar advances live toward next career level          │
│    • Unlocks cosmetics directly into wardrobe               │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Where step 1 hooks in

There is already a "you finished a ranking" moment and it should be reused, not rebuilt. `summariseCompletion()` in `src/lib/completion.ts` evaluates achievements twice — against the user's totals, and against those totals minus the list just finished — and subtracts. Its comment is the pattern to extend:

> To answer "what did this list unlock" we evaluate the same pure functions twice […] Exact, no new state, and it stays correct if a list is later deleted.

`CompletionSummary.newAchievements` becomes `newTiers: { key, fromTier, toTier }[]` computed the same way, and `CompletionSummaryCard` renders them. `isWorthCelebrating()` already gates the panel on "something actually happened", which is the right gate for the toast too.

### 4.2 Constraints on step 4

- **The claim route depends on §9.1's migration.** It writes `showcase.claimedAchievements`, so it cannot ship before the column is server-only and the RPC exists. This is the one item in this document with a hard ordering dependency (§11).
- **The claim is idempotent and monotonic**: `claimedAchievements[key] = max(stored, min(nextTier, derivedTier))`. Double-claiming is a no-op, and per §2.6 an over-claim pays nothing regardless.
- **Reduced motion**: the breathing aura, the pulsing button, the sparkle burst and the crest transition are all loops or one-shots and all fall under §6.3. Note that Tailwind's `animate-pulse` / `animate-bounce` / `animate-ping` are *already* covered by the catch-all block now in `globals.css`, so a claim button built from `animate-pulse` needs no new rule — but a bespoke `@keyframes` does.

---

## 5. Reel Canisters & The Interactive Unboxing Ceremony

**Sequenced LAST or never — see §11. Read that before building any of this.**

### 5.1 When Canisters Are Earned

1. **Weekly Marquee**: 1 canister upon settling that week's Marquee theme.
2. **Career Level Ups**: 1 canister upon reaching every 5 Career Levels.

### 5.2 What already exists, and what the design would break

`src/lib/cosmetics/canister.ts` and `ownership.ts` already implement canisters — *without any counter at all*. Drops are **replayed deterministically** from `finishedThemeSlugs` with a seed of `${userId}|${themeSlug}`, so the whole drop history is re-derivable from list rows and there is nothing to forge. `canister.ts` is explicit about why:

> The draw is SEEDED rather than random so the outcome is re-derivable. That is what lets random rewards exist with no database table, and it also removes rerolling — the compulsion loop — as a possibility rather than discouraging it.

Revision 1's `showcase.unopenedCanisters` counter **regresses that design.** It replaces a derived, unforgeable, rerollless mechanism with a mutable integer that mints loot rolls, and `POST /api/profile/canister/open` cannot be a gate on a counter the client can overwrite (§9.1). Two further landmines, both documented in the code:

- `CATALOGUE`'s spread order and every `drop` item's position and rarity are **append-only**, because `drawFrom` walks cumulative weights *positionally*. Adding, reordering or re-rarity-ing a drop item retroactively rewrites what every user drew for every past week — and an item shown as owned can become unowned, at which point `/u/profile` and `/u/[handle]` render the same person differently.
- `ownedItemIds()` warns that an item which is both level-gated and droppable would silently rewrite every past draw for everyone who crosses that level. The "1 canister every 5 levels" rule in §5.1 introduces exactly that coupling between the level curve and the drop sequence and needs its own seed namespace (`${userId}|level:${n}`), kept strictly *below* the theme replay loop, or it corrupts the existing history.

**Recommendation: if canisters are built at all, build the ceremony over the existing derived mechanism** — one canister per finished Marquee week, replayed, no counter. The level-up canisters and the `unopenedCanisters` field are the parts that require the new machinery, and they are the parts to drop.

### 5.3 Interactive 35mm Film Canister Unboxing

*Design unchanged; it is good, and it works over a derived drop just as well as over a counter.*

On `/u/profile`, an interactive vault displays `"🎞️ 1 Unopened Reel Canister" [ Open Canister ]`. When clicked, a centred stage opens:

1. **Physical Presence**: A vintage 35mm metal film canister with embossed sprocket patterns rests in the centre.
2. **The Pop**: Clicking the lid triggers a mechanical twist-and-pop sound.
3. **The Light Burst**: The lid lifts off and theatrical projector rays spill out.
4. **The Item Reveal**: The unlocked cosmetic card rises out, glowing in its rarity beam — Common (Warm White / Amber), Rare (Electric Cyan / Neon Magenta), Legendary (Gilded Gold / Prismatic Spectrum).
5. **Instant Actions**: **[ Equip Now ]** or **[ Send to Wardrobe ]**.

### 5.4 A standing constraint that is not negotiable

`canister.ts`'s header, quoted in full because it must survive any future refactor:

> **PAID RANDOMNESS IS RULED OUT** and this module must never be reached from a purchase path. Belgium criminalises paid loot boxes; the EU's expected Digital Fairness Act bans them where minors have access and mandates odds disclosure. This site has no age gate.

Nothing in this specification may introduce a purchase path to a canister. `Unlock.kind === "purchase"` exists in the type but grants nothing, and it must stay that way.

---

## 6. Living, "Jazzed-Up" Animated Profile Cosmetics

Cosmetics gain active life while respecting accessibility. **Revision 1's §6 collided with a contract the codebase documents loudly, in two directions. This section states the decision explicitly so the collision cannot recur.**

### 6.1 The share-card contract, and the decision

`src/lib/og-card.tsx` hand-maintains a twin of **every** cosmetic class, because Satori is not a browser:

> Gradient avatars, as inline styles, because Satori cannot read globals.css — it takes no classNames and no stylesheet, only literal values. **EVERY GRADIENT IN THE CATALOGUE MUST HAVE A ROW HERE.** A missing row is not a caught error: `avatarNode` falls through to a plain surface and the share card renders at HTTP 200 with the avatar silently absent, which is precisely the failure nobody reports.

`globals.css` shouts the same thing back: *"EVERY RULE HERE NEEDS A TWIN in og-card.tsx's GRADIENT_AVATAR_BACKGROUND […] Both directions are asserted by tests; do not add one without the other."* Satori also renders **no CSS animation at all**, and one cosmetic has already caused a hard failure rather than a silent one — `frame.prism`'s conic-gradient threw *"Failed to parse declaration"*, a 500 on the whole OG route, which is why `FRAME_STYLE["frame.prism"]` is a linear sweep through the same stops.

> ### THE DECISION
>
> **The share card renders the RESTING FRAME of every animated cosmetic.** Not a still of "the animation at some moment", not `opacity: 1`, not the loudest keyframe — the specific still the class shows when its animation is switched off.

### 6.2 What "resting frame" means, per animation

**The general rule, which makes all of this nearly free:**

> **Every animation added to an existing cosmetic class MUST have its `0%` / `100%` keyframe be byte-identical to that class's base declaration.**

Then three things fall out at once: (a) the reduced-motion `animation: none` lands on the visually correct still automatically; (b) the existing `og-card.tsx` twin remains correct with **no edit**; (c) there is one authoritative resting value instead of three that can drift.

This is the generalisation of the lesson `globals.css` already learned on `.co-dust`, whose comment is worth re-reading because it is the failure mode in miniature:

> The base `opacity` is load-bearing and must stay LOW. […] It is only seen when the animation is off — i.e. under prefers-reduced-motion below. With no base declared the fallback was `opacity:1`: two permanently visible full-strength scratch lines, louder than any frame of the animation, which is the opposite of what reduced motion is for.

**Revision 1's snippet violated the rule on its very first class.** Its `neon-hum-cyan` 0%/100% keyframe was `0 0 16px 3px rgba(34,224,255,0.8)`, while the shipped `.cf-neon-cyan` base is `0 0 14px 2px rgba(34,224,255,.75)` and `FRAME_STYLE["frame.neon-cyan"]` is `0 0 14px 2px rgba(34,224,255,0.75)`. A three-way desync in five lines: reduced-motion users would have seen a dimmer glow than the animation's own resting state, and the share card a third value. Corrected below.

| Class | Animation added | Resting frame (= base rule = og-card twin) | og-card edit needed? |
|---|---|---|---|
| `.cf-neon-cyan` | `neon-hum-cyan` — gas-tube flicker | `background:#0b2a2e; box-shadow: 0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34,224,255,.75)` — **the existing base, unchanged** | **No.** `FRAME_STYLE["frame.neon-cyan"]` already matches. |
| `.cf-neon-magenta` | `neon-hum-magenta` | `background:#2a0b22; box-shadow: 0 0 0 2px #ff3ba7, 0 0 16px 3px rgba(255,59,167,.7)` — existing base | **No.** |
| `.cf-toxic` | `toxic-simmer` — bioluminescent breathe | `background:#122a10; box-shadow: 0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124,255,77,.6)` — existing base | **No.** |
| `.cf-vhs` | `vhs-twitch` — periodic RGB-split | `background:#111; box-shadow: -3px 0 0 0 #ff2e63, 3px 0 0 0 #21d4fd, 0 0 0 1px #333; transform: none` — existing base, **plus an explicit `transform: none`** | **No.** |
| `.co-vhs` | already animates (`::after` roll); no change | unchanged | No. |
| Aura (Tier V / `marquee_veteran`) | `marquee-breathe` | `box-shadow: 0 0 35px 5px rgba(245,197,24,.25), 0 0 0 1px rgba(245,197,24,.4)` | **YES — new item, new twin.** See §6.4. |

Corrected CSS. Note every `0%, 100%` line is a verbatim copy of the base rule above it:

```css
/* Electric Neon Cyan: high-frequency gas-tube flicker.
   0%/100% is byte-identical to the base rule, which is what makes the
   reduced-motion still and the og-card twin correct for free. */
.cf-neon-cyan {
  background: #0b2a2e;
  box-shadow: 0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34, 224, 255, .75);
  animation: neon-hum-cyan 3.2s infinite;
}
@keyframes neon-hum-cyan {
  0%, 100% { box-shadow: 0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34,224,255,.75); }
  45%      { box-shadow: 0 0 0 2px #22e0ff, 0 0 22px 5px rgba(34,224,255,.95); }
  47%      { box-shadow: 0 0 0 2px #158a9e, 0 0  8px 1px rgba(34,224,255,.40); }
  49%      { box-shadow: 0 0 0 2px #22e0ff, 0 0 20px 4px rgba(34,224,255,.90); }
  85%      { box-shadow: 0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34,224,255,.75); }
}

/* Radioactive Toxic: slow bioluminescent simmer. */
.cf-toxic {
  background: #122a10;
  box-shadow: 0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124, 255, 77, .6);
  animation: toxic-simmer 2.6s ease-in-out infinite;
}
@keyframes toxic-simmer {
  0%, 100% { box-shadow: 0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124,255,77,.6); }
  50%      { box-shadow: 0 0 0 3px #9eff78, 0 0 26px 6px rgba(124,255,77,.9); }
}

/* VHS: periodic RGB-split twitch. `transform: none` at rest is explicit, not
   implied — see the transform note below. */
.cf-vhs {
  background: #111;
  box-shadow: -3px 0 0 0 #ff2e63, 3px 0 0 0 #21d4fd, 0 0 0 1px #333;
  transform: none;
  animation: vhs-twitch 4.5s steps(1) infinite;
}
@keyframes vhs-twitch {
  0%, 94%, 100% { box-shadow: -3px 0 0 0 #ff2e63,  3px 0 0 0 #21d4fd, 0 0 0 1px #333; transform: none; }
  95%           { box-shadow: -5px 0 0 0 #ff2e63,  5px 0 0 0 #21d4fd, 0 0 0 1px #555; transform: translateX(1px); }
  97%           { box-shadow:  4px 0 0 0 #ff2e63, -4px 0 0 0 #21d4fd, 0 0 0 1px #444; transform: translateX(-1px); }
}

/* Radiant Marquee Golden Aura. NEW class — needs a new og-card twin (§6.4). */
.co-marquee-aura {
  box-shadow: 0 0 35px 5px rgba(245, 197, 24, .25), 0 0 0 1px rgba(245, 197, 24, .4);
  animation: marquee-breathe 4s ease-in-out infinite;
}
@keyframes marquee-breathe {
  0%, 100% { box-shadow: 0 0 35px  5px rgba(245,197,24,.25), 0 0 0 1px   rgba(245,197,24,.4); }
  50%      { box-shadow: 0 0 55px 12px rgba(245,197,24,.45), 0 0 0 1.5px rgba(245,197,24,.7); }
}
```

**Transform composition — verified against the compiled stylesheet, not assumed.** Tailwind v4 compiles `translate-y-*` to the `translate:` **longhand** and `rotate-*` to the `rotate:` **longhand**, not to the `transform` shorthand. Per the CSS spec the individual transform properties apply *after* `transform`, so:

- A keyframe animating **`transform`** (as `vhs-twitch` does) **composes** with a Tailwind `translate-y-2` on the same element rather than clobbering it. This is the safe choice.
- A keyframe animating **`translate:`** or **`rotate:`** would clobber the Tailwind utility outright.

**Therefore: cosmetic keyframes must animate `transform`, never the `translate:` / `rotate:` longhands.** And because the resting value must be explicit (§6.2), write `transform: none` in the base rule rather than omitting it — an omitted base is how `.co-dust` ended up at `opacity: 1`.

### 6.3 Reduced motion

`DESIGN.md` commits, in the user's own words dated 2026-08-24: *"Slow ambient atmosphere loops (>10s period, e.g. searchlight drift) are permitted; all loops still die under prefers-reduced-motion."* None of the loops above is slow — 2.6s to 4.5s — so all of them die.

**Requirement: every newly animated class is added to the EXISTING cosmetics reduced-motion block in `src/app/globals.css` (~line 368), not to a new block.**

```css
@media (prefers-reduced-motion: reduce) {
  .cf-prism, .cf-neon-cyan, .cf-neon-magenta, .cf-toxic, .cf-vhs,
  .co-grain, .co-flicker, .co-marquee-aura,
  .co-vhs::after, .co-dust::before, .co-dust::after { animation: none; }
}
```

Do not add `!important`, and do not add a fourth `@media (prefers-reduced-motion: reduce)` block. The file already has three, each with a distinct scope — first-party cosmetics (~368), the Tailwind built-in catch-all for `animate-pulse` / `animate-bounce` / `animate-ping` (~388, with `animate-spin` deliberately excluded because every use of it here is a loading spinner and freezing one reads as a hung request), and the duel animations (~456). Cosmetics belong in the first. `src/lib/cosmetics/motion.test.ts` brace-matches all three and joins them precisely so a rule landing in the wrong one still counts — but a fourth block is still noise.

**The enforcement is already built and it is nearly free.** `motion.test.ts` walks `CATALOGUE.filter(i => i.animated)` and derives the class name from the id (`frame.` → `cf-`, `overlay.` → `co-`), asserting a reduced-motion rule exists for each. So the *only* code change needed to make the requirement self-enforcing is one flag per item in `src/lib/cosmetics/frames.ts`:

```ts
{ id: "frame.toxic",        …, animated: true },  // was: no flag
{ id: "frame.neon-cyan",    …, animated: true },  // was: no flag
{ id: "frame.neon-magenta", …, animated: true },  // was: no flag
{ id: "frame.vhs",          …, animated: true },  // was: no flag
```

Forget the flag and the animation ships unguarded; set it and forget the CSS and the test fails. Note `animated` also gates the one-overlay-per-profile cap, so check that no UI reads it as "overlay-only" before flagging four frames.

### 6.4 The required new test: `FRAME_STYLE` / `OVERLAY_STYLE` twin coverage

**There is a real gap here today.** `og-card.test.ts` asserts twin coverage in both directions for `GRADIENT_AVATAR_BACKGROUND` — but **not** for `FRAME_STYLE` or `OVERLAY_STYLE`. Those two maps are module-private (`const`, not `export const`, at `og-card.tsx:471` and `:512`), and the render test that loops `itemsForSlot("frame")` cannot catch a missing row: `ProfileCard` falls back with `FRAME_STYLE[frameId] ?? FRAME_STYLE["frame.brass"]`, so a frame with no twin renders as *brass* and the "did it render?" assertions (`colors > 32`, `inkFraction > 0.02`) pass happily. A user's toxic frame would quietly become brass on every share card.

**Required:**

1. `export` `FRAME_STYLE` and `OVERLAY_STYLE` from `src/lib/og-card.tsx`.
2. Add a both-directions coverage test modelled exactly on the existing `describe("gradient avatars reach the share card")`:
   - every `itemsForSlot("frame")` id has a `FRAME_STYLE` row;
   - every `itemsForSlot("overlay")` id except `overlay.none` has an `OVERLAY_STYLE` row (`overlay.none` paints nothing by design and the existing test comment says so);
   - no `FRAME_STYLE` / `OVERLAY_STYLE` key is absent from the catalogue, so an orphan row left by a removed cosmetic is caught too.
3. For any class whose resting frame per §6.2 equals its existing base, assert the twin's value **matches the base declaration string in `globals.css`**. This is the assertion that would have caught Revision 1's `.cf-neon-cyan` desync, and it is worth writing even though it is a string comparison — `motion.test.ts` establishes the precedent that reading `globals.css` from a `node` test is the accepted tool for this class of contract.

**Do not** assert that Satori's *rendered pixels* match the browser's. `og-card.tsx` warns *"Satori's gradient interpolation is measurably not the browser's, so these are verified by rendering, never by assuming they match the page"*, and there is a whole comment on `.cb-vignette` explaining that the OG copy keeps an older gradient **on purpose** because Satori does not follow the spec there. The contract is *"a twin exists and states the resting values"*, not *"the twin looks identical"*.

### 6.5 Where the aura lives (a decision Rev 1 left open)

Revision 1 introduced `.aura-golden-marquee` as a free-floating class on the profile showcase. That places it outside every guard the cosmetics system already has: it is not in `CATALOGUE`, so `motion.test.ts` never checks it, `ownedItemIds()` cannot grant it, `validateEquipPatch` cannot gate it, the collection gallery cannot draw it, and `og-card.tsx` has no twin for it.

**Decision: implement it as an `overlay` catalogue item, `overlay.marquee-aura` / `.co-marquee-aura`,** with `unlock: { kind: "challenge", key: "marquee_veteran_v" }` and `animated: true`. It then inherits every existing guard, test, twin slot and gallery cell for free, and the `co-` prefix means `motion.test.ts` derives its class name correctly with no change to the test.

**The cost, stated:** overlays are one-at-a-time, so the aura and film grain become mutually exclusive. That is arguably a feature (a loudness cap on a profile), and it is certainly cheaper than the alternative — a new `"aura"` member of `Slot`, which would touch `types.ts`, `catalogue.ts`, `SLOTS`, `classes.ts`, `equipped.ts`'s `ID_FIELDS` and `NULLABLE_FIELDS`, `equip-guard.ts`, `categories.ts`, `og-card.tsx` and every test that enumerates slots. Add the slot only if simultaneous overlay + aura turns out to matter.

---

## 7. Revamped Wardrobe & Browsing Experience ("The Cinema Dressing Room")

*Unchanged from Revision 1. Per §11 this is the highest polish-per-hour item in the document: it adds no new economy, no new trust boundary, and no new persisted state.*

Instead of a monolithic wall of 100+ text tiles:

1. **Live Wardrobe Mirror**: At the top of the Customise modal, the user's avatar, nameplate, background and equipped ticket stub render in a live mirror.
2. **Category Tabs** — note these already exist as data: `collectionCategories()` in `src/lib/cosmetics/categories.ts` computes exactly this division (slot-then-tagline-set), and its comment explains it was extracted from `CollectionGallery` so the coverage test could assert the real division rather than restate it. **Read from `collectionCategories()`; do not hand-write the tab list.**
   - **Frames** (Brass, Perforation, Projector, Toxic, Neon Cyan, Neon Magenta, VHS, Prism)
   - **Auras & Glows** (Marquee Golden Aura — an overlay, per §6.5)
   - **Overlays** (Film Grain, Dust & Scratches, Projector Flicker, VHS Tracking)
   - **Ticket Stubs** (Classic Manila, Vintage Silver, Velvet, Gold Foil, Obsidian Noir)
   - **Backgrounds** (Filmstrip, Spotlight, Velvet)
   - **Taglines** (already split by `set`, ~88 items across several sets — *"a single list of that length is an index, not a collection"*)
3. **Instant Preview on Tap**: clicking an item previews it in the mirror before "Save".
4. **Source Transparency**: locked items display *"Dropped from Reel Canister"* / *"Earned from Achievement: Master Curator (Tier V)"* / *"Unlocked at Career Level 25"*. This maps one-to-one onto `Unlock`'s discriminant (`drop` / `challenge` / `level` / `marquee` / `starter` / `purchase`), so it is a switch over a type that already exists. `purchase` grants nothing (§5.4) and should read as *"Not available"*, never as *"Buy"*.

**Mirror caveat:** the mirror must render from `resolveEquipped()` (or `sanitizeEquipped()`), not from raw `showcase.equipped`. Both functions exist precisely so *"a profile is never left half-dressed"* when an equipped id turns out to be unowned. A mirror that renders the raw stored value would show a user a cosmetic their public profile does not.

---

## 8. Ticket Stub Maturation (Goodbye "Premiere Pass")

*Unchanged in intent from Revision 1; the actual strings are added so this is a diff and not an argument. Per §11 this ships first: it is small, immediate, and depends on nothing.*

- The feature is renamed to **"Cinema Ticket Stub"** (or simply **"Ticket Stub"**).
- Copy is revised away from corporate VIP/snob wording toward authentic vintage cinema admission stamps.

**The strings, and where they live.** All of them are in `src/lib/ticket-canvas.ts`:

| Line | Current | Proposed |
|---|---|---|
| `:257` | `"✦ MOVIERANKER OFFICIAL PREMIERE PASS ✦"` | `"✦ MOVIERANKER · ADMIT ONE ✦"` |
| `:432` | `"OFFICIAL PASS"` | `"ADMIT ONE"` |
| `:437` | `"VERIFIED VERDICT"` | `"STANDARD ADMISSION · 35MM"` |
| `:459` | `"HEAD-TO-HEAD RANKING"` | `"HEAD-TO-HEAD · ONE SITTING"` |
| `:265` | `"CINEMA RANKING CONSENSUS"` (title fallback) | `"TONIGHT'S RANKING"` |

The `// RIGHT STUB: "ADMIT ONE" & Barcode` comment at `:426` already describes the intended design; the rendered text just never caught up.

**Rename scope.** `generatePremierePassCanvas`, `exportPremierePassBlob`, `copyPremierePassToClipboard`, `downloadPremierePass`, `PremierePassCard`, `PremierePassCardProps` and the `"Copy Premiere Pass"` / `"Premiere Pass copied to clipboard!"` / `"Downloaded Premiere Pass PNG"` strings in `src/components/ShareButton.tsx`. Note the identifiers are referenced by `src/lib/e2e-theatrical.test.ts`, `src/lib/adversarial-concurrency-deep.test.ts`, `src/lib/ticket-canvas.test.ts`, `.edge.test.ts` and `.stress.test.ts`. **Rename the user-visible strings first as a standalone change; treat the identifier rename as a separate, mechanical follow-up.** Bundling them turns a five-string copy fix into a multi-file test churn, and the copy is the part users see.

- High-tier achievements unlock new canvas render textures: **Gold Foil Stub** (metallic gold specular grain), **Velvet Stub** (rich burgundy flock texture), **Obsidian Noir Stub** (matte black with silver lettering). "VIP" is dropped from the velvet variant's name for the same reason as the copy above.

---

## 9. Data Model & Technical Implementation Details

### 9.1 One Migration Required, And It Is The Migration That Makes Everything Else Safe

> **This section replaces Revision 1's §9.1 "Zero Database Migrations Required", which was the most load-bearing false statement in the document.** The claim was not merely wrong about paperwork; the omission was a security hole. Everything below is implemented in **`supabase/migrations/20260904_showcase_server_writes.sql`**.

#### 9.1.1 The hole

`supabase/schema.sql:152` grants:

```sql
create policy "write own" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
```

The browser holds a real authenticated PostgREST client (`src/lib/supabase/client.ts`, `createBrowserClient` with the anon key and the user's session). So any signed-in user can, from devtools, run:

```js
supabase.from("profiles").update({ showcase: { lifetimeXp: 999999 } }).eq("id", myOwnId)
```

and RLS is **satisfied**, because it is their own row.

Today the blast radius is contained because `/api/profile` deliberately refuses to trust the client — it strips `lifetimeXp` (the comment at ~line 156 explains that *"a single PATCH could inflate lifetimeXp arbitrarily, and every level-gated cosmetic, the pin gate, and the proposals gate all trust the level that number produces"*), shape-checks and then re-validates `avatarClaims` against the user's own films (*"an unchecked claim is permanent — this is the one field where a missed validation cannot be undone by a later correct write"*), strips `taglineText`, and recomputes cosmetic ownership from finished-list rows. **But all of that defends the API path only. None of it stands in front of the direct-RLS path.**

This is not hypothetical. `supabase/audit-lifetime-xp.sql` exists because two earlier bugs inflated `lifetimeXp` through the API, and it documents the consequence: *"the value is a RATCHET — the page only ever writes `max(stored, computed)` — so any row inflated while those bugs were live stays inflated forever."*

Revision 1 moved the **entire reward economy** into that same self-writable blob: `claimedAchievements` (pays XP → career level → `MIN_PROPOSAL_LEVEL`, `MIN_PIN_LIST_LEVEL`, `claimAllowance`), `unopenedCanisters` (a counter that mints loot rolls), `unlockedStubStyles`. **`POST /api/profile/canister/open` cannot be a gate on a counter the client can simply overwrite.**

#### 9.1.2 The fix

Postgres column-level privileges compose with RLS and are checked before it.

```sql
-- WRONG, and it reports success. PostgreSQL's REVOKE reference: "if a role has
-- been granted privileges on a table, then revoking the same privileges from
-- individual columns will have no effect." Supabase's bootstrap grants
-- table-level UPDATE on everything in `public` to anon/authenticated.
revoke update (showcase) on profiles from authenticated;   -- NO-OP

-- RIGHT: drop the table-level privilege, then grant back, per column, exactly
-- what the client still needs. Anything unlisted — `showcase`, and every column
-- added to `profiles` in future — becomes server-write-only by default.
revoke update on table public.profiles from anon, authenticated;
grant  update (id, handle, visibility, referred_by) on table public.profiles to authenticated;
```

**Roles.** Stock Supabase: `anon`, `authenticated`, `service_role`. No policy anywhere in `schema.sql`, `upgrade-1/2/3.sql` or `20260902_list_upvotes.sql` carries a `to <role>` clause, so every policy applies to `PUBLIC` and role separation comes from the JWT-mapped roles only. `authenticated` **is** the correct name, and it covers both the browser client and the cookie-based server client in `src/lib/supabase/server.ts` — which is why the server-component ratchet breaks too. `anon` is revoked alongside it: RLS already denies it, but failing closed costs nothing and this migration should not depend on a policy elsewhere staying correct.

**Why `id` is in the grant-back list:** PostgREST renders `.upsert(payload, { onConflict: "id" })` as `INSERT … ON CONFLICT (id) DO UPDATE SET id = excluded.id, …` — every payload column lands in the SET list. Harmless, since `with check (auth.uid() = id)` means the only satisfying value is the one already there.

#### 9.1.3 The server-side write path

```sql
create or replace function public.set_profile_showcase(p_user_id uuid, p_showcase jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$ … $$;

revoke all    on function public.set_profile_showcase(uuid, jsonb) from public, anon, authenticated;
grant  execute on function public.set_profile_showcase(uuid, jsonb) to service_role;
```

**On `set search_path = ''`.** `schema.sql`'s `save_list` carries the comment *"No `set search_path = ''`: that idiom is for SECURITY DEFINER functions; here it would break the unqualified lists/list_movies references at runtime."* That comment says exactly when the idiom applies and when it breaks things. `set_profile_showcase` **is** `SECURITY DEFINER`, so the idiom applies — and the price is that every reference must be schema-qualified (`public.profiles`; `pg_catalog` is always implicitly searched, so the jsonb builtins need nothing). Removing the qualifier makes the function raise `42P01` at runtime, not at create time.

**EXECUTE is deliberately NOT granted to `authenticated`, and this is the key decision.** Granting it there would reopen the exact hole the revoke closes — `supabase.rpc("set_profile_showcase", …)` from devtools is the revoked UPDATE with extra steps. **Nothing in `showcase` is safe for a client to author:** not `lifetimeXp` (career level and both capability gates), not `avatarClaims` (`mergeShowcase` unions and can never remove, so an unchecked claim is permanent), not `equipped` (ownership is recomputed server-side from the user's own finished lists by `ownedItemIds` + `validateEquipPatch`), not `favoriteListId` (level gate plus an ownership check), and not the three new reward fields. **The column becomes server-only, full stop.**

The function is therefore not strictly *necessary* for `service_role`, which already holds the privilege and bypasses RLS. It exists because (a) it is one named, greppable write path to audit instead of scattered `.update({ showcase })` calls; (b) it enforces shape, a size ceiling, and row-existence in the database rather than by convention; (c) `supabaseAdmin()` is an RLS-exempt hammer and making the target user an explicit argument turns "whose showcase am I writing" into a reviewable parameter instead of an ambient property; and (d) it can later be granted to a narrower role without re-plumbing any call site.

**Recorded and rejected:** an argument-free, `authenticated`-callable `bump_profile_lifetime_xp()` that recomputes career XP in SQL and ratchets it. It would be forge-proof and would remove the service-role dependency, and the SQL exists in draft in `audit-lifetime-xp.sql`. **Rejected** because it would put a second copy of the XP curve and the XP-source rules in the database — the precise duplication `career-xp.ts`'s header says four divergent copies of this calculation once caused. Revisit only as a deliberate trade.

#### 9.1.4 Deploy ordering — this is the part that bites

**The SQL must be applied BEFORE the app code that depends on the RPC ships**, and the app code must ship before anything relies on showcase writes again. The window between them is a window in which showcase writes fail, and they fail **quietly** at two of three call sites:

1. `src/app/(site)/u/profile/page.tsx:300` fires the ratchet as a floating `void supabase.from("profiles").update({ showcase })` — unawaited, unchecked, no error handling at all. After the revoke it returns `42501` and nothing looks at the result. Banked XP silently stops ratcheting. Because the ratchet is `max(stored, computed)` the damage is not permanent, but it is invisible.
2. `src/app/api/profile/route.ts:402` sends `visibility` **and** `showcase` in one `.update(update)`. After the revoke that statement fails as a whole, so a visibility toggle travelling with a showcase patch also stops working. This one at least surfaces as a 500.

**`SUPABASE_SERVICE_ROLE_KEY` becomes REQUIRED.** Today it is optional — `src/lib/supabase/admin.ts` notes it *"throws at call time if unset; fine because deletion is opt-in UI"*. After this migration it gates ordinary profile customisation. **Set it in every deploy environment before applying the SQL.**

#### 9.1.5 Call sites that must migrate to the RPC

Complete list, from `grep -rn 'from("profiles")' src/ --include=*.ts --include=*.tsx` filtered to writers. There are **27** `from("profiles")` expressions; **24 are pure reads** and are unaffected.

| # | Call site | Statement | Action |
|---|---|---|---|
| 1 | `src/app/(site)/u/profile/page.tsx:300-302` | `.update({ showcase: nextShowcase }).eq("id", …)` | **MUST MIGRATE.** The lifetime-XP ratchet, from a server component on the user's own session client, `void`-ed and unchecked. Replace with `set_profile_showcase(user.id, nextShowcase)` via the service-role client. Keep it off the render path but stop swallowing the outcome — the ratchet floor gates cosmetics, pinning and proposals, so a permanently failing write deserves a server log line. |
| 2 | `src/app/api/profile/route.ts:402-403` | `.update(update).eq("id", …).select("id")` | **MUST MIGRATE AND MUST SPLIT.** `update` is assembled at ~148 (`visibility`) and ~390 (`showcase`) and may carry either or both. Keep `visibility` on the owner-scoped `.update()` (still granted); route `showcase` through the RPC. The existing 409 *"claim a handle first"* branch keys off `.select("id")` returning null — the RPC raises `P0002` for the same condition, so that branch must switch to reading the raised error. |
| 3 | `src/app/api/profile/route.ts:119-120` | `.upsert({ id, handle, referred_by? }, { onConflict: "id" })` | **NO CHANGE.** INSERT is untouched and all three columns are in the grant-back list, so the `ON CONFLICT DO UPDATE` still plans. Listed so nobody has to re-derive that it is safe. |
| 4 | *new* `POST /api/profile/achievements/claim` | writes `showcase.claimedAchievements` | Must use the RPC from day one. |
| 5 | *new* `POST /api/profile/canister/open` | writes `showcase.unopenedCanisters` and granted ids | Must use the RPC from day one — **if canisters are built at all (§5.2, §11).** |

**Verified as read-only and unaffected:** `src/lib/referrals.ts` (3 selects), `src/lib/shortlist.ts:159`, `src/lib/trending.ts:195`, `src/components/SiteHeader.tsx:23`, `src/app/r/play/play-room.tsx:257`, `src/app/(site)/compare/[a]/[b]/page.tsx:226`, `src/app/(site)/l/[id]/page.tsx:195,282`, `src/app/(site)/settings/page.tsx:19`, `src/app/(site)/u/[handle]/page.tsx:43,110,146`, `src/app/(site)/u/[handle]/opengraph-image.tsx:61`, `src/app/(site)/u/profile/page.tsx:73,118`, `src/app/api/profile/availability/route.ts:18`, `src/app/api/profile/route.ts:39,103,195`, `src/app/api/proposals/route.ts:28`, `src/app/api/admin/proposals/route.ts:77`, `src/app/api/admin/moderation/route.ts:100`.

**Suggested shape, so there is one place to review rather than four:** a `writeShowcase(userId, showcase)` helper beside `reconcileCareerXp` in `src/lib/career-xp.ts` (or a new `src/lib/profile-write.ts`) holding the `supabaseAdmin()` import, so no route or page acquires the RLS-exempt client directly.

#### 9.1.6 `schema.sql` is deliberately not edited

`supabase/schema.sql` is a run-manually reference document. The migration file lists, under `SCHEMA.SQL RECONCILIATION`, everything it needs to absorb whenever someone next reconciles it: the two grant/revoke statements and a corrected comment on the `showcase` column (which still describes only `{ achievementKeys, favoriteListId }`); `set_profile_showcase`, placed beside `save_list` so the `SECURITY INVOKER` / `SECURITY DEFINER` pair and their opposing `set search_path` advice sit together; `lists.settled_at` / `settle_facts` and the freeze trigger; and the `"read own upvotes"` policy. **`save_list` does not need re-running** — its signature is unchanged.

### 9.2 The Showcase Type

```ts
export interface ProfileShowcase {
  // --- Existing fields (src/lib/public-profile.ts) ---
  achievementKeys: string[];        // Pinned badges on the public profile (max 3 today)
  favoriteListId: string | null;
  lifetimeXp?: number;              // Monotonic ratchet; SERVER-WRITTEN ONLY
  equipped?: Equipped;
  avatarClaims?: number[];          // Unions on merge — a bad claim is permanent

  // --- New progression fields. ALL SERVER-WRITTEN (§9.1). ---

  /**
   * key -> highest tier the user has SEEN the ceremony for.
   * A LEDGER, NOT A BALANCE: XP pays out on
   * min(claimedAchievements[key], derivedTier(key, stats)), so this map can
   * withhold XP but never manufacture it. See §2.6 — this is what keeps the
   * achievement economy inside gamification.ts's derivability invariant.
   */
  claimedAchievements?: Record<string, number>;

  /**
   * Count of unopened canisters. THE ONLY FIELD HERE WITH NO DERIVABLE
   * COUNTERPART, and therefore the one that genuinely requires §9.1's revoke
   * to be safe. §5.2 recommends not adding it at all: canisters are already
   * derived and replayed from finishedThemeSlugs, which is strictly better.
   */
  unopenedCanisters?: number;

  /** e.g. ["gold_foil", "velvet", "obsidian"]. Derivable from claimedAchievements + the tier table. */
  unlockedStubStyles?: string[];

  /** Multi-list shelf expansion (1, 3 or 5 lists, by career level). */
  pinnedListIds?: string[];
}
```

**Every new field needs a branch in `parseShowcase` and in `mergeShowcase`, and getting the absent/null distinction wrong is a data-loss bug, not a validation bug.** `src/lib/cosmetics/claims.ts` documents the trap in full:

> Absent and `null` both mean "no claims", NOT "malformed". That distinction is load-bearing: `parseShowcase` turns a `null` from here into a null for the WHOLE showcase, and `mergeShowcase` then falls back to `EMPTY_SHOWCASE` — so treating a stored `avatarClaims: null` as malformed would silently wipe the user's achievements, favourite list and equipped cosmetics on their next write.

Follow that pattern exactly for `claimedAchievements`, `unlockedStubStyles` and `pinnedListIds`. Also note `MAX_PINNED_ACHIEVEMENTS = 3` is enforced in `parseShowcase` *and* `mergeShowcase`; the "1 → 3 → 5 badges" expansion in §1.1 means that constant becomes a function of level, which is a change in two places plus `validAchievementKeys`.

### 9.3 Derivation Pipeline

```ts
export interface AchievementTier {
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;          // "Bronze", "Sterling", … from §2.1
  requirement: number;
  xpReward: number;      // 5 / 10 / 15 / 20 / 30 per §2.5
  cosmeticUnlockId?: string;  // A real CATALOGUE id, checked by a test
  titleReward?: string;
}

export interface EvolvingAchievement {
  key: string;
  name: string;
  category: "curation" | "streak" | "community" | "mystery" | "social";
  tiers: AchievementTier[];   // ascending; requirement strictly increasing
  /** Progress toward the metric. Derived — see AchievementStats. */
  checkProgress: (stats: AchievementStats) => number;
  secret?: boolean;
}

/** Highest tier the DATA supports, independent of what has been claimed. */
export function derivedTier(a: EvolvingAchievement, stats: AchievementStats): number {
  const p = a.checkProgress(stats);
  return a.tiers.filter((t) => p >= t.requirement).length;
}
```

**`AchievementStats` gains these fields** (it currently has `doneLists`, `moviesRanked`, `maxMoviesInSingleList`, `coCuratedLists`, `marqueeWeeks`, `marqueeConnectionsSolved`, and the three ordering booleans):

| New field | Derived from |
|---|---|
| `consecutiveMarqueeWeeks` | `weeksSinceUtcEpoch(created_at)` over done lists with a `theme_slug` |
| `upvotesReceived` | `sum(lists.upvotes_count)` on own public done lists |
| `upvotesCast` | `count(list_upvotes where user_id = me)` — needs Part C |
| `activeReferrals` | `getReferralStats().activeReferrals` (already computed) |
| `scheduledProposals` | `shortlist_proposals where proposer_id = me and status='approved' and scheduled_week is not null` |
| `settleFacts` (optional) | `lists.settle_facts` rows, for the two surviving secrets (§3.5) |

**Two existing hazards to respect while adding these:**

- **`shapePublicProfile()` is RLS-limited by design** and must stay that way. Its comment: derived from public rows only, *"deliberately not from marquee_solves: RLS scopes that table to the reader, so a visitor counts zero solves where the owner counts their own. Feeding it in here would make a public level depend on who is looking."* Any new stat with the same property (`upvotesCast` under Part C, `settleFacts` on private lists, `scheduledProposals`) must reach `/u/[handle]` through the **banked lifetime total** or a stored snapshot, not through a fresh query. The same reasoning is why `Equipped.taglineText` is a stored snapshot and why `sanitizeEquipped()` exists as a separate function from `resolveEquipped()`.
- **The owner-scoped filter is mandatory.** `/u/profile`'s query carries a long comment explaining that `lists` has two permissive select policies that OR together, so *"an unfiltered select therefore returns this user's rows PLUS every other user's finished public lists"* — and that this is what inflated `lifetimeXp` once already. Every new query behind these stats needs `.eq("owner_id", user.id)`, and `upvotesReceived` needs it on `lists` even though it reads a public column.

### 9.4 API Endpoints

- **`POST /api/profile/achievements/claim`** — depends on §9.1.
  - Body: `{ achievementKey: string }`. No tier in the body: the server decides.
  - Recompute `AchievementStats` server-side from the user's own rows. Never trust a client-supplied stat, exactly as PATCH already refuses `lifetimeXp` and `taglineText`.
  - `next = min(stored + 1, derivedTier(...))`; if `next <= stored`, return 200 with no change (idempotent).
  - Write via `set_profile_showcase`. Rate-limit through the existing `LIMITS` / `rateKey` / `rateLimit` helpers, before validation, matching `claimHandle`'s attempt-based pattern.
  - Response: `{ tier, xpEarned, totalXp, level, cosmeticUnlockIds }`.
- **`POST /api/profile/canister/open`** — **do not build without re-reading §5.2.** If built: `unopenedCanisters` must be validated against a derived expectation, not merely decremented, and the draw must reuse `drawFrom(droppablePool(owned), seed)` with a seed namespace that cannot collide with the theme replay.

### 9.5 A real achievements page

Achievements today live inside `LevelProgressionModal` — a 332-line modal reached from `/u/profile`, which is the one place prestige cannot work. A crest that evolves through five tiers of hand-made art is a thing people want to *look at* and *link to*. **`/u/profile/achievements` (owner view, all tiers and progress bars, secrets redacted) and a read-only section on `/u/[handle]` (earned tiers only).** This is §11 item 2 and it is a prerequisite for the whole design paying off, not a nice-to-have: the reward in §2.1 is the artwork, and artwork inside a modal is a screenshot nobody takes.

---

## 10. Testing & Verification Strategy

**Revision 1 asked for "Reduced-motion CSS assertions". That test cannot be written the way it sounds.** Stating the constraint plainly:

- `vitest.config.ts` sets `test: { environment: "node", include: ["src/**/*.test.ts"] }`. **Every** test file runs in `node`. There is **no DOM**, no `window`, no `matchMedia`, and no CSS cascade.
- The `include` glob is `.test.ts` only, so **`.test.tsx` files are not collected at all.** A component test added today would silently never run. (There are zero `.test.tsx` files today, which is a symptom rather than a coincidence.)
- Ratio measured 2026-09-04: **78 test files, 16,572 test lines against 26,164 source lines** — a genuinely well-tested codebase, with **zero DOM coverage of the theatrical work** (animations, the vote stage, the celebration, the modal). Treat the exact figures as a snapshot; the ratio is the point.

So a "reduced-motion assertion" in the current setup can only **string-match `globals.css`** — and that is exactly what `src/lib/cosmetics/motion.test.ts` already does, correctly and non-vacuously: it brace-matches every `@media (prefers-reduced-motion: reduce)` body (deliberately, because *"a substring search from the first one to the end would be satisfied by a cosmetic's own rule appearing later in the file, silenced or not"*), asserts the animated set is non-empty so the test cannot pass vacuously, and checks a rule exists per animated catalogue item. **That is the right tool for this contract. Extend it; do not replace it.**

### 10.1 Layer 1 — `node`, pure logic (existing project)

1. Tier evaluation at every threshold boundary, per achievement (`requirement - 1`, `requirement`, `requirement + 1`).
2. Claim idempotency and monotonicity; and the §2.6 rule directly: **a forged `claimedAchievements` above `derivedTier` pays zero XP.** This is the single most valuable test in the document.
3. `parseShowcase` / `mergeShowcase` round-trips for each new field, including the absent-vs-`null`-vs-malformed matrix that `claims.ts` warns about, and a regression test that a stored `claimedAchievements: null` does not wipe the showcase.
4. Achievement XP budget: `Σ all tier xpReward + milestones + secrets <= 0.30 * MAX_BASE_XP`. Asserted against the constant, not a literal, so re-pricing the curve re-prices the assertion.
5. Every `cosmeticUnlockId` in the tier tables resolves through `itemById()`, in both directions.
6. Canister determinism and pool integrity (`drawFrom` stability, no duplicates, append-only order) — the existing `canister.test.ts` covers the mechanism; add a test that the level-up seed namespace cannot collide with the theme namespace, **if** §5's level canisters are built.
7. `settle_facts` cross-checks as pure functions: `filmCount` vs roster length, `duels` vs `totalComparisons() / 2`, `undefeatedTmdbId` ∈ roster.
8. **CSS contracts, by string-matching `globals.css` from `node`** — extend `motion.test.ts` rather than adding a new file: every animated catalogue item has a reduced-motion rule (already asserted; the four new `animated: true` flags make it cover the new frames for free), and every animated class's `0%`/`100%` keyframe matches its base declaration (§6.2's general rule).
9. **`FRAME_STYLE` / `OVERLAY_STYLE` twin coverage in both directions** (§6.4) — the currently-missing test, modelled on the existing `GRADIENT_AVATAR_BACKGROUND` suite.

### 10.2 Layer 2 — a new `jsdom` project (recommended)

The toast, the beacon dot, the claim button state, the crest transition and the wardrobe mirror are all DOM behaviour, and none of it is testable today. **Recommendation: add a second vitest project rather than switching the existing one.** Switching 80 `node` tests to `jsdom` would slow every one of them and change the environment under tests that were written for `node` (several read files from disk).

```ts
// vitest.config.ts — two projects, so the 80 existing node tests are untouched
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    projects: [
      { test: { name: "node",  environment: "node",  include: ["src/**/*.test.ts"] } },
      { test: { name: "dom",   environment: "jsdom", include: ["src/**/*.test.tsx"], setupFiles: ["./vitest.setup.dom.ts"] } },
    ],
  },
});
```

New dev dependencies: `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`. The `.test.tsx` glob means the split is self-documenting: a file's extension says which environment it runs in. **Note this also switches on any `.test.tsx` files already sitting in the tree unrun** — check for them and expect a first-run failure list.

What Layer 2 buys: toast appears on completion and auto-dismisses; beacon dot visibility across header and profile; claim button disabled while pending and after claiming; multi-list shelf capacity gated by level; wardrobe mirror renders `resolveEquipped()`'s output rather than the raw stored value.

### 10.3 Layer 3 — what still cannot be automated, and should be said so

**`jsdom` does not implement the CSS cascade or `prefers-reduced-motion`.** `window.matchMedia` is a stub, and `getComputedStyle` will not tell you whether a `@media` block silenced an animation. **A genuine "does reduced motion actually stop this loop" assertion needs a real browser** — Playwright, or vitest browser mode. That is out of scope here, and the honest position is:

- Layer 1 asserts the rule **exists** in the stylesheet.
- `docs/qa-checklist.md` item 37 already covers the manual pass, with instructions for Chrome's `prefers-reduced-motion` emulation. **Add each new animated class to that checklist item** as part of shipping it.
- Revisit browser-mode tests when there is a second reason to want them. One accessibility contract does not justify the infrastructure, and pretending a `jsdom` test proves it would be worse than the manual check.

### 10.4 Parity check

- `npm test` passing, with the count going **up** — a new subsystem that adds no tests is the tell.
- `npm run build` with zero TypeScript or Turbopack errors.
- **`supabase/audit-lifetime-xp.sql` run once after §9.1 is deployed**, as a before/after check that no new inflation path opened.

---

## 11. Sequencing

Revision 1 presented five subsystems as one deliverable. Their costs and risks differ by an order of magnitude, and one of them has a hard dependency on a migration. Build in this order.

| # | Item | Why here | Depends on |
|---|---|---|---|
| **1** | **§8 ticket-stub rename + copy revision** | Five strings in one file (`ticket-canvas.ts`), plus toast copy. Immediate, visible, zero risk, and it stops the product saying "OFFICIAL PASS / VERIFIED VERDICT" while the design doc calls that wording wrong. Do the user-visible strings now; leave the identifier rename as a separate mechanical follow-up so test churn does not hold up the copy fix. | nothing |
| **2** | **§9.5 a real achievements page** | Today achievements are buried inside `LevelProgressionModal` — **the one place prestige cannot work.** A crest that evolves through five tiers of hand-made art has to be somewhere a person can look at it and link to it, or §2.1's entire art budget is spent inside a dialog. This is also the cheapest way to find out whether the tier pacing in §2.4 feels right, *before* any of it is written into a database. | nothing |
| **3** | **§4 claim ceremony + toast** | The first item that writes reward state, and therefore **the first item that needs §9.1's migration.** Reuse `summariseCompletion()`'s twice-and-subtract pattern (§4.1) rather than building an event hook. | **§9.1 migration, deployed first (§9.1.4)** |
| **4** | **§7 wardrobe mirror** | The highest polish-per-hour item in the document: no new economy, no new trust boundary, no new persisted state, and `collectionCategories()` already computes the category division it needs. Reads beautifully and cannot break the reward system because it touches none of it. | nothing (better after 3) |
| **5** | **§5 canisters — LAST, or never.** | **Said plainly: this is the most machinery, the most forgeable, and the most likely thing to make a cinema site feel like a mobile gacha game.** It regresses a mechanism that is currently derived, unforgeable and reroll-proof (§5.2) into a mutable counter; its item ordering is append-only in a way that retroactively rewrites history if fumbled; and it sits next to a legal constraint (§5.4) that means it can never be monetised, so it is a slot machine with no upside. If the unboxing ceremony is wanted for its own sake — and it is a lovely piece of design — **build the ceremony over the existing derived drop and drop the counter.** | 3, and a deliberate decision |

**§2 and §3 are not a phase; they are the content the phases render.** The evolving roster (§2.4) can land with item 2 as read-only progress bars, with claiming switched on at item 3. §3.5's `settle_facts` is optional and lands with whichever of Clean Sweep / Midnight Screening survives review — or with neither.

---

## 12. Open Decisions for the Human

1. **`spotlight_sensation` / Top of the Bill thresholds (§2.4)** are provisional: they depend on community upvote volume that does not yet exist. Revisit after four weeks of real `list_upvotes` data.
2. **Are Clean Sweep and Midnight Screening worth two columns and a trigger (§3.5)?** The recommendation is yes-but-barely. Cutting both and keeping only The Purist (which is free) is a defensible call and the spec loses very little.
3. **Canisters: ceremony-over-derived-drops, or not at all (§5.2, §11)?** The counter is not recommended in any form. The ceremony is genuinely good design.
4. **The `SUPABASE_SERVICE_ROLE_KEY` dependency (§9.1.4)** makes profile customisation depend on an env var that is optional today. Acceptable? The only alternative that removes it duplicates the XP curve in SQL (§9.1.3, rejected).
5. **A `jsdom` vitest project (§10.2)** brings three dev dependencies and a config split. Worth it for the theatrical layer, or leave the DOM untested until there is a bug that would have been caught?
6. **`overlay.dust` gains a second unlock path (§3.3)** and `Unlock` is a single discriminated value. Grant a different item for The Purist, or move `overlay.dust` out of the drop pool as a one-way decision that rewrites nobody's history only if done before anyone has drawn it?
