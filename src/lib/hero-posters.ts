import type { TmdbMovieCredit } from "@/lib/tmdb";

/**
 * Curated premiere-night hero lineup (DESIGN.md "Imagery Rules").
 * Poster art © respective studios, served by TMDB (image.tmdb.org).
 * `tilt` is the resting rotation in degrees; hover straightens to 0.
 */
export interface HeroPoster {
  tmdbId: number;
  title: string;
  releaseYear: number;
  posterPath: string;
  tilt: number;
}

export const HERO_POSTERS: HeroPoster[] = [
  { tmdbId: 238, title: "The Godfather", releaseYear: 1972, posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", tilt: -8 },
  { tmdbId: 680, title: "Pulp Fiction", releaseYear: 1994, posterPath: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg", tilt: -5.3 },
  { tmdbId: 348, title: "Alien", releaseYear: 1979, posterPath: "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg", tilt: -2.7 },
  { tmdbId: 155, title: "The Dark Knight", releaseYear: 2008, posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", tilt: 0 },
  { tmdbId: 603, title: "The Matrix", releaseYear: 1999, posterPath: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg", tilt: 2.7 },
  { tmdbId: 129, title: "Spirited Away", releaseYear: 2001, posterPath: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", tilt: 5.3 },
  { tmdbId: 27205, title: "Inception", releaseYear: 2010, posterPath: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg", tilt: 8 },
  { tmdbId: 550, title: "Fight Club", releaseYear: 1999, posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg", tilt: 0 },
  { tmdbId: 120, title: "The Lord of the Rings: The Fellowship of the Ring", releaseYear: 2001, posterPath: "/6oom5QYQ2yQTMJIbnJbk1LtrRUa.jpg", tilt: 0 },
  { tmdbId: 496243, title: "Parasite", releaseYear: 2019, posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg", tilt: 0 },
  { tmdbId: 244786, title: "Whiplash", releaseYear: 2014, posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg", tilt: 0 },
  { tmdbId: 157336, title: "Interstellar", releaseYear: 2014, posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg", tilt: 0 },
];

/** First eight carry the tilted hero fan; the full lineup fills the home filmstrip. */
export const FAN_POSTERS = HERO_POSTERS.slice(0, 8);

/** Same shape search results use, so hero posters drop straight into the tray. */
export const HERO_CANDIDATES: TmdbMovieCredit[] = HERO_POSTERS.map((p) => ({
  tmdbId: p.tmdbId,
  title: p.title,
  posterPath: p.posterPath,
  releaseYear: p.releaseYear,
}));
