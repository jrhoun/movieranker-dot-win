# movieranker.win ✦ Premiere Night

MovieRanker is a pairwise ELO movie ranking platform designed with a theatrical "Premiere Night" aesthetic. Moviegoers rank films head-to-head, discover community consensus on weekly curated marquees, and create personalized public profile showcases.

---

## 1. Core Systems & Architecture

### ✦ Weekly Marquee System
* **Deterministic Zero-Cron Rotation:** "This Week's Marquee" rotates once every week, anchored strictly to **Monday 00:00:00 UTC** using pure arithmetic (`weeksSinceUtcEpoch`). No cron jobs or database triggers are needed; all visitors worldwide see the exact same theme synchronously.
* **Marquee Countdown:** A real-time countdown timer computes the remaining days, hours, and minutes until the next Monday rotation.
* **Ranked User Verification Ribbon:** Logged-in users who have completed the current weekly marquee are greeted with a gold verification ribbon (`✓ You've ranked this week's marquee`) with direct links to **"View your ranking"** and **"Show community stats"**.
* **Community Consensus Engine:** When users rank a weekly marquee, it defaults to public visibility, feeding aggregate ELO ratings, #1 vote percentages, "Undisputed Champion", and "Most Divisive Film" metrics.

### ✦ Community Proposals System
* **User Proposals:** Authenticated users who reach **Level 20 (Film Buff / Cinephile)** can propose new shortlist themes from their profile (`/u/profile`), defining a title, atmospheric blurb, and 6–8 TMDB movie selections. Users below Level 20 see a progress lock indicator.
* **Eligibility Protection:** Lists that were completed as part of the weekly marquee cannot be re-proposed to prevent duplicate cycles.
* **Admin Review Panel (`/admin`):** Authorized staff (configured via `ADMIN_EMAILS`) can review, approve, or reject pending proposals.
* **Automatic Attribution:** Approved proposals are seamlessly merged into the rotation pool and headline the site with credit: **"Proposed by @handle"**.

### ✦ Pairwise Ranking Engine (`src/lib/ranking.ts`)
* **Matchmaking:** Conducts pairwise Swiss-style comparisons based on least comparisons and close ELO proximity.
* **Dynamic Stability (`isStable`):** Evaluates consensus when comparisons reach minimum evidence thresholds without recent significant rank shifts.
* **"Haven't Seen" Parking:** Clicking *"Haven't seen"* removes a movie from active matchups. At list finalization, active movies receive competitive ranks (1..N), while unvoted/parked movies receive `finalRank: null` and appear in a dedicated *"Haven't seen (Unranked)"* section.

### ✦ Search & Filmography Filter (`src/lib/tmdb.ts`)
* **Dedicated Search Modes:**
  * **Title:** Direct movie search.
  * **Director:** Filters for crew entries where `job === 'Director'` (eliminates executive producer and noise credits).
  * **Actor / Actress:** Filters strictly for cast appearances.
  * **Studio:** Searches production companies with real TMDB movie counts.
  * **Keyword:** Searches by theme or plot keywords.
* **Collapsible Selection Tray:** Hidden when empty (keeping footers unblocked), ultra-slim when collapsed, and expandable for naming and friend invites.
* **Auto-Saved Drafts:** Staged selections auto-sync to `localStorage` (`mr-staged-draft`) to survive reloads.

### ✦ Profiles, Gamification & Achievements
* Unique claimable `@handle` with public profile showcases (`/u/[handle]`).
* **Featured Ranking Showcase (Level 10):** Users who reach Level 10 can pin 1 public completed ranking to the top of their public showcase.
* **Marquee Theme Proposals (Level 20):** Mid-tier milestone unlocking community theme proposals.
* Achievement unlocks: *First Premiere*, *Double Feature*, *Centurion*, *Opening Night Pioneer*, *Master Curator*.

---

## 2. Getting Started

### Prerequisites
* Node.js 18+
* Supabase project
* TMDB API Read Token

### Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TMDB_READ_TOKEN=your_tmdb_bearer_token
ADMIN_EMAILS=admin@example.com
```

### Development
```bash
npm install
npm run dev
```

### Verification & Testing
```bash
# Run unit & property test suite (290 tests)
npm test

# Production build verification (Turbopack)
npm run build

# ESLint & TypeScript checks
npm run lint
```
