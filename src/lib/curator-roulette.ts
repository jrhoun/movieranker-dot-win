import type { RankedMovie } from "./ranking";
import { saveSession, type PlaySession } from "./session";

export interface MicroPackMovieDetail {
  tmdbId: number;
  title: string;
  posterPath?: string | null;
  releaseYear?: number | null;
  tagline?: string | null;
}

export interface CuratorMicroPack {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  blurb: string;
  genre: string;
  badge: string;
  accentColor: string;
  movieIds: number[];
  sampleTitles: string[];
  movies: MicroPackMovieDetail[];
}

export const CURATOR_MICRO_PACKS: CuratorMicroPack[] = [
  {
    id: "cyberpunk-90s",
    slug: "cyberpunk-90s",
    title: "90s Cyberpunk",
    subtitle: "High Tech, Low Life",
    blurb:
      "Green phosphor rain, cybernetic dread, and dystopian megacorporations from cinema's peak analog-to-digital transition era.",
    genre: "Cyberpunk Sci-Fi",
    badge: "💾 Cyberpunk",
    accentColor: "#00f0ff",
    movieIds: [603, 9323, 2666, 861, 281, 9886],
    sampleTitles: [
      "The Matrix",
      "Ghost in the Shell",
      "Dark City",
      "Total Recall",
      "Strange Days",
    ],
    movies: [
      {
        tmdbId: 603,
        title: "The Matrix",
        releaseYear: 1999,
        posterPath: "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg",
        tagline: "Believe the unbelievable.",
      },
      {
        tmdbId: 9323,
        title: "Ghost in the Shell",
        releaseYear: 1995,
        posterPath: "/9gC88zYUBARRSThcG93MvW14sqx.jpg",
        tagline: "It found a voice... now it needs a body.",
      },
      {
        tmdbId: 2666,
        title: "Dark City",
        releaseYear: 1998,
        posterPath: "/tNPEGju4DpTdbhBphNmZoEi9Bd3.jpg",
        tagline: "They built the city to see what makes us tick.",
      },
      {
        tmdbId: 861,
        title: "Total Recall",
        releaseYear: 1990,
        posterPath: "/wVbeL6fkbTKSmNfalj4VoAUUqJv.jpg",
        tagline: "Get ready for the ride of your life.",
      },
      {
        tmdbId: 281,
        title: "Strange Days",
        releaseYear: 1995,
        posterPath: "/rY5BrDRcYAKE0BYmmT66YG6Uy5Q.jpg",
        tagline: "You know you want it.",
      },
      {
        tmdbId: 9886,
        title: "Johnny Mnemonic",
        releaseYear: 1995,
        posterPath: "/iH8Jgi8qvb7pnBfI8fVGaUbyRna.jpg",
        tagline: "The future's most wanted fugitive.",
      },
    ],
  },
  {
    id: "a24-gems",
    slug: "a24-gems",
    title: "A24 Modern Gems",
    subtitle: "Indie Cinema Elevated",
    blurb:
      "Uncompromising auteur visions, psychological terrors, and emotional powerhouses that defined modern independent cinema.",
    genre: "Indie / Auteur",
    badge: "💎 A24",
    accentColor: "#f5c518",
    movieIds: [545611, 493922, 503919, 473033, 666277, 376867],
    sampleTitles: [
      "Everything Everywhere All at Once",
      "Hereditary",
      "The Lighthouse",
      "Uncut Gems",
      "Past Lives",
    ],
    movies: [
      {
        tmdbId: 545611,
        title: "Everything Everywhere All at Once",
        releaseYear: 2022,
        posterPath: "/u68AjlvlutfEIcpmbYpKcdi09ut.jpg",
        tagline: "The universe is so much bigger than you realize.",
      },
      {
        tmdbId: 493922,
        title: "Hereditary",
        releaseYear: 2018,
        posterPath: "/4GFPuL14eXi66V96xBWY73Y9PfR.jpg",
        tagline: "Every family tree hides a secret.",
      },
      {
        tmdbId: 503919,
        title: "The Lighthouse",
        releaseYear: 2019,
        posterPath: "/yAKNmpcUweGH6WMCEWenwU9PsbE.jpg",
        tagline: "There is enchantment in the light.",
      },
      {
        tmdbId: 473033,
        title: "Uncut Gems",
        releaseYear: 2019,
        posterPath: "/6XN1vxHc7kUSqNWtaQKN45J5x2v.jpg",
        tagline: "This is how I win.",
      },
      {
        tmdbId: 666277,
        title: "Past Lives",
        releaseYear: 2023,
        posterPath: "/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg",
        tagline: "In-Yun: an entanglement of fates.",
      },
      {
        tmdbId: 376867,
        title: "Moonlight",
        releaseYear: 2016,
        posterPath: "/qLnfEmPrDjJfPyyddLJPkXmshkp.jpg",
        tagline: "This is the story of a lifetime.",
      },
    ],
  },
  {
    id: "noir-classics",
    slug: "noir-classics",
    title: "Film Noir Legends",
    subtitle: "Shadows, Cigarettes & Cynicism",
    blurb:
      "Hard-boiled gumshoes, lethal femme fatales, venetian blind shadows, and corrupt alleyways of classic noir.",
    genre: "Crime Noir",
    badge: "🕵️ Noir",
    accentColor: "#e5a93c",
    movieIds: [963, 996, 599, 1092, 1480, 910],
    sampleTitles: [
      "The Maltese Falcon",
      "Double Indemnity",
      "Sunset Boulevard",
      "The Third Man",
      "Touch of Evil",
    ],
    movies: [
      {
        tmdbId: 963,
        title: "The Maltese Falcon",
        releaseYear: 1941,
        posterPath: "/bf4o6Uzw5wqLjdKwRuiDrN1xyvl.jpg",
        tagline: "He's a Killer When He Hates!",
      },
      {
        tmdbId: 996,
        title: "Double Indemnity",
        releaseYear: 1944,
        posterPath: "/rVNYZZgfhwqVMMWlBmxOfWqnwCj.jpg",
        tagline: "It's love and murder at first sight!",
      },
      {
        tmdbId: 599,
        title: "Sunset Boulevard",
        releaseYear: 1950,
        posterPath: "/zt8aQ6ksqK6p1AopC5zVTDS9pKT.jpg",
        tagline: "A Hollywood Story: Sensational...Daring...Unforgettable.",
      },
      {
        tmdbId: 1092,
        title: "The Third Man",
        releaseYear: 1949,
        posterPath: "/vqnFHTx1phgTAsLfxZoejSbMVHA.jpg",
        tagline: "Hunted by men ... Sought by WOMEN!",
      },
      {
        tmdbId: 1480,
        title: "Touch of Evil",
        releaseYear: 1958,
        posterPath: "/1pvRgmfBaoMczIJBOi9gCOZ4FMC.jpg",
        tagline: "The strangest vengeance ever planned!",
      },
      {
        tmdbId: 910,
        title: "The Big Sleep",
        releaseYear: 1946,
        posterPath: "/lraHo9D8c0YWfxsKqT5P5sVqMKN.jpg",
        tagline: "The picture they were born for!",
      },
    ],
  },
  {
    id: "oscar-snubs",
    slug: "oscar-snubs",
    title: "Greatest Oscar Snubs",
    subtitle: "Masterpieces Denied Best Picture",
    blurb:
      "Timeless cinematic titans that lost the Best Picture statuette to forgotten trivia, yet conquered movie history forever.",
    genre: "Prestige Drama",
    badge: "🏆 Oscar Snub",
    accentColor: "#ffd700",
    movieIds: [278, 680, 103, 769, 275, 15],
    sampleTitles: [
      "The Shawshank Redemption",
      "Pulp Fiction",
      "Taxi Driver",
      "Goodfellas",
      "Fargo",
    ],
    movies: [
      {
        tmdbId: 278,
        title: "The Shawshank Redemption",
        releaseYear: 1994,
        posterPath: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
        tagline: "Fear can hold you prisoner. Hope can set you free.",
      },
      {
        tmdbId: 680,
        title: "Pulp Fiction",
        releaseYear: 1994,
        posterPath: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
        tagline: "You won’t know the facts until you’ve seen the fiction.",
      },
      {
        tmdbId: 103,
        title: "Taxi Driver",
        releaseYear: 1976,
        posterPath: "/ekstpH614fwDX8DUln1a2Opz0N8.jpg",
        tagline: "On every street in every city in this country...",
      },
      {
        tmdbId: 769,
        title: "Goodfellas",
        releaseYear: 1990,
        posterPath: "/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg",
        tagline: "Three decades of life in the mafia.",
      },
      {
        tmdbId: 275,
        title: "Fargo",
        releaseYear: 1996,
        posterPath: "/rt7cpEr1uP6RTZykBFhBTcRaKvG.jpg",
        tagline: "A lot can happen in the middle of nowhere.",
      },
      {
        tmdbId: 15,
        title: "Citizen Kane",
        releaseYear: 1941,
        posterPath: "/sav0jxhqiH0bPr2vZFU0Kjt2nZL.jpg",
        tagline: "Some called him a hero...others called him a heel.",
      },
    ],
  },
  {
    id: "studio-ghibli",
    slug: "studio-ghibli",
    title: "Studio Ghibli Magic",
    subtitle: "Hand-Drawn Wonder",
    blurb:
      "Hayao Miyazaki and Isao Takahata's breathtaking hand-painted masterworks of environmental majesty, spirit realms, and soaring dreams.",
    genre: "Animation / Fantasy",
    badge: "🍃 Ghibli",
    accentColor: "#48bb78",
    movieIds: [129, 128, 8392, 4935, 16859, 12477],
    sampleTitles: [
      "Spirited Away",
      "Princess Mononoke",
      "My Neighbor Totoro",
      "Howl's Moving Castle",
      "Kiki's Delivery Service",
    ],
    movies: [
      {
        tmdbId: 129,
        title: "Spirited Away",
        releaseYear: 2001,
        posterPath: "/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg",
        tagline: "Beyond the tunnel was a mysterious town.",
      },
      {
        tmdbId: 128,
        title: "Princess Mononoke",
        releaseYear: 1997,
        posterPath: "/cMYCDADoLKLbB83g4WnJegaZimC.jpg",
        tagline: "The fate of the world rests on the courage of one warrior.",
      },
      {
        tmdbId: 8392,
        title: "My Neighbor Totoro",
        releaseYear: 1988,
        posterPath: "/rtGDOeG9LzoerkDGZF9dnVeLppL.jpg",
        tagline: "He's your friendly neighbourhood forest spirit!",
      },
      {
        tmdbId: 4935,
        title: "Howl's Moving Castle",
        releaseYear: 2004,
        posterPath: "/13kOl2v0nD2OLbVSHnHk8GUFEhO.jpg",
        tagline: "Love Comes First.",
      },
      {
        tmdbId: 16859,
        title: "Kiki's Delivery Service",
        releaseYear: 1989,
        posterPath: "/Aufa4YdZIv4AXpR9rznwVA5SEfd.jpg",
        tagline: "I was feeling blue, but I'm better now.",
      },
      {
        tmdbId: 12477,
        title: "Grave of the Fireflies",
        releaseYear: 1988,
        posterPath: "/k9tv1rXZbOhH7eiCk378x61kNQ1.jpg",
        tagline: "Why do fireflies have to die so soon?",
      },
    ],
  },
  {
    id: "paranoia-70s",
    slug: "paranoia-70s",
    title: "70s Paranoia & Spies",
    subtitle: "Trust No One",
    blurb:
      "Shadowy conspiracies, wiretapped conversations, and institutional corruption from cinema's greatest decade of political suspense.",
    genre: "Political Thriller",
    badge: "📻 70s Paranoia",
    accentColor: "#ed8936",
    movieIds: [592, 891, 11963, 10774, 10518, 829],
    sampleTitles: [
      "The Conversation",
      "All the President's Men",
      "Three Days of the Condor",
      "Network",
      "Chinatown",
    ],
    movies: [
      {
        tmdbId: 592,
        title: "The Conversation",
        releaseYear: 1974,
        posterPath: "/dHqVBwcv1SGymOpUueRoKzcmdes.jpg",
        tagline: "Harry Caul is an invader of privacy.",
      },
      {
        tmdbId: 891,
        title: "All the President's Men",
        releaseYear: 1976,
        posterPath: "/pCe6lfLxt1B58zPD4lgQrlnDS2j.jpg",
        tagline: "The most devastating detective story of this century.",
      },
      {
        tmdbId: 11963,
        title: "Three Days of the Condor",
        releaseYear: 1975,
        posterPath: "/zinwtZqdb7gnc4zMu8dfkK1fMN3.jpg",
        tagline: "His CIA code name is Condor.",
      },
      {
        tmdbId: 10774,
        title: "Network",
        releaseYear: 1976,
        posterPath: "/qZomlHsaALUtkFeMDwdYmwS2Pbo.jpg",
        tagline: "Television will never be the same.",
      },
      {
        tmdbId: 10518,
        title: "Marathon Man",
        releaseYear: 1976,
        posterPath: "/uPNgubSiri2yvBQRPtP77ViYjN.jpg",
        tagline: "Is it safe?",
      },
      {
        tmdbId: 829,
        title: "Chinatown",
        releaseYear: 1974,
        posterPath: "/kZRSP3FmOcq0xnBulqpUQngJUXY.jpg",
        tagline: "You get tough. You get tender.",
      },
    ],
  },
];

/**
 * Returns a random micro-pack from the catalog, optionally excluding the current selection.
 */
export function getRandomMicroPack(excludeSlug?: string): CuratorMicroPack {
  const pool = excludeSlug
    ? CURATOR_MICRO_PACKS.filter((p) => p.slug !== excludeSlug)
    : CURATOR_MICRO_PACKS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? CURATOR_MICRO_PACKS[0];
}

/**
 * Look up a micro-pack by slug or id.
 */
export function getMicroPackBySlug(slug: string): CuratorMicroPack | undefined {
  return CURATOR_MICRO_PACKS.find((p) => p.slug === slug || p.id === slug);
}

/**
 * Initializes and saves a PlaySession seeded with the micro-pack movies.
 */
export function launchMicroPackSession(
  slugOrPack: string | CuratorMicroPack,
  movieDetails?: MicroPackMovieDetail[],
): PlaySession {
  const pack =
    typeof slugOrPack === "string"
      ? getMicroPackBySlug(slugOrPack) ?? CURATOR_MICRO_PACKS[0]
      : slugOrPack;

  const sourceMovies =
    movieDetails && movieDetails.length > 0
      ? movieDetails
      : pack.movies && pack.movies.length > 0
        ? pack.movies
        : pack.movieIds.map((id, i) => ({
            tmdbId: id,
            title: pack.sampleTitles[i] ?? `Movie ${id}`,
            posterPath: null,
            releaseYear: null,
            tagline: null,
          }));

  const movies: RankedMovie[] = sourceMovies.map((m) => ({
    tmdbId: m.tmdbId,
    title: m.title,
    posterPath: m.posterPath ?? null,
    releaseYear: m.releaseYear ?? null,
    tagline: m.tagline ?? null,
    elo: 1000,
    comparisons: 0,
    parked: false,
  }));

  const session: PlaySession = {
    title: pack.title,
    participants: [],
    movies,
    votesSinceOrderChange: 0,
    nudgeShown: false,
    themeSlug: pack.slug,
    curated: true,
  };

  saveSession(session);
  return session;
}
