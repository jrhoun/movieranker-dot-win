/**
 * Curated themes for "Tonight's Shortlist" — code data, not DB rows.
 * The connection to the theme is allowed (encouraged) to be obtuse.
 * movieIds are TMDB ids; posters are fetched via tmdb.getMovieById.
 */
export interface ShortlistTheme {
  slug: string;
  title: string;
  blurb: string;
  movieIds: number[];
}

export const SHORTLIST_THEMES: ShortlistTheme[] = [
  {
    slug: "secretly-same-story",
    title: "Movies That Are Secretly The Same Story",
    blurb: "A farm boy, a hacker, a wizard, and a boxer walk into a monomyth.",
    movieIds: [11, 603, 671, 1362, 150540, 324857],
  },
  {
    slug: "best-hairpieces",
    title: "Best Hairpieces & Prosthetics",
    blurb: "Somewhere under all that latex is a very committed actor.",
    movieIds: [406, 84, 12217, 12109, 8904, 453711, 786992],
  },
  {
    slug: "one-location",
    title: "One Location, Whole Movie",
    blurb: "No one leaves. Not because they can't. Because the budget said no. (And because it rules.)",
    movieIds: [549, 389, 1422, 264660, 15465, 49047],
  },
  {
    slug: "dads-having-a-bad-one",
    title: "Dads Having A Bad One",
    blurb: "Father's Day is once a year. These dads get a whole runtime of it.",
    movieIds: [12, 68718, 157336, 238, 8587, 13003],
  },
  {
    slug: "rain-soaked-cinema",
    title: "Rain Soaked Cinema",
    blurb: "Umbrellas are for cowards. Cinema is for the drenched.",
    movieIds: [15801, 807, 335984, 559, 278, 4348],
  },
  {
    slug: "crimes-gone-stupid",
    title: "Crimes Gone Stupid",
    blurb: "The plan was perfect. The plan involved woodchippers.",
    movieIds: [275, 115, 1424, 15121, 10764, 10530],
  },
  {
    slug: "so-bad-theyre-great",
    title: "Longest Two Hours Of Your Life (So Bad They're Great)",
    blurb: "You will not look away. You will not be able to explain why.",
    movieIds: [205591, 936, 1091, 17654, 873, 13942],
  },
  {
    slug: "trains-youd-rather-not-miss",
    title: "Trains You'd Rather Not Miss",
    blurb: "All aboard for class warfare, zombies, and one very long day.",
    movieIds: [266, 396535, 39994, 44214, 4642, 7550],
  },
  {
    slug: "sequels-that-beat-the-original",
    title: "Sequels That Beat The Original",
    blurb: "The first one made the money. This one made history.",
    movieIds: [240, 679, 280, 155, 1891, 862],
  },
  {
    slug: "everyone-is-lying",
    title: "Everyone Is Lying",
    blurb: "Trust no one, especially the narrator. Especially the nice ones.",
    movieIds: [546554, 210577, 629, 207, 1124, 496243],
  },
  {
    slug: "deserts-dust-bad-decisions",
    title: "Deserts, Dust & Bad Decisions",
    blurb: "Hydration is optional. Regret is not.",
    movieIds: [76341, 438631, 954, 273481, 11324, 11],
  },
  {
    slug: "that-house-was-a-mistake",
    title: "That House Was A Mistake",
    blurb: "Great schools. Charming porch. Unspeakable entity in the walls.",
    movieIds: [138843, 14836, 11028, 11978, 419430, 771],
  },
];
