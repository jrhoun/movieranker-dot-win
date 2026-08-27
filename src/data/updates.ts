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
    id: "referrals-and-auth",
    date: "August 27, 2026",
    version: "v1.4",
    tag: "Feature",
    title: "Friend Invites, Smoother Sign-In & Profile Updates",
    summary:
      "We're experimenting with ways to make inviting friends easier and rewarding when you rank movies together. We also smoothed out sign-in so you don't get bounced around.",
    highlights: [
      "Friend invite links: You can now share a link from your profile. When a friend joins and completes their first ranking list, you earn bonus XP.",
      "List share attribution: When you share a finished list with friends, your invite link is attached so spectators can easily jump in.",
      "Clearer sign-up: Separated sign-in and account creation tabs so it's clearer for new visitors, plus basic password reset.",
      "Polite login redirect: Signing in now brings you right back to the page you were on instead of redirecting away.",
    ],
  },
  {
    id: "career-progression-showcase",
    date: "August 26, 2026",
    version: "v1.3",
    tag: "Feature",
    title: "Career Levels, Achievements & Theme Suggestions",
    summary:
      "Adding a little lighthearted progression and achievements to celebrate your movie rankings, plus a way to suggest future themes.",
    highlights: [
      "Ranks & XP: Earn a bit of XP with each ranking you complete, slowly unlocking ranks from Film Novice upwards.",
      "Achievements: A few fun badges to celebrate milestones like completing your first ranking or co-ranking with friends.",
      "Theme suggestions: If you have an idea for a fun movie pack, curators can suggest weekly marquee themes for us to review.",
      "Profile links: A simple public profile page to show your lists and favorite achievements if you choose to make them public.",
    ],
  },
  {
    id: "marquee-and-compare",
    date: "August 25, 2026",
    version: "v1.2",
    tag: "Feature",
    title: "This Week's Marquee, Co-Ranking & List Comparison",
    summary:
      "Introducing pre-picked themed shortlists for quick movie nights, co-curator tags, and a tool to compare rankings side-by-side.",
    highlights: [
      "This Week's Marquee: Hand-picked starter themes if you don't feel like searching for 8 movies from scratch.",
      "Participant tags: Credit friends who helped make picks during movie night.",
      "Taste comparison: A simple tool to put two lists side-by-side and see where your movie tastes align (or differ).",
      "List visibility: Set any finished list to Public, Unlisted, or Private.",
    ],
  },
  {
    id: "initial-launch",
    date: "August 23, 2026",
    version: "v1.0",
    tag: "Milestone",
    title: "MovieRanker.win Initial Launch",
    summary:
      "We aim to be the most fun, low-stress way to rank movies and settle film debates with your friends.",
    highlights: [
      "Head-to-head choices: Simple A vs. B matchups to avoid list-building fatigue.",
      "TMDB search: Quickly look up movies and pull in posters and release years.",
      "No mandatory sign-up to play: Pick films and rank immediately, and only save an account if you want to keep your lists.",
      "Clean cinema theme: A lightweight dark theme designed to be easy on the eyes during movie night.",
    ],
  },
];
