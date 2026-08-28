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
 */
export interface ThemeConnectionGame {
  /** The definitive explanation of the secret link */
  connection: string;
  /** 4 multiple choice options */
  options: string[];
  /** The 0-based index of the correct option */
  correctIndex: number;
  /** Educational/fun trivia note shown after answering */
  triviaNote?: string;
}

export interface ShortlistTheme {
  slug: string;
  title: string;
  blurb: string;
  movieIds: number[];
  connectionGame?: ThemeConnectionGame;
}

export const SHORTLIST_THEMES: ShortlistTheme[] = [
  {
    slug: "secretly-same-story",
    title: "Secretly The Same Story",
    blurb: "A farm boy, a hacker, a wizard, and a boxer walk into a monomyth.",
    movieIds: [11, 603, 671, 1362, 150540, 324857],
    connectionGame: {
      connection: "The Hero's Journey (Monomyth): Across disparate genres (sci-fi, fantasy, sports, cyberpunk), each film adheres to Joseph Campbell's 12-stage mythic arc step-for-step.",
      options: [
        "Every film follows Joseph Campbell's 12-stage Hero's Journey monomyth beat-for-beat",
        "All six scripts were written by the same screenwriting collective under pseudonyms",
        "Each film features a protagonist who loses their mentor in the exact 45th minute",
        "All six were originally conceived as animated short films",
      ],
      correctIndex: 0,
      triviaNote: "George Lucas famously credited Campbell's 'The Hero with a Thousand Faces' as his direct architectural guide, a template later mirrored in The Matrix, Harry Potter, and Rocky.",
    },
  },
  {
    slug: "best-hairpieces",
    title: "Best Hairpieces & Prosthetics",
    blurb: "Somewhere under three pounds of latex is a very committed A-lister.",
    movieIds: [854, 888, 12217, 12109, 8904, 453711, 118340],
    connectionGame: {
      connection: "Transformative Practical FX: Every film features an iconic, unrecognizable A-list lead actor buried under groundbreaking prosthetic makeup or elaborate wigs.",
      options: [
        "Every lead actor is buried under hours of transformative prosthetic makeup or hairpieces",
        "All six won the BAFTA for Best Original Screenplay",
        "Each film was shot entirely chronologically to preserve actor stamina",
        "The directors all cameoed as background extras in heavy wigs",
      ],
      correctIndex: 0,
      triviaNote: "From Gary Oldman's Churchill to Robin Williams' Mrs. Doubtfire, practical makeup transformations have created some of cinema's most indelible character illusions.",
    },
  },
  {
    slug: "one-location",
    title: "One Room, No Exit",
    blurb: "Nobody leaves until the credits roll. Maximum tension on a single soundstage budget.",
    movieIds: [389, 567, 2108, 15196, 694, 264660],
    connectionGame: {
      connection: "Single-Location / Bottle Movies: The entire narrative takes place within the confines of a single room or isolated chamber with zero scene changes.",
      options: [
        "The entire story takes place within a single room or isolated interior location",
        "All six were adapted from one-act off-Broadway plays",
        "Each film was shot entirely in real time in a single continuous camera take",
        "Every character in these films is known only by a profession or number",
      ],
      correctIndex: 0,
      triviaNote: "12 Angry Men, Rope, and The Breakfast Club prove that cinematic tension thrives under physical constraints—turning a single room into an intense psychological pressure cooker.",
    },
  },
  {
    slug: "dads-having-a-bad-one",
    title: "Dads Having A Rough One",
    blurb: "Father's Day is once a year. These dads get two hours of sheer chaos.",
    movieIds: [12, 157336, 238, 8587, 68718, 8358],
    connectionGame: {
      connection: "Desperate Fatherhood Under Siege: Each film centers on a father pushed to extraordinary, chaotic lengths across space, time, or the mob to protect or rescue his child.",
      options: [
        "Every film centers on a desperate father fighting impossible odds to protect or rescue his child",
        "All six films premiered on Father's Day weekend at the box office",
        "Each director dedicated the movie in the end credits to their own father",
        "None of the protagonists ever speak to their children on-screen",
      ],
      correctIndex: 0,
      triviaNote: "From Interstellar's relativistic tears to Finding Nemo's oceanic odyssey, paternal desperation is one of cinema's most potent emotional engines.",
    },
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
    movieIds: [415, 314, 8645, 17473, 664, 927],
  },
  {
    slug: "trains-youd-rather-not-miss",
    title: "Trains With Zero Chill",
    blurb: "High-speed locomotives where absolutely nothing goes according to schedule.",
    movieIds: [1637, 396535, 610150, 110415, 392044, 954],
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
    movieIds: [1422, 769, 640, 10398, 757, 16869],
  },
  {
    slug: "high-seas-peril",
    title: "Miles of Ocean, No Rescue",
    blurb: "Endless water, rogue waves, and questionable seamanship.",
    movieIds: [578, 597, 22, 8358, 87827, 8688],
  },
  {
    slug: "courtroom-fire",
    title: "Objection Sustained",
    blurb: "Twelve jurors, one witness, and the dramatic monologue of a lifetime.",
    movieIds: [389, 881, 595, 10377, 8835, 278],
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
    movieIds: [2062, 593643, 212778, 24803, 392, 680],
  },
  {
    slug: "space-silence",
    title: "In Orbit, No One Hears You",
    blurb: "Zero gravity, failing oxygen, and millions of miles to the nearest planet.",
    movieIds: [62, 157336, 124905, 348, 286217, 568],
  },
  {
    slug: "unhinged-holidays",
    title: "Peace on Earth, Pure Mayhem",
    blurb: "Family reunions, runaway snowmobiles, and holiday chaos.",
    movieIds: [562, 771, 10719, 5825, 927, 1585],
  },
  {
    slug: "frozen-wastelands",
    title: "Sub-Zero Survival",
    blurb: "Blizzards, frostbite, and temperatures where the truth freezes over.",
    movieIds: [275, 694, 281957, 110415, 1091, 157336],
  },
  {
    slug: "summer-gone-wrong",
    title: "Sunny Days, Dark Turns",
    blurb: "Campfires, boardwalks, and a vacation nobody will ever forget.",
    movieIds: [578, 9340, 235, 447332, 480530, 530385],
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
    movieIds: [546554, 661374, 15196, 392044, 745, 1124],
  },
  {
    slug: "suburban-dystopia",
    title: "White Picket Fences, Dark Secrets",
    blurb: "Manicured lawns, neighborhood barbecues, and sinister smiling neighbors.",
    movieIds: [37165, 419430, 162, 2108, 771, 9377],
  },
  {
    slug: "boxing-redemption",
    title: "Down on the Canvas",
    blurb: "Sweat, heart, broken ribs, and one last shot at glory in the ring.",
    movieIds: [1362, 550, 312221, 59440, 769, 45317],
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
    movieIds: [245891, 603, 278, 155, 16869, 280],
  },
  {
    slug: "wild-west-standoff",
    title: "High Noon in the Sun",
    blurb: "Spurs jingling, tumbleweeds rolling, and fingers hovering over holsters.",
    movieIds: [68718, 6977, 429, 33, 11969, 44264],
  },
  {
    slug: "jazz-and-obsession",
    title: "Tempo, Blood & Brass",
    blurb: "Sheet music flying, sweat dripping, and the dangerous pursuit of perfection.",
    movieIds: [244786, 313369, 872, 508442, 15121, 1584],
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
    movieIds: [10585, 250574, 536554, 862, 927, 4232],
  },
  {
    slug: "high-stakes-gambling",
    title: "All In, Aces High",
    blurb: "Green felt, smokey backrooms, and everything riding on the river card.",
    movieIds: [36557, 161, 106646, 524, 10229, 473033],
  },
  {
    slug: "transit-at-30000-feet",
    title: "Turbulence & Terror",
    blurb: "Cruising altitude, locked cockpit doors, and nowhere to step outside.",
    movieIds: [1637, 9772, 568, 954, 361743, 610150],
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
    movieIds: [10625, 9603, 8363, 9377, 2108, 8835, 1584],
  },
  {
    slug: "mountain-peak-peril",
    title: "Thin Air, Vertical Drops",
    blurb: "Crampons slipping, freezing fog, and cliffs with zero safety nets.",
    movieIds: [197, 857, 98, 872585, 157336, 76341],
    connectionGame: {
      connection: "Vertical Peril & Lethal Heights: Every film features a defining sequence where characters are suspended in extreme high-altitude vertigo with zero safety nets.",
      options: [
        "Every film features a pulse-pounding cliff or high-altitude vertical drop sequence",
        "All six films were directed by former professional mountaineers",
        "Each movie won the Academy Award for Best Visual Effects",
        "None of these films used green screens or CGI for stunt sequences",
      ],
      correctIndex: 0,
      triviaNote: "From high-altitude Himalayan ascents to dizzying vertical canyons, extreme height and gravity have produced cinema's most visceral suspense sequences.",
    },
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
    movieIds: [954, 353081, 36557, 16869, 872585, 857],
  },
  {
    slug: "midnight-drive",
    title: "Empty Highways, Glowing Dashboards",
    blurb: "Synths on the stereo, streetlights passing by, and nighttime contemplation.",
    movieIds: [64690, 339403, 11324, 807, 76341, 155],
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
  const curated = SHORTLIST_THEMES.find((t) => t.slug === theme.slug);
  if (curated?.connectionGame) return curated.connectionGame;
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
