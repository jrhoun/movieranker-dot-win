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
    title: "Friend Referrals, Clearer Sign-Up & Profile Updates",
    summary:
      "Invite friends to rank movies with you and earn bonus XP. Plus major refinements to sign-in, password management, and profile customization.",
    highlights: [
      "Friend Referral System: Share your invite link from your profile. Earn +15 XP (+3 Career Levels) when an invited friend registers and finishes their first ranking.",
      "Smart List Share Attribution: Sharing any completed list now automatically includes your referral tag for friends who join.",
      "Clear Sign-In & Registration: A redesigned sign-in screen with dedicated tabs for existing users vs. new accounts, plus instant 'Forgot password?' support.",
      "Seamless Login Redirection: Signing in now returns you directly to the page you were viewing rather than redirecting away.",
    ],
  },
  {
    id: "career-progression-showcase",
    date: "August 26, 2026",
    version: "v1.3",
    tag: "Feature",
    title: "Career Progression, Achievements & Community Proposals",
    summary:
      "Turn movie nights into a career. Earn XP with every matchup, level up your status, and showcase your film milestones.",
    highlights: [
      "10 Career Ranks: Level up from Film Novice all the way to Hall of Fame Auteur as you curate and finish lists.",
      "Achievements Showcase: Unlock milestone badges (Opening Night, Marquee Contributor, Double Feature) and pin your favorites to your public profile.",
      "Community Marquee Proposals: Level 3+ curators can propose custom movie themes for upcoming weekly community features.",
      "Public Profile Curators: Share your personal @handle link to show off your ranked lists and pinned achievements.",
    ],
  },
  {
    id: "marquee-and-compare",
    date: "August 25, 2026",
    version: "v1.2",
    tag: "Feature",
    title: "This Week's Marquee, Real Participants & Taste Compare",
    summary:
      "Curated themed shortlists ready to play instantly, plus tools to co-rank with friends and compare your film tastes side-by-side.",
    highlights: [
      "This Week's Marquee: Curated themed packs of movies ready to rank in under 5 minutes right from the home page.",
      "Real Participant Chips: Tag friends who participated in your movie night ranking and let them claim their credit.",
      "Curator Comparison Engine (/compare): Put two rankings or curators side-by-side to see agreement percentage and biggest film debates.",
      "Public List Visibility: Choose whether completed lists are Public, Unlisted, or Private to your account.",
    ],
  },
  {
    id: "initial-launch",
    date: "August 23, 2026",
    version: "v1.0",
    tag: "Milestone",
    title: "movieranker.win Launch",
    summary:
      "The definitive head-to-head movie ranking web app. Settle film debates pairwise with Elo voting and crown your definitive winners.",
    highlights: [
      "Pairwise Elo Voting: Eliminates list fatigue by presenting simple A-vs-B choices.",
      "TMDB Integration: Instant search across thousands of movies with official high-res posters and release years.",
      "Zero-Friction Ranking: Start ranking immediately without needing to sign up until you want to save and share your final list.",
      "Mobile-First Premiere Night Cinema Theme: Fast, responsive dark UI built for quick debates and movie nights.",
    ],
  },
];
