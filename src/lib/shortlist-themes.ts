import { CONNECTION_GAMES, type ThemeConnectionGame } from "./connection-games";

/** Re-exported so existing importers keep working. */
export type { ThemeConnectionGame };

/**
 * Curated themes for "This Week's Marquee" — code data, not DB rows.
 * The connection to the theme is allowed (encouraged) to be obtuse.
 * movieIds are TMDB ids; posters are fetched via tmdb.getMovieById.
 *
 * THEMES.md — spoiler-safe curation rules:
 * A theme title/blurb must NEVER spoil any contained movie. Titles describe
 * atmosphere, patterns, or vibes — never plot outcomes, twists, or
 * identifiable late-film moments. ("Rain Soaked Cinema" good; anything that
 * names how a specific film ends bad.) Never name contained films outright;
 * obtuse connections only their viewers decode are the brand.
 *
 * Obtuse is about the CONNECTION, not the films. "Obtuse" had drifted into
 * "unfamiliar": a list nobody has seen is a list nobody ranks. Every roster
 * should be built from films most people have actually watched (TMDB
 * vote_count is the proxy we measure with; aim for every film above ~5,000
 * and a median above ~10,000), and the premise should be one a viewer gets
 * instantly and already has an opinion about ("best movie with a US
 * president", not "films that share a cinematographer's mood").
 *
 * ORDER MATTERS. shortlist.ts picks `SHORTLIST_THEMES[week % length]`, so
 * adding, removing or reordering entries re-maps every week — including the
 * one currently running. Before changing this array, compute the live index
 * (`weeksSinceUtcEpoch(now) % newLength`) and make sure the theme that is live
 * right now sits at that index in the new array. As of 2026-09-28 (week
 * 2961, 63 themes) that index is 0, which is why "midnight-drive" leads.
 */
export interface ShortlistTheme {
  slug: string;
  title: string;
  blurb: string;
  movieIds: number[];
  connectionGame?: ThemeConnectionGame;
}

export const SHORTLIST_THEMES: ShortlistTheme[] = [
  // Live for week 2961 (Marquee #6). Do not move without re-anchoring; see above.
  {
    slug: "midnight-drive",
    title: "Empty Highways, Glowing Dashboards",
    blurb: "Synths on the stereo, streetlights passing by, and nighttime contemplation.",
    movieIds: [64690, 339403, 1538, 242582, 210479, 949],
  },

  // --- The twelve added 2026-09-28: broad premises, widely seen films. ---
  {
    slug: "rooting-for-the-wrong-guy",
    title: "Rooting for the Wrong Guy",
    blurb: "The hero is fine. The hero is great. Now let's talk about the one you actually remember.",
    movieIds: [274, 284054, 16869, 37724, 558, 6977],
  },
  {
    slug: "hail-to-the-chief",
    title: "Hail to the Chief",
    blurb: "Motorcades, red phones, and the leader of the free world having a very long day.",
    movieIds: [602, 9772, 13, 68721, 646380, 935],
  },
  {
    slug: "the-ride-is-the-star",
    title: "The Ride Is the Star",
    blurb: "Chrome, horsepower, and a co-star that never learned its lines. Yes, boats count.",
    movieIds: [105, 597, 920, 1858, 359724, 9654],
  },
  {
    slug: "monster-vs-action-hero",
    title: "Reload. It's Still Coming.",
    blurb: "Big guns, bigger teeth, and the toughest person on the payroll suddenly on the menu.",
    movieIds: [106, 679, 135397, 345940, 293167, 766507],
  },
  {
    slug: "dont-touch-anything",
    title: "Don't Touch Anything",
    blurb: "Paradoxes, grandfathers, and the one rule everyone breaks within ten minutes.",
    movieIds: [299534, 673, 218, 577922, 59967, 122906],
  },
  {
    slug: "return-to-your-seats",
    title: "Please Return to Your Seats",
    blurb: "Cruising altitude, one working bathroom, and nowhere to step outside for a minute.",
    movieIds: [744, 363676, 87502, 225574, 813, 1701],
  },
  {
    slug: "animal-gets-the-best-lines",
    title: "The Animal Gets the Best Lines",
    blurb: "Fur, scales, or stuffing: whoever's talking, it isn't the human, and it's funnier.",
    movieIds: [808, 269149, 12, 72105, 118340, 278927],
  },
  {
    slug: "adults-are-useless-here",
    title: "Adults Are Useless Here",
    blurb: "Every grown-up in the room is either absent, oblivious, or actively the problem.",
    movieIds: [671, 771, 601, 8844, 14836, 10830],
  },
  {
    slug: "one-night-only",
    title: "One Night Only",
    blurb: "Everything that can happen between dinner and breakfast, and none of it good for your sleep.",
    movieIds: [562, 1593, 7191, 755, 948, 76],
  },
  {
    slug: "good-boy-best-actor",
    title: "Good Boy, Best Actor",
    blurb: "The humans got the poster. The dog got the movie.",
    movieIds: [245891, 6479, 12230, 28178, 328111, 14306],
  },
  {
    slug: "speak-now",
    title: "Speak Now or Forever Hold Your Peace",
    blurb: "Open bar, seating-chart politics, and at least one speech that should have been cut.",
    movieIds: [18785, 393, 11631, 567609, 9522, 55721],
  },
  {
    slug: "nobody-asked-them-to-sing",
    title: "Nobody Asked Them to Sing",
    blurb: "Mid-sentence, mid-crisis, mid-street: the feelings got too big and here comes the orchestra.",
    movieIds: [313369, 109445, 10020, 568124, 316029, 621],
  },

  // --- Original rotation, in its original order (minus the live theme above). ---
  {
    slug: "secretly-same-story",
    title: "Secretly The Same Story",
    blurb: "A farm boy, a hacker, a wizard, and a boxer walk into a monomyth.",
    movieIds: [11, 603, 671, 1366, 150540, 324857],
  },
  {
    slug: "best-hairpieces",
    title: "Best Hairpieces & Prosthetics",
    blurb: "Somewhere under three pounds of latex is a very committed A-lister.",
    movieIds: [854, 8871, 399404, 788, 1955, 7446, 118340],
  },
  {
    slug: "one-location",
    title: "One Room, No Exit",
    blurb: "Nobody leaves until the credits roll. Maximum tension on a single soundstage budget.",
    movieIds: [389, 567, 2108, 15196, 694, 264660],
  },
  {
    slug: "dads-having-a-bad-one",
    title: "Dads Having A Rough One",
    blurb: "Father's Day is once a year. These dads get two hours of sheer chaos.",
    movieIds: [12, 157336, 238, 8587, 68718, 8358],
  },
  {
    slug: "rain-soaked-cinema",
    title: "Heavy Rain, Poor Choices",
    blurb: "Trench coats, neon puddles, and detectives who refuse to check the weather forecast.",
    movieIds: [807, 335984, 78, 278, 1949, 414906],
  },
  {
    slug: "crimes-gone-stupid",
    title: "Criminal Masterminds (Not Really)",
    blurb: "The heist was flawless right up until basic human error entered the chat.",
    movieIds: [275, 115, 161, 8363, 546554, 640],
  },
  {
    slug: "so-bad-theyre-great",
    title: "So Bad They're Masterpieces",
    blurb: "You can't look away, and you definitely can't explain why.",
    movieIds: [415, 314, 8645, 8966, 297761, 216015],
  },
  {
    slug: "trains-youd-rather-not-miss",
    title: "Trains With Zero Chill",
    blurb: "High-speed locomotives where absolutely nothing goes according to schedule.",
    movieIds: [1637, 396535, 44048, 110415, 392044, 954],
  },
  {
    slug: "sequels-that-beat-the-original",
    title: "Sequels That Actually Won",
    blurb: "The rare cinematic miracles where part two outshined the original.",
    movieIds: [240, 679, 280, 155, 1891, 863, 361743],
  },
  {
    slug: "everyone-is-lying",
    title: "Everyone Is Lying To You",
    blurb: "Trust no one. Especially anyone who looks like they have it together.",
    movieIds: [546554, 77, 1124, 745, 37165, 11324],
  },
  {
    slug: "deserts-dust-bad-decisions",
    title: "Deserts, Dust & Bad Decisions",
    blurb: "Endless sand, zero hydration, and a series of questionable life choices.",
    movieIds: [76341, 438631, 954, 11, 6977, 85],
  },
  {
    slug: "that-house-was-a-mistake",
    title: "That House Was A Mistake",
    blurb: "Charming porch, great natural light, absolutely cursed basement.",
    movieIds: [694, 539, 419430, 771, 4232, 9552],
  },
  {
    slug: "neon-dystopia",
    title: "Electric Dreams & Cyber Skies",
    blurb: "Synthetic rain, flickering neon, and androids questioning their memories.",
    movieIds: [78, 335984, 603, 27205, 1726, 264660],
  },
  {
    slug: "trapped-in-a-loop",
    title: "Yesterday Once More",
    blurb: "Wake up, make mistakes, reset the clock, and do it all over again.",
    movieIds: [137, 137113, 587792, 45612, 105, 324857],
  },
  {
    slug: "undercover-lies",
    title: "Badge Off, Mask On",
    blurb: "Deep cover, shifting loyalties, and nobody knows who is wearing a wire.",
    movieIds: [1422, 769, 640, 754, 9366, 16869],
  },
  {
    slug: "high-seas-peril",
    title: "Miles of Ocean, No Rescue",
    blurb: "Endless water, rogue waves, and questionable seamanship.",
    movieIds: [578, 597, 22, 8358, 87827, 2133],
  },
  {
    slug: "courtroom-fire",
    title: "Objection Sustained",
    blurb: "Twelve jurors, one witness, and the dramatic monologue of a lifetime.",
    movieIds: [389, 881, 595, 1624, 8835, 492188],
  },
  {
    slug: "the-grand-heist",
    title: "Five Minutes In, Five Minutes Out",
    blurb: "A blueprint on the table, a laser grid in the vault, and a team of specialists.",
    movieIds: [161, 9654, 339403, 27205, 2059, 107],
  },
  {
    slug: "culinary-meltdowns",
    title: "Order Up, Fire Burning",
    blurb: "Michelin stars, screaming chefs, and kitchen nightmares on high heat.",
    movieIds: [2062, 593643, 212778, 22794, 118, 295964],
  },
  {
    slug: "space-silence",
    title: "In Orbit, No One Hears You",
    blurb: "Zero gravity, failing oxygen, and millions of miles to the nearest planet.",
    movieIds: [62, 157336, 49047, 348, 286217, 568],
  },
  {
    slug: "unhinged-holidays",
    title: "Peace on Earth, Pure Mayhem",
    blurb: "Family reunions, runaway snowmobiles, and holiday chaos.",
    movieIds: [562, 771, 10719, 9479, 927, 1585],
  },
  {
    slug: "frozen-wastelands",
    title: "Sub-Zero Survival",
    blurb: "Blizzards, frostbite, and temperatures where the truth freezes over.",
    movieIds: [275, 694, 281957, 110415, 1091, 75174],
  },
  {
    slug: "summer-gone-wrong",
    title: "Sunny Days, Dark Turns",
    blurb: "Campfires, boardwalks, and a vacation nobody will ever forget.",
    movieIds: [578, 9340, 235, 458723, 3597, 530385],
  },
  {
    slug: "fast-lanes-high-octane",
    title: "Pedal to the Metal",
    blurb: "Engines roaring, tires smoking, and speedometer needles pinned to the right.",
    movieIds: [1637, 76341, 339403, 359724, 51497, 64690],
  },
  {
    slug: "90s-explosive-action",
    title: "One Good Cop, Too Many Explosions",
    blurb: "Tank tops, ticking clocks, and rooftop chopper escapes.",
    movieIds: [562, 1637, 954, 280, 607, 602],
  },
  {
    slug: "gothic-shadows",
    title: "Castles, Capes & Dark Alleys",
    blurb: "Moonlit spires, vintage trench coats, and creatures of the night.",
    movieIds: [155, 272, 539, 694, 807, 948],
  },
  {
    slug: "whodunit-manor",
    title: "The Butler Didn't Do It",
    blurb: "A sprawling estate, an eccentric detective, and everyone with a motive.",
    movieIds: [546554, 661374, 15196, 392044, 10528, 505026],
  },
  {
    slug: "suburban-dystopia",
    title: "White Picket Fences, Dark Secrets",
    blurb: "Manicured lawns, neighborhood barbecues, and sinister smiling neighbors.",
    movieIds: [37165, 419430, 162, 14, 793, 210577],
  },
  {
    slug: "boxing-redemption",
    title: "Down on the Canvas",
    blurb: "Sweat, heart, broken ribs, and one last shot at glory in the ring.",
    movieIds: [1366, 550, 312221, 59440, 1578, 70],
  },
  {
    slug: "journalism-truth",
    title: "Stop the Presses",
    blurb: "Typewriters clattering, confidential sources, and headline revelations.",
    movieIds: [891, 314365, 1949, 242582, 37799, 15],
  },
  {
    slug: "hallway-shootouts",
    title: "One Corridor, Zero Mercy",
    blurb: "Close-quarters combat, unbroken long takes, and infinite choreography.",
    movieIds: [245891, 603, 670, 155, 16869, 280],
  },
  {
    slug: "wild-west-standoff",
    title: "High Noon in the Sun",
    blurb: "Spurs jingling, tumbleweeds rolling, and fingers hovering over holsters.",
    movieIds: [68718, 6977, 429, 33, 273248, 44264],
  },
  {
    slug: "jazz-and-obsession",
    title: "Tempo, Blood & Brass",
    blurb: "Sheet music flying, sweat dripping, and the dangerous pursuit of perfection.",
    movieIds: [244786, 313369, 194662, 508442, 44214, 279],
  },
  {
    slug: "monsters-in-the-mist",
    title: "Colossal Footsteps Approaching",
    blurb: "Emergency sirens, crushed asphalt, and towering shadows behind the clouds.",
    movieIds: [329, 578, 68726, 7191, 124905, 348],
  },
  {
    slug: "creepy-dolls-puppets",
    title: "Toy Box Nightmares",
    blurb: "Porcelain smiles, glass eyes that follow you, and batteries definitely not included.",
    movieIds: [10585, 250546, 536554, 862, 927, 138843],
  },
  {
    slug: "high-stakes-gambling",
    title: "All In, Aces High",
    blurb: "Green felt, smokey backrooms, and everything riding on the river card.",
    movieIds: [36557, 161, 106646, 524, 8065, 473033],
  },
  {
    slug: "coming-of-age-roadtrip",
    title: "Windows Down, Future Ahead",
    blurb: "Gas station snacks, mixtapes on repeat, and standing on the edge of adulthood.",
    movieIds: [235, 8363, 9377, 9340, 2108, 773],
  },
  {
    slug: "surreal-dreamscapes",
    title: "Down the Rabbit Hole",
    blurb: "Melting clocks, talking animals, and corridors that lead directly into the sky.",
    movieIds: [630, 27205, 37165, 105, 545611, 129],
  },
  {
    slug: "sarcastic-crusaders",
    title: "Heroism With Heavy Sarcasm",
    blurb: "Tight spandex, fourth-wall breaks, and zero conversational filter.",
    movieIds: [293660, 118340, 284053, 1726, 324857, 24428],
  },
  {
    slug: "toxic-best-friends",
    title: "With Friends Like These",
    blurb: "Shared secrets, shared grudges, and bonds hanging by a very thin thread.",
    movieIds: [37799, 8363, 10625, 9603, 115, 550],
  },
  {
    slug: "post-apocalyptic-ruins",
    title: "After the Smoke Clears",
    blurb: "Rusting freeways, scarcity of fuel, and humanity starting over in the dust.",
    movieIds: [76341, 447332, 603, 280, 110415, 438631],
  },
  {
    slug: "artificial-hearts",
    title: "Do Machines Feel Love?",
    blurb: "Circuits humming, synthetic tears, and emotions programmed far too well.",
    movieIds: [603, 78, 280, 10681, 264660, 152601],
  },
  {
    slug: "high-school-social-warfare",
    title: "Cafeteria Caste Systems",
    blurb: "Locker combinations, hallway politics, and survival of the fittest.",
    movieIds: [10625, 9603, 8363, 9377, 2108, 64688, 1584],
  },
  {
    slug: "mountain-peak-peril",
    title: "Thin Air, Vertical Drops",
    blurb: "Rock, ice, glass, or a rooftop ledge: one slip, and the drop does the rest.",
    movieIds: [9350, 253412, 426, 44115, 447200, 985939],
  },
  {
    slug: "golden-age-giants",
    title: "The Golden Age of Hollywood",
    blurb: "Monochrome grandeur, sweeping orchestras, and timeless silhouettes.",
    movieIds: [289, 15, 630, 1585, 872, 15121, 389],
  },
  {
    slug: "haunted-hotels",
    title: "Check In, Never Check Out",
    blurb: "Long hallways, elevator chimes, and room keys that don't belong to you.",
    movieIds: [694, 539, 745, 419430, 4232, 9552],
  },
  {
    slug: "magic-and-illusions",
    title: "The Pledge, Turn & Prestige",
    blurb: "Smoke, mirrors, sleight of hand, and secrets worth dying to protect.",
    movieIds: [1124, 27205, 640, 37165, 161, 546554],
  },
  {
    slug: "espionage-in-the-cold",
    title: "Shadows Behind the Iron Curtain",
    blurb: "Dead drops, coded radio signals, and spies who trust no one.",
    movieIds: [1669, 341013, 68734, 582, 49517, 296098],
  },
  {
    slug: "diner-conversations",
    title: "Coffee Refills & Heavy Confessions",
    blurb: "Vinyl booths, neon jukeboxes, and life-altering diner chats.",
    movieIds: [680, 769, 275, 115, 278, 13],
  },
  {
    slug: "cinematic-masterpieces",
    title: "The Gold Standard",
    blurb: "Timeless frame compositions, iconic scores, and unforgettable final frames.",
    movieIds: [238, 278, 680, 13, 329, 597, 155, 27205],
  },
];

/** Lookup or generate a theme connection trivia game for any weekly marquee theme. */
export function getThemeConnectionGame(theme: {
  slug: string;
  title: string;
  blurb?: string;
  connectionGame?: ThemeConnectionGame;
}): ThemeConnectionGame {
  // Curated quizzes live in connection-games.ts, keyed by slug.
  const authored = CONNECTION_GAMES[theme.slug];
  if (authored) return authored;
  // Community proposals can carry their own game inline.
  if (theme.connectionGame) return theme.connectionGame;

  const blurb = theme.blurb || "A shared cinematic atmosphere and thematic DNA.";
  return {
    connection: `${theme.title}: ${blurb}`,
    options: [
      `Shared DNA: ${blurb}`,
      "All six films were directed by the same cinematic collective",
      "Each film premiered at the Cannes Film Festival",
      "Every protagonist shares the same astrological archetype",
    ],
    correctIndex: 0,
    triviaNote: `Curated under the "${theme.title}" motif for this week's MovieRanker Marquee.`,
  };
}
