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
];

/** Same shape search results use, so hero posters drop straight into the tray. */
export const HERO_CANDIDATES: TmdbMovieCredit[] = HERO_POSTERS.map((p) => ({
  tmdbId: p.tmdbId,
  title: p.title,
  posterPath: p.posterPath,
  releaseYear: p.releaseYear,
}));
