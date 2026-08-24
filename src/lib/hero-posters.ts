/**
 * Curated premiere-night hero lineup (DESIGN.md "Imagery Rules").
 * Poster art © respective studios, served by TMDB (image.tmdb.org).
 * `tilt` is the resting rotation in degrees; hover straightens to 0.
 */
export interface HeroPoster {
  title: string;
  posterPath: string;
  tilt: number;
}

export const HERO_POSTERS: HeroPoster[] = [
  { title: "The Godfather", posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg", tilt: -8 },
  { title: "Pulp Fiction", posterPath: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg", tilt: -5.3 },
  { title: "Alien", posterPath: "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg", tilt: -2.7 },
  { title: "The Dark Knight", posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", tilt: 0 },
  { title: "The Matrix", posterPath: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg", tilt: 2.7 },
  { title: "Spirited Away", posterPath: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg", tilt: 5.3 },
  { title: "Inception", posterPath: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg", tilt: 8 },
];
