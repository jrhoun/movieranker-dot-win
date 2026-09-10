export interface SiteUpdate {
  id: string;
  date: string;
  version?: string;
  title: string;
  tag: "Feature" | "Improvement" | "Announcement" | "Milestone";
  summary: string;
  content?: string[];
  highlights?: string[];
}

export const SITE_UPDATES: SiteUpdate[] = [
  {
    id: "public-beta",
    date: "September 2026",
    version: "Beta",
    tag: "Announcement",
    title: "Welcome to the MovieRanker Public Beta!",
    summary:
      "MovieRanker is officially entering Public Beta! Here is a note from JR on why the site was built, how to unlock three beta-only profile cosmetics, and what is next.",
    content: [
      "Hi everyone — My name is JR and I created Movieranker.win because I love movies and the debates I have with friends about them: “If you had to pick your top 10 Tom Cruise movies, what's number one?”, “What's your list for the best live action comic book movie?”, and on and on it goes. Movieranker exists to make ranking those lists fun, simple, and easy to share.",
      "The site is officially in Public Beta now. Please kick the tires, make some lists, share them with friends, and give me feedback about how the experience can be improved.",
      "There are bonuses for early testers. Complete the 3-step Beta Test Screening (create an account, claim a handle, and finish one public ranking) to unlock three beta-only profile cosmetics: the Beta Reel avatar, cassette frame, and “Betamax was better” tagline.",
      "Every Monday brings a new curated Marquee shortlist around a hidden theme. Check back weekly for fresh matchups, community consensus stats, connection puzzles, and head-to-head friend comparisons. Thank you for testing!",
    ],
    highlights: [
      "Beta Test Screening: Complete 3 quick steps to unlock three beta-only profile cosmetics: the Beta Reel Avatar, Cassette Frame, and 'Betamax was better' Tagline.",
      "Curated Weekly Themes: Every Monday brings a new themed Marquee with hidden connections and bonus XP for completed rankings.",
      "Community Stats & Taste Compare: See how fellow film lovers ranked the weekly list and compare podiums side-by-side with friends.",
      "Custom List Builder: Search the full TMDB catalogue to build, rank, and share custom shortlists.",
      "In-App Feedback: Have an idea or bug report? Click the floating feedback button in the bottom corner anytime to reach me directly.",
    ],
  },
  {
    id: "initial-launch",
    date: "August 2026",
    version: "v0.1",
    tag: "Milestone",
    title: "MovieRanker Initial Preview",
    summary:
      "The initial preview launch of MovieRanker — the most fun, low-stress way to rank movies and settle film debates with your friends.",
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
