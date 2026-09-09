export interface SiteUpdate {
  id: string;
  date: string;
  version?: string;
  title: string;
  tag: "Feature" | "Improvement" | "Announcement" | "Milestone";
  summary: string;
  highlights?: string[];
}

export const SITE_UPDATES: SiteUpdate[] = [
  {
    id: "public-beta",
    date: "September 2026",
    version: "Beta",
    tag: "Announcement",
    title: "MovieRanker Enters Public Beta",
    summary:
      "We are officially in public beta! Complete the new Beta Pioneer Challenge to claim an exclusive Beta Canister.",
    highlights: [
      "Beta Pioneer Walkthrough: Complete 3 quick steps to unlock the exclusive Beta Reel Avatar, Cassette Frame, and 'Betamax was better' Tagline.",
      "Curator Roulette: Spin the reel for curated micro-packs like 90s Cyberpunk, A24 Gems, and Noir Classics.",
      "Community Spotlight: Share your finished custom rankings with fellow film lovers.",
      "Enhanced Cinema Lighting: 'Dim Lights' theater mode now delivers a full-blackout auditorium experience.",
      "In-App Feedback: Send bugs and ideas directly to the team with our new feedback dialog.",
    ],
  },
  {
    id: "initial-launch",
    date: "August 2026",
    version: "v1.0",
    tag: "Milestone",
    title: "MovieRanker Initial Launch",
    summary:
      "We aim to be the most fun, low-stress way to rank movies and settle film debates with your friends.",
    highlights: [
      "Head-to-head choices: Simple A vs. B matchups so you can rank movies without list fatigue.",
      "This Week's Marquee: Hand-picked themed shortlists ready to play in under 5 minutes.",
      "Co-ranking & friend invites: Settle movie night debates together, credit participants, and invite friends.",
      "Taste comparison: Put two lists side-by-side to see agreement score and your biggest film debates.",
      "Achievements & progression: Earn XP and unlock milestones as you complete rankings.",
      "No sign-up required to play: Start ranking immediately, and only save an account when you want to keep your lists.",
    ],
  },
];
