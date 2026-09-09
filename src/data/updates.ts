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
      "Hi everyone — JR Houn here! MovieRanker is officially entering Public Beta. Here is a note on why I built it, how to earn exclusive beta swag in the Beta Test Screening, and what is next.",
    content: [
      "Hi Everyone — My name is JR Houn and I created Movieranker.win because I love movies and I really enjoy the conversations I have with my friends about them. I've always wanted to make a tool / system / site that would help support the kinds of silly conversations that I have with friends: “If you had to pick your top 10 Tom Cruise movies, what's number one?”, “What's your list for the best live action comic book movie?”, and on and on it goes. Movieranker exists to make that core ranking list, either alone or with friends — and make it fun, simple, and easy to share with others.",
      "There's a bunch of other stuff that I've added to it because I'm a nerd and I'm exploring the limits of what I can put together with an LLM. But that's the core idea! With that said, I'm finally happy enough with the work I've done on the site to say that it is in Public Beta now. Please kick the tires, make some lists, share those lists with friends, and give me feedback about how it can be better.",
      "There are some bonuses for joining in too! Complete the 3-step Beta Test Screening (create an account, claim a handle, and rank & contribute a list publicly) to claim your exclusive Beta Canister cosmetic swag: the Beta Reel avatar, cassette frame, and “Betamax was better” tagline.",
      "Also, every week we have a new curated list of movies to rank that follow a hidden (or sometimes not so hidden) theme. If you're a list-a-holic like me, come back every week and do the weekly for new profile unlocks, connection puzzles, and little bonuses. Check out the community stats and compare your lists with friends!",
      "That's a lot of information for now — I hope you enjoy what I've put together here and please let me know how it can be better. Thank you!",
    ],
    highlights: [
      "Beta Test Screening: Complete 3 quick steps to unlock the exclusive Beta Reel Avatar, Cassette Frame, and 'Betamax was better' Tagline.",
      "Curated Weekly Themes: Every Monday brings a new themed Marquee with hidden connections and bonus XP for list-a-holics.",
      "Community Stats & Taste Compare: See how fellow film lovers ranked the weekly list and compare podiums side-by-side with friends.",
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
