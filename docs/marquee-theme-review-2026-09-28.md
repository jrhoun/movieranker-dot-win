# Marquee theme review — 2026-09-28

Concern: few visitors finish or sign up; the weekly Marquee lists may be too obscure. Owner wants lists that are spicier, built from films more people have seen, and with cleverer premises ("best vehicle movie", "best movie on an airplane", "best movie with a US president", "best movie where a monster stalks an action hero").

Proxy for "how many people have seen it": TMDB `vote_count`, fetched live for every id in the pool on 2026-09-28. Every id in the pool (before and after) resolved; there are no dead ids.

## 1. Measurement of the pool as it was (52 themes)

Condensed: slug, median vote_count of the roster, films under 3,000 votes. Full per-film output is in the throwaway script's `measure.out`.

| # | slug | median | <3k | note |
|---|------|-------:|----:|------|
| 0 | secretly-same-story | 23,431 | 0 | |
| 1 | best-hairpieces | 6,814 | 1 | 7 films; The Flintstones 2,689 |
| 2 | one-location | 9,579 | 1 | Clue 2,072 |
| 3 | dads-having-a-bad-one | 22,337 | 0 | |
| 4 | rain-soaked-cinema | 15,597 | 0 | |
| 5 | crimes-gone-stupid | 12,727 | 0 | |
| 6 | so-bad-theyre-great | 4,059 | 1 | The Room 1,589; Twister/Gremlins don't fit the premise |
| 7 | trains-youd-rather-not-miss | 9,539 | 0 | |
| 8 | sequels-that-beat-the-original | 14,913 | 0 | 7 films |
| 9 | everyone-is-lying | 17,495 | 0 | |
| 10 | deserts-dust-bad-decisions | 14,819 | 0 | |
| 11 | that-house-was-a-mistake | 12,082 | 0 | |
| 12 | neon-dystopia | 22,286 | 0 | |
| 13 | trapped-in-a-loop | 12,489 | 0 | |
| 14 | undercover-lies | 15,749 | 2 | Double Jeopardy 1,556; Murder Most Foul 176 (neither is an undercover film) |
| 15 | high-seas-peril | 13,312 | 1 | The Perfect Storm 2,670 |
| 16 | courtroom-fire | 3,652 | 3 | To Kill a Mockingbird 2,963; My Cousin Vinny 1,984; The Verdict 769 |
| 17 | the-grand-heist | 11,624 | 0 | |
| 18 | culinary-meltdowns | 3,710 | 1 | Julie & Julia 2,260; four films under 3,800 |
| 19 | space-silence | 16,796 | 0 | |
| 20 | unhinged-holidays | 6,121 | 1 | Christmas Vacation 2,805 |
| 21 | frozen-wastelands | 10,062 | 0 | |
| 22 | summer-gone-wrong | 6,595 | 1 | Do the Right Thing 2,088 |
| 23 | fast-lanes-high-octane | 11,685 | 0 | |
| 24 | 90s-explosive-action | 11,716 | 0 | |
| 25 | gothic-shadows | 21,344 | 0 | |
| 26 | whodunit-manor | 5,789 | 2 | Clue 2,072; Gosford Park 1,292 |
| 27 | suburban-dystopia | 13,724 | 1 | Pleasantville 1,967 |
| 28 | boxing-redemption | 6,648 | 0 | |
| 29 | journalism-truth | 10,466 | 1 | All the President's Men 2,163 |
| 30 | hallway-shootouts | 23,110 | 0 | |
| 31 | wild-west-standoff | 7,954 | 1 | Tombstone 2,560 |
| 32 | jazz-and-obsession | 14,887 | 0 | |
| 33 | monsters-in-the-mist | 12,866 | 0 | |
| 34 | creepy-dolls-puppets | 5,850 | 1 | Dead Silence 2,522 |
| 35 | high-stakes-gambling | 9,393 | 1 | Rounders 1,997 |
| 36 | transit-at-30000-feet | 5,382 | 0 | never ran; superseded (see §3) |
| 37 | coming-of-age-roadtrip | 7,427 | 0 | all >= 5.5k |
| 38 | surreal-dreamscapes | 19,938 | 0 | |
| 39 | sarcastic-crusaders | 29,619 | 0 | |
| 40 | toxic-best-friends | 11,105 | 0 | |
| 41 | post-apocalyptic-ruins | 15,681 | 0 | |
| 42 | artificial-hearts | 15,559 | 0 | |
| 43 | high-school-social-warfare | 6,404 | 0 | 7 films; Legally Blonde is law school |
| 44 | mountain-peak-peril | 2,193 | 4 | Cliffhanger 2,745; Vertical Limit 1,211; Touching the Void 480; Alive 1,641 — worst in the pool |
| 45 | golden-age-giants | 6,245 | 0 | 7 films; premise-limited (studio era) |
| 46 | haunted-hotels | 12,320 | 0 | |
| 47 | magic-and-illusions | 17,901 | 0 | |
| 48 | espionage-in-the-cold | 4,028 | 1 | The Spy Who Came In from the Cold 349 |
| 49 | midnight-drive | 10,407 | 0 | LIVE this week; Locke 3,046 |
| 50 | diner-conversations | 22,667 | 0 | |
| 51 | cinematic-masterpieces | 30,747 | 0 | 8 films |

Pool-wide: 16 of 52 themes had a median under 8,000; 4 had two or more films under 3,000; 24 roster slots were under 3,000 votes.

**Heavily repeated films** (before): Terminator 2, The Matrix, The Shining, Inception x5 each; The Dark Knight, Ocean's Eleven, Superbad, The Truman Show, Knives Out x4; 18 more films x3 (Blade Runner, Big Lebowski, Fargo, Shawshank, 12 Angry Men, Psycho, Jaws, Catch Me If You Can, Gremlins, Mission: Impossible, Speed, Breakfast Club, Fury Road, Snowpiercer, Ex Machina, Spider-Verse, Baby Driver, Get Out). None of the x4/x5 films were used in the new themes. Gremlins dropped to x2 (removed from so-bad-theyre-great).

**Roster sizes**: five themes are not six films — best-hairpieces (7), sequels-that-beat-the-original (7), high-school-social-warfare (7), golden-age-giants (7), cinematic-masterpieces (8). Not changed here (not asked); worth trimming to six for consistency.

**Title/blurb spoiler or naming flags** (arguable, nothing changed):
- `magic-and-illusions` — title "The Pledge, Turn & Prestige" names The Prestige, which is in the roster. Clearest violation of "never name contained films".
- `secretly-same-story` — blurb "A farm boy, a hacker, a wizard, and a boxer" identifies four of six films by description.
- `everyone-is-lying` — title plus quiz answer ("a truth hidden until very late") tells a first-time viewer that every film has a twist; soft spoiler for the twist films in it.
- `haunted-hotels` / `neon-dystopia` — premise-level hints only; fine.

## 2. Rotation

`tonightsShortlist` → `pickTonightsEntry(SHORTLIST_THEMES, weeksSinceUtcEpoch(now))` = `pool[week % pool.length]`. `MARQUEE_EPOCH_WEEK` is week 2956 (Monday 2026-08-24); today (2026-09-28) is week 2961, Marquee #6. With 52 themes, `2961 % 52 = 49` = `midnight-drive` (Drive, Baby Driver, Collateral, Nightcrawler, Locke, Heat) — matches what is live.

Consequence of `week % length`: any change to the array length re-maps every week, including the running one. Appending 12 would make `2961 % 64 = 17` (= the-grand-heist) go live mid-week, breaking `theme_slug` for anyone mid-ranking.

**Decision**: the pool is now 63 entries (52 − 1 retired + 12 new). `2961 % 63 = 0`, so `midnight-drive` is placed at index 0, the 12 new themes at indices 1–12, and the remaining original themes follow in their original order. Verified with the real `tonightsShortlist`:

```
2026-09-28 #6  midnight-drive          (unchanged, live)
2026-10-05 #7  rooting-for-the-wrong-guy
2026-10-12 #8  hail-to-the-chief
2026-10-19 #9  the-ride-is-the-star
2026-10-26 #10 monster-vs-action-hero
2026-11-02 #11 dont-touch-anything
2026-11-09 #12 return-to-your-seats
2026-11-16 #13 animal-gets-the-best-lines
2026-11-23 #14 adults-are-useless-here
2026-11-30 #15 one-night-only
2026-12-07 #16 good-boy-best-actor
2026-12-14 #17 speak-now
2026-12-21 #18 nobody-asked-them-to-sing
2026-12-28 #19 secretly-same-story   (original order resumes)
```

The five themes that already ran (#1–#5: mountain-peak-peril, golden-age-giants, haunted-hotels, magic-and-illusions, espionage-in-the-cold) next recur about 56 weeks out. Past weeks' *recomputed* mapping changes (e.g. `tonightsShortlist(date-of-week-1)` now returns haunted-hotels, not mountain-peak-peril), but nothing in `src/` recomputes a past week from the array — finished lists carry their own `theme_slug` — so this is inert. The anchoring rule is documented in the header comment of `shortlist-themes.ts`.

**Deploy timing still matters**: this must be deployed before Monday 2026-10-05 00:00 UTC, otherwise `2962 % 63 = 1` would already be live and the anchor would be one week stale. If it slips a week, rotate the array by one (move `midnight-drive` to the end) — the comment explains how.

## 3. The 12 new themes (rotation order)

All ids verified against the TMDB API (title + year), votes as of 2026-09-28. No film appears in more than one new theme. No film that was already used 3+ times was reused.

1. **rooting-for-the-wrong-guy** — "Rooting for the Wrong Guy" · best movie where the villain is the best character
   The Silence of the Lambs 1991 (18,559) · Black Panther 2018 (24,010) · Inglourious Basterds 2009 (24,834) · Skyfall 2012 (16,434) · Spider-Man 2 2004 (16,964) · No Country for Old Men 2007 (13,817). Median 17,762; 2 over 20k.
   Answer: the antagonist is the presence everyone remembers.

2. **hail-to-the-chief** — "Hail to the Chief" · best movie with a US president (owner premise)
   Independence Day 1996 (10,759) · Air Force One 1997 (3,441) · Forrest Gump 1994 (30,536) · Iron Man 3 2013 (23,917) · Don't Look Up 2021 (9,717) · Dr. Strangelove 1964 (6,340). Median 10,238; 2 over 20k. Air Force One is under 5k but is *the* president movie.
   Answer: a sitting US president appears as a character in every film.

3. **the-ride-is-the-star** — "The Ride Is the Star" · best vehicle movie (owner premise)
   Back to the Future 1985 (22,465) · Titanic 1997 (27,800) · Cars 2006 (15,570) · Transformers 2007 (12,569) · Ford v Ferrari 2019 (9,328) · The Italian Job 2003 (6,208). Median 14,070; 2 over 20k.
   Answer: one particular vehicle is the real star.

4. **monster-vs-action-hero** — "Reload. It's Still Coming." · best movie where a monster stalks an action hero (owner premise)
   Predator 1987 (9,543) · Aliens 1986 (11,215) · Jurassic World 2015 (21,941) · The Meg 2018 (8,406) · Kong: Skull Island 2017 (11,360) · Prey 2022 (8,013). Median 10,379; 1 over 20k (the premise has no second).
   Answer: a creature turns the action hero into the hunted.

5. **dont-touch-anything** — "Don't Touch Anything" · best time-travel movie
   Avengers: Endgame 2019 (28,824) · Harry Potter and the Prisoner of Azkaban 2004 (23,690) · The Terminator 1984 (15,190) · Tenet 2020 (11,558) · Looper 2012 (11,219) · About Time 2013 (9,532). Median 13,374; 2 over 20k. Shares no film with trapped-in-a-loop.
   Answer: someone travels through time and the fallout is the plot.

6. **return-to-your-seats** — "Please Return to Your Seats" · best movie set in significant part on an airplane (owner premise)
   Top Gun 1986 (9,939) · Sully 2016 (7,906) · Flight 2012 (6,614) · Non-Stop 2014 (5,883) · Airplane! 1980 (5,276) · Con Air 1997 (4,881). Median 6,249; none over 20k. Airplane films are simply vote-thin on TMDB; these are the six most-seen that actually stay in the air.
   Answer: a large part of each story plays out aboard an aircraft in flight.
   This replaces `transit-at-30000-feet` (retired — it had never run, its roster was the same premise with weaker films, and two airplane lists in one pool is a duplicate). Nobody could hold a list, souvenir tagline or solve keyed to the retired slug.

7. **animal-gets-the-best-lines** — "The Animal Gets the Best Lines" · best talking animal
   Shrek 2001 (19,360) · Zootopia 2016 (18,552) · Finding Nemo 2003 (21,023) · Ted 2012 (13,497) · Guardians of the Galaxy 2014 (30,360) · The Jungle Book 2016 (8,654). Median 18,956; 2 over 20k.
   Answer: the quotable scene-stealer is an animal that talks.

8. **adults-are-useless-here** — "Adults Are Useless Here" · best movie where the kids outsmart the grown-ups
   Harry Potter and the Philosopher's Stone 2001 (30,293) · Home Alone 1990 (12,882) · E.T. 1982 (12,287) · Jumanji 1995 (11,592) · Coraline 2009 (9,467) · Matilda 1996 (4,974). Median 11,940; 1 over 20k.
   Answer: a child carries the plot while every adult is absent, oblivious or worse.

9. **one-night-only** — "One Night Only" · best movie set over a single night
   Die Hard 1988 (12,673) · Night at the Museum 2006 (11,231) · Cloverfield 2008 (8,129) · From Dusk Till Dawn 1996 (6,721) · Halloween 1978 (6,382) · Before Sunrise 1995 (4,879). Median 7,425; none over 20k. Tone spread was prioritised (action, family, found-footage, crime/horror, slasher, romance).
   Answer: each story begins after dark and is over by sunrise.

10. **good-boy-best-actor** — "Good Boy, Best Actor" · best movie where the dog is the real star
    John Wick 2014 (21,385) · I Am Legend 2007 (17,357) · One Hundred and One Dalmatians 1961 (6,784) · Hachi: A Dog's Tale 2009 (7,342) · The Secret Life of Pets 2016 (8,681) · Marley & Me 2008 (4,884). Median 8,012; 1 over 20k.
    Answer: a dog is the emotional centre of each film.

11. **speak-now** — "Speak Now or Forever Hold Your Peace" · best movie set at a wedding
    The Hangover 2009 (18,565) · Kill Bill: Vol. 2 2004 (15,476) · Mamma Mia! 2008 (7,177) · Ready or Not 2019 (5,908) · Wedding Crashers 2005 (4,844) · Bridesmaids 2011 (4,786). Median 6,543; none over 20k. The two under 5k are the two most obviously "wedding" films; the premise is vote-thin without them.
    Answer: a wedding is the event every plot is organised around.

12. **nobody-asked-them-to-sing** — "Nobody Asked Them to Sing" · best musical for people who hate musicals
    La La Land 2016 (18,523) · Frozen 2013 (17,913) · Beauty and the Beast 1991 (10,912) · Encanto 2021 (10,416) · The Greatest Showman 2017 (10,253) · Grease 1978 (7,842). Median 10,664; none over 20k.
    Answer: characters break into song mid-scene.

Against the targets (every film >= 5k, median >= 15k, 2 over 20k): 4 of 12 hit all three (villain, vehicle, talking animal, time travel — vehicle/time travel medians 13–14k, close). The owner's airplane and the wedding/single-night/dog premises are structurally lower on TMDB and were built from the most-seen films that honestly fit rather than padded with big films that do not.

Each new quiz obeys the four authoring rules: all four options are claims about the roster; each distractor is false for a nameable reason; the answer is `options[0]`; no option names a film. Answer-length rank across the 12 averages 2.9 (test threshold > 1.9); no answer is longer than its longest distractor by 6+.

## 4. Swaps in existing themes (slugs unchanged; live theme untouched)

Format: theme: out → in (votes).

- best-hairpieces: The Flintstones (2,689) → How the Grinch Stole Christmas 2000 (8,473). Still 7 films.
- so-bad-theyre-great: The Room (1,589) → Twilight (14,699); Twister (4,009) → Suicide Squad 2016 (22,455); Gremlins (7,168, doesn't fit) → Fifty Shades of Grey (12,557). Median 4,059 → 9,063.
- courtroom-fire: My Cousin Vinny (1,984) → Liar Liar (6,428); The Verdict (769) → Marriage Story (7,570). Median 3,652 → 5,581. To Kill a Mockingbird (2,963) kept as the canonical entry.
- culinary-meltdowns: Julie & Julia (2,260) → Cloudy with a Chance of Meatballs (6,644); Chocolat (3,579) → Charlie and the Chocolate Factory (16,415). Median 3,710 → 6,666.
- unhinged-holidays: National Lampoon's Christmas Vacation (2,805) → The Nightmare Before Christmas (10,636). Median 6,121 → 8,902.
- whodunit-manor: Gosford Park (1,292) → Sherlock Holmes 2009 (15,069). Median 5,789 → 8,977. Clue (2,072) kept.
- boxing-redemption: The Fighter (4,856) → Million Dollar Baby (10,612). Median 6,648 → 8,532.
- mountain-peak-peril: Vertical Limit (1,211) → Vertigo (6,519); Touching the Void (480) → Skyscraper (5,454); Alive (1,641) → Fall 2022 (4,902). Median 2,193 → 5,408. Quiz wording widened from "rock, ice, or thin air" to include steel; distractors still false. Cliffhanger (2,745) kept.
- espionage-in-the-cold: The Spy Who Came In from the Cold (349) → Argo (9,209). Median 4,028 → 5,537. Cold War spy films are vote-thin across the board.
- undercover-lies: Double Jeopardy (1,556) → Face/Off (6,141); Murder Most Foul (176) → Donnie Brasco (4,997). Both replacements are actually about assumed identity; median unchanged at 15,749.
- creepy-dolls-puppets: Dead Silence (2,522) → The Conjuring (13,103). Median 5,850 → 6,918.
- summer-gone-wrong: Do the Right Thing (2,088) → Us 2019 (8,321). Median 6,595 → 7,542.
- wild-west-standoff: Tombstone (2,560) → The Hateful Eight (15,648). Median 7,954 → 11,895.
- suburban-dystopia: Pleasantville (1,967) → Gone Girl (20,461). Median 13,724 → 16,720.
- high-school-social-warfare: Legally Blonde (4,734, law school) → 21 Jump Street (11,295). Median 6,404 → 8,393.
- high-stakes-gambling: Rounders (1,997) → 21 (5,164). Median unchanged at 9,393.
- transit-at-30000-feet: retired (see §3.6); its quiz removed from `connection-games.ts`.

Left alone on purpose: golden-age-giants (6,245; premise-limited, all films >= 3.6k — consider retiring), coming-of-age-roadtrip (7,427; every film >= 5.5k, all well known), journalism-truth (All the President's Men 2,163 is the genre's anchor), one-location (Clue), high-seas-peril (The Perfect Storm 2,670), midnight-drive (live).

After: 63 themes, pool median-of-medians 11,895 (was 11,716 across 52 — the middle of the pool was already healthy; the tail was the problem). Themes with median under 8,000: 16 → 12 (three of the twelve are new premise-limited themes: airplane, single night, wedding); themes with 2+ films under 3,000: 4 → 0; roster slots under 3,000 votes anywhere in the pool: 24 → 6 (Clue x2, To Kill a Mockingbird, Cliffhanger, The Perfect Storm, All the President's Men; all deliberate keeps).

## 5. Verification

- `npx vitest run src/lib`: 69 files, 1,519 tests, all passing (coverage, orphan, well-formed, answer-at-0, title-leak, length-bias, masking, taglines, option-shuffle spread).
- `npx tsc --noEmit`: clean.
- Live-week check via the real `tonightsShortlist`: 2026-09-28 → midnight-drive (Marquee #6), unchanged.
- Files changed: `src/lib/shortlist-themes.ts`, `src/lib/connection-games.ts`, this report. Nothing committed.
- Throwaway scripts: `/home/jrhoun/.claude/jobs/277dc0cf/tmp/measure.mjs` (pool measurement, cached TMDB responses) and `verify.mjs` (title/year → id resolution).
