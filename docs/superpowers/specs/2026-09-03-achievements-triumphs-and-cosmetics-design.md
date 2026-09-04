# Architecture Specification: Evolving Achievements, Canister Unboxing & Living Cosmetics

**Date:** 2026-09-03  
**Status:** Approved for Implementation Planning  
**Target Repository:** `jrhoun/movieranker-dot-win`

---

## 1. Executive Summary & Core Principles

This specification designs a comprehensive progression and cosmetic ecosystem for MovieRanker inspired by Destiny 2's Triumph system, Steam achievement loops, and classic cinema culture. It unifies achievements, profile progression, loot canisters, and profile cosmetics into a clean, cohesive hierarchy.

### 1.1 Strict Separation of Concerns (Deduplication)
To avoid confusing overlapping reward channels:
1. **Career Level & XP Curve (`src/lib/gamification.ts`)**: Exclusively unlocks **functional site capabilities and profile showcase expansions** (e.g. pinning 1 list $\to$ 3 lists $\to$ 5 lists; pinning 1 badge $\to$ 3 badges $\to$ 5 badges; theme proposal permissions). Leveling does not award random cosmetic clutter.
2. **Achievements (Triumphs)**: Exclusively awards **specific milestones, tiered badge evolutions, secret easter eggs, and high-prestige cosmetics** (animated profile auras, prismatic frames, director taglines).
3. **Reel Canisters (Loot Boxes)**: Awarded from **weekly Marquee completions** and **every 5 Career Levels** (Levels 5, 10, 15, 20...), opened via an interactive, physical 35mm film canister unboxing ceremony to unlock droppable wardrobe cosmetics.
4. **Retirement of "Challenges"**: The redundant "Challenges" terminology is consolidated into the **Achievements** system.

---

## 2. Evolving Achievements Subsystem ("Pokémon-Style" In-Place Evolution)

Each evolving achievement is represented on the user profile as a **single evolving badge card** that upgrades its visual crest through 5 distinct tiers rather than cluttering the grid with duplicate entries.

### 2.1 Visual Crest Evolution
- **Tier I**: Weathered Cardstock Ticket Stub (perforated edges, vintage serif stamp).
- **Tier II**: Cast Polished Bronze Emblem (beveled coin rim, warm bronze tone).
- **Tier III**: Etched Sterling Silver Crest (obsidian inlay, cool silver metallic sheen).
- **Tier IV**: 24K Gilded Gold Foil (ornate filigree border, specular highlights).
- **Tier V (Legendary)**: Radiant Holographic Prismatic Seal (shimmering hue-shift animation, gold marquee glow).

### 2.2 Hardcore Evolving Achievement Roster
The difficulty curve is tuned for long-term prestige:

| Key | Title | Description | Tier Milestones | Rewards |
|---|---|---|---|---|
| `marquee_veteran` | **The Marquee Veteran** | Consecutive weekly marquee ranking completions | • Tier I: 2 weeks<br>• Tier II: 5 weeks (1 mo)<br>• Tier III: 12 weeks (quarter)<br>• Tier IV: 26 weeks (half-year)<br>• Tier V: **52 weeks (1 full year)** | • Tier I: +25 XP<br>• Tier II: +50 XP<br>• Tier III: +100 XP<br>• Tier IV: +200 XP, Gilded Brass Frame<br>• Tier V: +500 XP, **Radiant Marquee Aura** (`.aura-golden-marquee`), Title: *"Marquee Laureate"* |
| `master_curator` | **The Master Curator** | Total settled rankings finished | • Tier I: 1 ranking<br>• Tier II: 10 rankings<br>• Tier III: 30 rankings<br>• Tier IV: 75 rankings<br>• Tier V: **200 rankings** | • Tier I: +15 XP<br>• Tier II: +35 XP<br>• Tier III: +75 XP<br>• Tier IV: +150 XP, *"The Auterist"* tagline<br>• Tier V: +400 XP, **Holographic Prismatic Frame** (`.cf-prism`) |
| `celluloid_devotion`| **Celluloid Devotion** | Total individual films compared and ranked | • Tier I: 25 films<br>• Tier II: 100 films<br>• Tier III: 350 films<br>• Tier IV: 800 films<br>• Tier V: **2,000 films** | • Tier I: +15 XP<br>• Tier II: +35 XP<br>• Tier III: +75 XP<br>• Tier IV: +150 XP, Nitrate Flicker Overlay<br>• Tier V: +400 XP, Title: *"Living Archive"* |
| `spotlight_sensation` | **Spotlight Sensation** | Lists breaking into Community Spotlight / Top Voted | • Tier I: 1 list<br>• Tier II: 3 lists<br>• Tier III: 8 lists<br>• Tier IV: 20 lists<br>• Tier V: **50 lists** | • Tier I: +30 XP<br>• Tier II: +60 XP<br>• Tier III: +120 XP, *"The Taste Maker"* tagline<br>• Tier IV: +250 XP<br>• Tier V: +600 XP, **Neon Cyan Profile Glow**, Obsidian VIP Stub style |
| `cryptologist` | **The Cryptologist** | Weekly Marquee mystery connection threads cracked | • Tier I: 1 mystery<br>• Tier II: 5 mysteries<br>• Tier III: 15 mysteries<br>• Tier IV: 30 mysteries<br>• Tier V: **52 mysteries** | • Tier I: +25 XP<br>• Tier II: +50 XP<br>• Tier III: +100 XP<br>• Tier IV: +200 XP<br>• Tier V: +500 XP, Title: *"Master of Secrets"*, Cryptic Noir Stub style |
| `film_club_patron` | **Film Club Patron** | Community upvotes cast on fellow curators' rankings | • Tier I: 5 upvotes<br>• Tier II: 25 upvotes<br>• Tier III: 100 upvotes<br>• Tier IV: 350 upvotes<br>• Tier V: **1,000 upvotes** | • Tier I: +10 XP<br>• Tier II: +25 XP<br>• Tier III: +50 XP<br>• Tier IV: +100 XP, Velvet Band nameplate<br>• Tier V: +300 XP, Title: *"Patron of the Arts"* |
| `the_recruiter` | **The Recruiter** | Friends who register and complete a ranking via your link | • Tier I: 1 friend<br>• Tier II: 3 friends<br>• Tier III: 8 friends<br>• Tier IV: 20 friends<br>• Tier V: **50 friends** | • Tier I: +30 XP<br>• Tier II: +60 XP<br>• Tier III: +120 XP, *"Double Feature"* tagline<br>• Tier IV: +250 XP<br>• Tier V: +500 XP, Velvet Stub style |

---

## 3. Singular Milestones & Secret Easter Eggs

### 3.1 Singular Milestones
- **The Pitch / Opening Night**: Have a proposed weekly marquee theme chosen & published by the community.  
  *Reward*: +250 XP, Legendary *"Programmer"* gold tagline, Marquee Bulbs Frame.
- **Double Feature**: Complete a ranking that credits a co-curator.  
  *Reward*: +30 XP.
- **Heavyweight Division**: Settle a single list of 16 films or more.  
  *Reward*: +50 XP.
- **Ticket Stamped**: Export or share your Cinema Ticket Stub.  
  *Reward*: +25 XP.

### 3.2 Secret Easter Eggs (Redacted as `??? Secret Achievement`)
In the profile UI before unlock, secret achievements display with a locked silhouette and redacted text: *"Keep ranking and exploring cinema to discover this secret."*

- **"Clean Sweep" / "Flawless Reel"**: One movie wins every single 1-on-1 matchup in a list of 10+ films without dropping a single duel.  
  *Reward*: +100 XP, **Radioactive Toxic Frame** (`.cf-toxic` with living pulse).
- **"Midnight Screening"**: Finalize a ranking between 12:00 AM and 3:00 AM local browser time.  
  *Reward*: +50 XP, *"Creature of the Night"* tagline, Midnight Velvet ticket stub material.
- **"Fast Cut"**: Complete a ranking of 10+ films in under 45 seconds using keyboard blitz controls (`A`/`D`).  
  *Reward*: +75 XP, **VHS Tracking Glitch** overlay (`.co-vhs` with living twitch).
- **"Cinema Verité / The Purist"**: Settle a ranking where every single film is a classic (released before 1965).  
  *Reward*: +100 XP, **Silver Screen Nitrate Dust** animated overlay (`.co-dust`).

---

## 4. In-Game Notifications & The Profile Claiming Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. In-Game Trigger (Vote settles, connection cracked, etc.) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Corner Notification Toast (Steam / Game Console Style)   │
│    • Slide in at bottom-right viewport                      │
│    • "✦ ACHIEVEMENT UNLOCKED ✦"                             │
│    • Icon + Title + "Claim on your profile →"               │
│    • Elegant cinema chime (if sound enabled)                │
│    • Auto-fades out after 3.8s (or on click-through)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Ambient Beacon Guidance                                  │
│    • Navigation Bar: Subtle glowing gold dot by user avatar │
│    • Profile Header: "Achievements · 1 Ready to Claim" pill │
│    • Unclaimed Badge Card: Breathing gold aura              │
│    • Pulsing Claim Button: [ ✦ Claim Tier II (+25 XP) ✦ ]   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. The Claim Ceremony (User clicks "Claim")                 │
│    • Celebratory audio chime & sparkle burst                │
│    • Badge crest evolves in-place (e.g. Bronze -> Silver)   │
│    • Unmasks secret description and lore                    │
│    • XP bar advances live toward next career level          │
│    • Unlocks cosmetics directly into wardrobe               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Reel Canisters & The Interactive Unboxing Ceremony

### 5.1 When Canisters Are Earned
1. **Weekly Marquee**: 1 Canister awarded upon settling that week's Marquee theme.
2. **Career Level Ups**: 1 Canister awarded upon reaching **every 5 Career Levels** (Levels 5, 10, 15, 20, 25, 30, 35...).

### 5.2 Interactive 35mm Film Canister Unboxing
On `/u/profile`, an interactive vault displays:
`"🎞️ 1 Unopened Reel Canister" [ Open Canister ]`

When clicked, a centered stage opens:
1. **Physical Presence**: A vintage 35mm metal film canister with embossed sprocket patterns rests in the center.
2. **The Pop**: Clicking the lid triggers a mechanical twist-and-pop sound.
3. **The Light Burst**: The lid lifts off, and theatrical projector rays spill out from inside.
4. **The Item Reveal**: The unlocked cosmetic card rises out of the canister, glowing in its rarity beam:
   - Common (Warm White / Amber)
   - Rare (Electric Cyan / Neon Magenta)
   - Legendary (Gilded Gold / Prismatic Spectrum)
5. **Instant Actions**: **[ Equip Now ]** or **[ Send to Wardrobe ]**.

---

## 6. Living, "Jazzed-Up" Animated Profile Cosmetics

Cosmetics will no longer be static CSS borders; they breathe active life into the profile while respecting accessibility:

```css
/* Electric Neon Cyan with high-frequency micro-flicker and gas hum */
.cf-neon-cyan {
  background: #0b2a2e;
  box-shadow: 0 0 0 2px #22e0ff, 0 0 16px 3px rgba(34, 224, 255, 0.8);
  animation: neon-hum-cyan 3.2s infinite;
}
@keyframes neon-hum-cyan {
  0%, 100% { box-shadow: 0 0 0 2px #22e0ff, 0 0 16px 3px rgba(34, 224, 255, 0.8); }
  45% { box-shadow: 0 0 0 2px #22e0ff, 0 0 22px 5px rgba(34, 224, 255, 0.95); }
  47% { box-shadow: 0 0 0 2px #158a9e, 0 0 8px 1px rgba(34, 224, 255, 0.4); }
  49% { box-shadow: 0 0 0 2px #22e0ff, 0 0 20px 4px rgba(34, 224, 255, 0.9); }
  85% { box-shadow: 0 0 0 2px #22e0ff, 0 0 14px 2px rgba(34, 224, 255, 0.75); }
}

/* Radioactive Toxic slow-breathing bioluminescent simmer */
.cf-toxic {
  background: #122a10;
  box-shadow: 0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124, 255, 77, 0.6);
  animation: toxic-simmer 2.6s ease-in-out infinite;
}
@keyframes toxic-simmer {
  0%, 100% { box-shadow: 0 0 0 2px #7cff4d, 0 0 14px 2px rgba(124, 255, 77, 0.6); }
  50% { box-shadow: 0 0 0 3px #9eff78, 0 0 26px 6px rgba(124, 255, 77, 0.9); }
}

/* VHS Glitch periodic RGB-split twitch */
.cf-vhs {
  background: #111;
  animation: vhs-twitch 4.5s steps(1) infinite;
}
@keyframes vhs-twitch {
  0%, 94%, 100% { box-shadow: -3px 0 0 0 #ff2e63, 3px 0 0 0 #21d4fd, 0 0 0 1px #333; transform: none; }
  95% { box-shadow: -5px 0 0 0 #ff2e63, 5px 0 0 0 #21d4fd, 0 0 0 1px #555; transform: translateX(1px); }
  97% { box-shadow: 4px 0 0 0 #ff2e63, -4px 0 0 0 #21d4fd, 0 0 0 1px #444; transform: translateX(-1px); }
}

/* Radiant Marquee Golden Aura (surrounding the user profile showcase) */
.aura-golden-marquee {
  position: relative;
  box-shadow: 0 0 35px 5px rgba(245, 197, 24, 0.25), 0 0 0 1px rgba(245, 197, 24, 0.5);
  animation: marquee-breathe 4s ease-in-out infinite;
}
@keyframes marquee-breathe {
  0%, 100% { box-shadow: 0 0 35px 5px rgba(245, 197, 24, 0.25), 0 0 0 1px rgba(245, 197, 24, 0.4); }
  50% { box-shadow: 0 0 55px 12px rgba(245, 197, 24, 0.45), 0 0 0 1.5px rgba(245, 197, 24, 0.7); }
}

/* Strict reduced-motion fallback: retain resting static tints and borders with zero motion */
@media (prefers-reduced-motion: reduce) {
  .cf-neon-cyan, .cf-neon-magenta, .cf-toxic, .cf-vhs, .aura-golden-marquee {
    animation: none !important;
  }
}
```

---

## 7. Revamped Wardrobe & Browsing Experience ("The Cinema Dressing Room")

Instead of a monolithic wall of 100+ text tiles:
1. **Live Wardrobe Mirror**: At the top of the Customise modal, the user's avatar, nameplate, background, and equipped ticket stub render in a live mirror.
2. **Category Tabs**:
   - **Frames** (Brass, Perforation, Toxic, Neon Cyan, Neon Magenta, VHS, Prism, Marquee Bulbs)
   - **Auras & Glows** (Marquee Golden Aura, Spotlight Beam, Neon Cyan Glow)
   - **Overlays** (Film Grain, Dust & Scratches, Projector Flicker, VHS Tracking)
   - **Ticket Stubs** (Classic Manila, Vintage Silver, Velvet VIP, Gold Foil, Obsidian Noir)
   - **Backgrounds** (Filmstrip, Spotlight, Velvet)
   - **Taglines** (Categorized director quotes & earned prestige titles)
3. **Instant Preview on Tap**: Clicking an item previews it immediately in the mirror before clicking "Save".
4. **Source Transparency**: Locked items explicitly display:
   - *"Dropped from Reel Canister"*
   - *"Earned from Achievement: Master Curator (Tier V)"*
   - *"Unlocked at Career Level 25"*

---

## 8. Ticket Stub Maturation (Goodbye "Premiere Pass")
- The feature is renamed to **"Cinema Ticket Stub"** (or simply **"Ticket Stub"**).
- Copy is revised to remove corporate VIP/snob wording ("Admin One - Cinema Verite") in favor of authentic vintage cinema admission stamps (*"Admit One · Standard Admission · 35mm Projection"*).
- High-tier achievements unlock new canvas render textures:
  - **Gold Foil Stub** (metallic gold specular grain).
  - **Velvet VIP Stub** (rich burgundy flock texture).
  - **Obsidian Noir Stub** (matte black with silver lettering).

---

## 9. Data Model & Technical Implementation Details

### 9.1 Zero Database Migrations Required
The entire system builds on the established JSONB pattern in `profiles.showcase`:

```ts
export interface ProfileShowcase {
  // Existing fields
  achievementKeys: string[]; // Pinned badges on public profile
  favoriteListId: string | null;
  lifetimeXp?: number;
  equipped?: Equipped;
  avatarClaims?: number[];
  
  // New progression fields
  claimedAchievements?: Record<string, number>; // key -> highest claimed tier (e.g. { "marquee_veteran": 3 })
  unopenedCanisters?: number; // count of unopened canisters
  unlockedStubStyles?: string[]; // e.g. ["gold_foil", "velvet"]
  pinnedListIds?: string[]; // multi-list shelf expansion (1, 3, or 5 lists)
}
```

### 9.2 Derivation Pipeline (`src/lib/gamification.ts`)
```ts
export interface AchievementTier {
  tier: number; // 1 to 5
  name: string;
  requirement: number;
  xpReward: number;
  cosmeticUnlockId?: string;
  titleReward?: string;
}

export interface EvolvingAchievement {
  key: string;
  name: string;
  category: "curation" | "streak" | "community" | "mystery" | "social";
  tiers: AchievementTier[];
  checkProgress: (stats: AchievementStats) => number;
  secret?: boolean;
}
```

### 9.3 API Endpoints
- `POST /api/profile/achievements/claim`:
  - Validates user eligibility for the next tier of `achievementKey`.
  - Increments `showcase.claimedAchievements[key]`.
  - Reconciles XP via `reconcileCareerXp()`.
  - Returns updated XP, new level, and cosmetic unlocks.
- `POST /api/profile/canister/open`:
  - Decrements `showcase.unopenedCanisters`.
  - Executes deterministic seeded draw `drawFrom(droppablePool(owned), seed)`.
  - Adds drawn cosmetic ID to user's owned cosmetics.
  - Returns drawn cosmetic metadata for unboxing celebration.

---

## 10. Testing & Verification Strategy

1. **Unit Tests (`vitest`)**:
   - Evolving tier evaluation for each tier threshold.
   - Idempotency of claiming (cannot double-claim same tier).
   - Secret achievement masking (redacted until claimed).
   - Canister determinism and pool integrity (no duplicates, append-only stability).
   - Reduced-motion CSS assertions (ensuring all living animations respect `@media (prefers-reduced-motion: reduce)`).
2. **Integration Tests**:
   - Settlement toast trigger on list completion.
   - Beacon dot visibility logic across header and profile sections.
   - Multi-list shelf capacity constraints gating according to career level.
3. **Parity Check**:
   - `npm test` passing with 100% test rate.
   - `npm run build` zero TypeScript or Turbopack errors.
