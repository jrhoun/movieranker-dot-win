# MovieRanker Bugs & Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 12 bug reports, UX enhancements, and feature requests from `movieranker.win bugs and improvements-9-8-2026.pdf` — including hero poster clipping, community spotlight exclusion & opt-in, smooth scrolling, low settled count suppression, public beta branding with 3-step walkthrough challenge and exclusive Beta Canister ("Betamax was better"), in-app feedback modal, beta release announcement, natural copy cleanup, collapsible customise panes, 10–15 avatars per category, roulette card spacing, and dramatic cinema blackout mode.

**Architecture:**
- **Front-end UI & Theatrics**: Refined CSS transforms and container padding in Next.js Tailwind v4 for the hero poster fan; enhanced theater lighting overlay in `globals.css` and `play-room.tsx` for high-contrast "Dim Lights" focus; responsive spacing adjustments in `CuratorRoulette.tsx`.
- **Community Spotlight & Provenance**: Filter weekly Marquees out of `formatTrendingLists` in `trending.ts`; introduce an opt-in checkbox to submit custom lists to Community Spotlight on completion and on list owner view.
- **Beta Walkthrough & Cosmetics**: Create a 3-step `BetaWalkthroughCard` tracking account creation, handle claim, and public list contribution; define the `beta_pioneer` challenge unlocking the Beta Avatar, Beta Frame, and "Betamax was better" Tagline; add vintage "BETA" badge to site header.
- **Feedback & Content**: Implement `FeedbackModal` with API endpoint `POST /api/feedback`; add September 2026 public beta update to `updates.ts`; regenerate CC0 DiceBear avatar suite with 12 seeds per style (72 total).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (`@supabase/ssr`), Vitest, Web Audio API.

**Spec:** [movieranker.win bugs and improvements-9-8-2026.pdf](file:///home/jrhoun/projects/movieranker.win%20bugs%20and%20improvements-9-8-2026.pdf)

## Global Constraints
- Must function flawlessly on mobile screens (360px–414px) as well as desktop (1024px–1440px).
- Zero regression in existing Vitest test suites.
- Preserve the spoiler rule: Marquee theme titles must never leak into hero or preview surfaces prior to solve.
- All newly generated avatars must remain strictly CC0-1.0 compliant (no attribution requirements).
- Preserve existing comments and docstrings.

---

### Task 1: Fix Homepage Movie Poster Fan Clipping (Mobile & Desktop)

**Files:**
- Modify: `src/app/(site)/home-client.tsx:336-380`
- Test: `src/lib/e2e-theatrical.test.ts`

**Interfaces:**
- Consumes: `fanItems: { m: TmdbMovieCredit; tilt: number; arcY: number }[]`
- Produces: Visual containment without top/bottom overflow clipping at all responsive breakpoints.

- [ ] **Step 1: Write the test verifying poster fan padding and layout bounds**

Add a test in `src/lib/e2e-theatrical.test.ts` verifying that `home-client.tsx` markup maintains vertical clearance (`py-10` or `pt-10 pb-14`) and does not clip child poster cards with conflicting negative margins or rigid overflow heights.

```ts
it("ensures hero poster fan has sufficient vertical clearance for tilts and hover lifts", () => {
  const code = readFileSync("src/app/(site)/home-client.tsx", "utf8");
  expect(code).toMatch(/fan-scroll[^"]*pb-12|fan-scroll[^"]*pb-14/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: FAIL (currently uses `pb-8`).

- [ ] **Step 3: Update `home-client.tsx` vertical bounds and mobile padding**

In `src/app/(site)/home-client.tsx`:
1. Change `<ul className="no-scrollbar fan-scroll relative flex overflow-x-auto px-6 pt-6 pb-8 sm:px-4">` to `px-6 pt-8 pb-14 sm:px-6`.
2. Ensure the parent container has `overflow-visible sm:overflow-hidden` and sufficient min-height so mobile phones (where posters fan out with arc) and desktop hover lifts (`-translate-y-4 hover:scale-[1.05]`) are completely visible without clipping.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(site\)/home-client.tsx src/lib/e2e-theatrical.test.ts
git commit -m "fix(ui): prevent homepage hero poster fan clipping on mobile and desktop"
```

---

### Task 2: Exclude Marquees from Community Spotlight & Add Opt-in Submission for Custom Lists

**Files:**
- Modify: `src/lib/trending.ts:126-150`
- Modify: `src/app/r/play/play-room.tsx:540-550`
- Modify: `src/components/SaveGateSheet.tsx:68-80`
- Modify: `src/app/(site)/l/[id]/page.tsx:320-360`
- Test: `src/lib/trending.test.ts`

**Interfaces:**
- Consumes: `RawDbListRow`, `PlaySession`
- Produces: `formatTrendingLists` strictly omitting marquee theme rows; user opt-in control setting `visibility = "public"` for custom lists.

- [ ] **Step 1: Write failing test in `src/lib/trending.test.ts`**

In `src/lib/trending.test.ts`, add test asserting that marquee lists (`theme_slug != null` or `curated: true`) are excluded from `formatTrendingLists` even when `visibility === "public"`.

```ts
it("excludes weekly marquee lists from community spotlight even if marked public", () => {
  const rows: RawDbListRow[] = [
    {
      id: "marquee-1",
      title: "Weekly Marquee #3",
      description: null,
      owner_id: "user-1",
      status: "done",
      visibility: "public",
      theme_slug: "psychological-thrillers",
      upvotes_count: 50,
      created_at: new Date().toISOString(),
      list_movies: [],
    },
    {
      id: "custom-1",
      title: "My Favorite 90s Thrillers",
      description: "Handpicked",
      owner_id: "user-2",
      status: "done",
      visibility: "public",
      upvotes_count: 10,
      created_at: new Date().toISOString(),
      list_movies: [],
    },
  ];

  const spotlight = formatTrendingLists(rows);
  expect(spotlight.map((l) => l.id)).toEqual(["custom-1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/trending.test.ts`
Expected: FAIL (currently includes `marquee-1`).

- [ ] **Step 3: Update `formatTrendingLists` in `src/lib/trending.ts`**

Update `formatTrendingLists`:
```ts
export function formatTrendingLists(
  lists: RawDbListRow[],
  profileHandles: Map<string, string> = new Map(),
  sortMode: TrendingSortMode = "top",
): TrendingListSummary[] {
  return lists
    .filter(
      (l) =>
        l.status === "done" &&
        l.visibility === "public" &&
        !l.theme_slug &&
        !l.curated,
    )
...
```

- [ ] **Step 4: Update custom list finishing flows in `play-room.tsx` and `SaveGateSheet.tsx`**

In `play-room.tsx` and `SaveGateSheet.tsx`:
1. Add an opt-in checkbox in the completion sheet / wrap-up flow: `"Submit to Community Spotlight"`.
2. If checked by the user, submit `visibility: "public"`; if unchecked, default to `visibility: "unlisted"`.
3. For Marquee lists (`session.themeSlug`), keep `visibility: "public"` for personal profile / marquee consensus tracking (knowing `formatTrendingLists` will exclude them from the home Spotlight).
4. In `l/[id]/page.tsx`, if the logged-in user is the owner of a custom list, display a toggle/badge in the list header to submit/remove from Community Spotlight (`PATCH /api/lists/[id]` with `{ visibility: "public" | "unlisted" }`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/trending.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/trending.ts src/lib/trending.test.ts src/app/r/play/play-room.tsx src/components/SaveGateSheet.tsx src/app/\(site\)/l/\[id\]/page.tsx
git commit -m "feat(community): exclude marquees from spotlight and provide opt-in for custom lists"
```

---

### Task 3: Smooth Scroll for "Spin a Reel While You Wait"

**Files:**
- Modify: `src/app/(site)/home-client.tsx:410-418`
- Test: `src/lib/e2e-theatrical.test.ts`

**Interfaces:**
- Consumes: Click event on `#reel` anchor
- Produces: Smooth scroll down to `#reel` without jarring window jumps.

- [ ] **Step 1: Write test for smooth scroll implementation**

In `src/lib/e2e-theatrical.test.ts`:
```ts
it("configures smooth scrolling for spin a reel while you wait link", () => {
  const code = readFileSync("src/app/(site)/home-client.tsx", "utf8");
  expect(code).toMatch(/scrollIntoView\(\{ behavior:\s*["']smooth["'] \}\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `home-client.tsx`**

In `src/app/(site)/home-client.tsx`, attach `onClick` handler to the anchor:
```tsx
<a
  href="#reel"
  onClick={(e) => {
    e.preventDefault();
    document.getElementById("reel")?.scrollIntoView({ behavior: "smooth" });
  }}
  className="text-xs text-muted underline decoration-white/25 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold focus-visible:outline-2 focus-visible:outline-gold"
>
  or spin a reel while you wait
</a>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(site\)/home-client.tsx src/lib/e2e-theatrical.test.ts
git commit -m "fix(ux): add smooth scrolling to spin a reel while you wait link"
```

---

### Task 4: Hide "1 ranking settled this week" unless 25+ rankings are done

**Files:**
- Modify: `src/app/(site)/home-client.tsx:439-455`
- Test: `src/lib/e2e-theatrical.test.ts`

**Interfaces:**
- Consumes: `tonight.settledCount: number`, `tonight.proposedBy: string | null`
- Produces: Renders settled count only when `>= 25`; preserves `"Theme by @handle"` if proposedBy is present regardless of count.

- [ ] **Step 1: Write test in `src/lib/e2e-theatrical.test.ts`**

```ts
it("suppresses settled count when under 25, while preserving proposedBy credit", () => {
  const code = readFileSync("src/app/(site)/home-client.tsx", "utf8");
  expect(code).toMatch(/settledCount >= 25/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: FAIL (currently checks `tonight.settledCount > 0`).

- [ ] **Step 3: Update `home-client.tsx` condition**

In `src/app/(site)/home-client.tsx`:
```tsx
{(tonight.settledCount >= 25 || tonight.proposedBy) && (
  <p className="text-xs text-muted" data-testid="settled-count">
    {tonight.settledCount >= 25 && tonight.proposedBy ? (
      <>
        {tonight.settledCount} rankings settled this week, theme by{" "}
        <span className="font-medium text-gold">@{tonight.proposedBy}</span>.
      </>
    ) : tonight.settledCount >= 25 ? (
      <>
        {tonight.settledCount} rankings settled this week.
      </>
    ) : (
      <>
        This week&apos;s theme proposed by{" "}
        <span className="font-medium text-gold">@{tonight.proposedBy}</span>.
      </>
    )}
  </p>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(site\)/home-client.tsx src/lib/e2e-theatrical.test.ts
git commit -m "fix(copy): suppress marquee settled count when under 25 and preserve proposer credit"
```

---

### Task 5: Public Beta Branding & 3-Step Walkthrough for Beta Canister

**Files:**
- Create: `src/components/beta/BetaBadge.tsx`
- Create: `src/components/beta/BetaWalkthroughCard.tsx`
- Modify: `src/components/SiteHeader.tsx:10-40`
- Modify: `src/lib/gamification.ts:430-530`
- Modify: `src/lib/cosmetics/catalogue.ts:20-35`
- Modify: `src/lib/cosmetics/frames.ts`
- Modify: `src/lib/cosmetics/taglines.ts`
- Modify: `src/lib/cosmetics/avatars.ts`
- Modify: `src/app/(site)/u/profile/page.tsx:150-200`
- Test: `src/lib/cosmetics/catalogue.test.ts`
- Test: `src/lib/cosmetics/ownership.test.ts`

**Interfaces:**
- Consumes: User auth state, handle claim state, public list count
- Produces: `beta_pioneer` achievement, unlocked Beta Avatar, Beta Frame (`frame.beta`), and Beta Tagline (`tagline.betamax` with text `"Betamax was better"`).

- [ ] **Step 1: Define cosmetics in `frames.ts`, `taglines.ts`, `avatars.ts` and `gamification.ts`**

1. In `src/lib/gamification.ts`:
   Add achievement:
   ```ts
   {
     key: "beta_pioneer",
     name: "Beta Pioneer",
     description: "Signed up, claimed a handle, and contributed a public ranking during public beta",
     icon: "📼",
     rarity: "legendary",
     challenge: true,
     check: (s) => (s.publicDoneLists ?? 0) >= 1 && s.hasHandle && s.isSignedIn,
   }
   ```
2. In `src/lib/cosmetics/frames.ts`:
   Append at the end (safe append):
   ```ts
   { id: "frame.beta", slot: "frame", name: "Beta Cassette", unlock: { kind: "challenge", key: "beta_pioneer" }, rarity: "legendary" }
   ```
3. In `src/lib/cosmetics/taglines.ts`:
   Append at the end:
   ```ts
   { id: "tagline.betamax", slot: "tagline", name: "Betamax", text: "Betamax was better", unlock: { kind: "challenge", key: "beta_pioneer" }, rarity: "legendary", rights: "owned", set: "Beta Pioneer" }
   ```
4. In `src/lib/cosmetics/avatars.ts`:
   Add `avatar.gen.beta-reel` with `{ kind: "challenge", key: "beta_pioneer" }`.

- [ ] **Step 2: Write failing test in `src/lib/cosmetics/ownership.test.ts`**

```ts
it("unlocks the complete Beta Canister bundle (avatar, frame, tagline) when beta_pioneer challenge is met", () => {
  const owned = ownedItemIds({
    userId: "test-user",
    level: 1,
    unlockedAchievementKeys: ["beta_pioneer"],
    finishedThemeSlugs: [],
  });

  expect(owned.has("frame.beta")).toBe(true);
  expect(owned.has("tagline.betamax")).toBe(true);
  expect(owned.has("avatar.gen.beta-reel")).toBe(true);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/cosmetics/ownership.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `BetaBadge.tsx` and attach to `SiteHeader.tsx`**

Create `src/components/beta/BetaBadge.tsx`:
A vintage neon-gold pill:
```tsx
export default function BetaBadge() {
  return (
    <span className="inline-flex items-center rounded-md bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold ring-1 ring-gold/40">
      Beta
    </span>
  );
}
```
Mount next to the MovieRanker brand logo in `SiteHeader.tsx`.

- [ ] **Step 5: Create `BetaWalkthroughCard.tsx`**

Build `src/components/beta/BetaWalkthroughCard.tsx`:
- Shows 3 interactive steps:
  1. `[x]` Create an account / Sign in
  2. `[x]` Claim your handle
  3. `[x]` Rank a list and share it publicly
- Progress meter (`1/3`, `2/3`, `3/3`).
- When all 3 are completed, triggers the "Claim Beta Canister" button, unveiling the Beta Avatar, Cassette Frame, and `"Betamax was better"` Tagline with a celebration chime and direct equip buttons.
- Mount on the user profile dashboard (`/u/profile`).

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/cosmetics/ownership.test.ts src/lib/cosmetics/catalogue.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/beta/ src/components/SiteHeader.tsx src/lib/gamification.ts src/lib/cosmetics/ src/app/\(site\)/u/profile/page.tsx
git commit -m "feat(beta): add beta badge, beta pioneer challenge, and beta walkthrough canister card"
```

---

### Task 6: In-App Feedback Dialog (Option A)

**Files:**
- Create: `src/components/feedback/FeedbackModal.tsx`
- Create: `src/app/api/feedback/route.ts`
- Modify: `src/components/SiteFooter.tsx:85-95`
- Modify: `src/components/SiteHeader.tsx`
- Test: `src/app/api/feedback/route.test.ts`

**Interfaces:**
- Consumes: User feedback payload `{ category: "bug" | "idea" | "other", message: string, email?: string }`
- Produces: JSON response `{ ok: true }` and client confirmation toast.

- [ ] **Step 1: Write test for `POST /api/feedback`**

Create `src/app/api/feedback/route.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { POST } from "./route";

describe("POST /api/feedback", () => {
  it("validates that message is required and category is valid", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({ category: "invalid", message: "" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts valid feedback", async () => {
    const res = await POST(
      new Request("http://localhost/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category: "bug",
          message: "Poster got clipped on Safari mobile",
          email: "tester@example.com",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/feedback/route.test.ts`
Expected: FAIL (route does not exist).

- [ ] **Step 3: Implement `src/app/api/feedback/route.ts`**

Implement rate limiting (via existing `rateLimit`), parse payload, record to Supabase table or structured error log / email notification fallback, and return `{ ok: true }`.

- [ ] **Step 4: Implement `FeedbackModal.tsx`**

Build accessible `<dialog>` modal with:
- Category radio/tabs: Bug Report, Feature Idea, General Feedback.
- Textarea with character counter and placeholder.
- Email input (auto-populated if user is logged in).
- Submit button with loading spinner and instant confirmation state.
- Wire trigger button into `SiteFooter.tsx` ("Support & Feedback") and `SiteHeader.tsx` / floating launcher.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/app/api/feedback/route.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/feedback/ src/app/api/feedback/ src/components/SiteFooter.tsx src/components/SiteHeader.tsx
git commit -m "feat(feedback): add in-app feedback dialog and api endpoint"
```

---

### Task 7: Beta Announcement for the Updates Page

**Files:**
- Modify: `src/data/updates.ts:10-30`
- Test: `src/app/(site)/updates/page.tsx`

**Interfaces:**
- Consumes: `SITE_UPDATES: SiteUpdate[]`
- Produces: Rendered September 2026 announcement entry on `/updates`.

- [ ] **Step 1: Write test for public beta update entry in `updates.test.ts`**

Create or add to test verifying that `SITE_UPDATES` contains the `public-beta` announcement.

```ts
it("includes the public beta announcement in SITE_UPDATES", () => {
  const beta = SITE_UPDATES.find((u) => u.id === "public-beta");
  expect(beta).toBeDefined();
  expect(beta?.title).toMatch(/Public Beta/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/updates.test.ts`
Expected: FAIL.

- [ ] **Step 3: Add `public-beta` entry to `SITE_UPDATES`**

In `src/data/updates.ts`, prepend to `SITE_UPDATES`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/updates.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/updates.ts
git commit -m "feat(updates): add public beta announcement to updates page"
```

---

### Task 8: Clean Up AI-Sounding Prose

**Files:**
- Modify: `src/app/(site)/u/profile/customise/page.tsx:1-50`
- Modify: `src/app/(site)/u/profile/customise/customise-client.tsx:470-476`
- Modify: `src/components/profile/ListRow.tsx:200-210`
- Modify: `src/app/(site)/u/profile/page.tsx:120-135`
- Test: `src/app/(site)/u/profile/customise/panes.test.ts`

**Interfaces:**
- Consumes: Headings, explanatory tooltips, and empty state strings
- Produces: Natural, punchy, human-written cinema copy.

- [ ] **Step 1: Write test checking replaced copy**

In `panes.test.ts`:
```ts
it("uses natural human phrasing for edit profile and featured ranking", () => {
  const pageCode = readFileSync("src/app/(site)/u/profile/customise/page.tsx", "utf8");
  expect(pageCode).not.toMatch(/Dressing room/);
  expect(pageCode).toMatch(/Edit Profile/);

  const clientCode = readFileSync("src/app/(site)/u/profile/customise/customise-client.tsx", "utf8");
  expect(clientCode).not.toMatch(/One ranking sits at the top/);
  expect(clientCode).toMatch(/Pin a ranking to feature it/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/\(site\)/u/profile/customise/panes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update copy across files**

1. In `src/app/(site)/u/profile/customise/page.tsx`:
   - Change title & heading: `"Edit Profile"` (was `"Dressing room"`).
   - Replace paragraph with clean subtitle:
     `<p className="mt-2 text-sm text-muted">Customize your avatar, frame, background, and profile tagline. <Link href={`/u/${data.handle}`} className="text-gold underline-offset-4 hover:underline">View public profile →</Link></p>`
2. In `src/app/(site)/u/profile/customise/customise-client.tsx`:
   - Replace:
     ```tsx
     <p className="mt-4 max-w-[70ch] text-base leading-relaxed text-text/90">
       Pin a ranking to feature it at the top of your public profile.
       {withheld > 0 &&
         ` (${withheld} finished ${withheld === 1 ? "ranking is" : "rankings are"} unlisted and cannot be featured until made public.)`}
     </p>
     ```
3. Update `ListRow.tsx` and `/u/profile/page.tsx` references to "dressing room" to refer to "Edit Profile".

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/\(site\)/u/profile/customise/panes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(site\)/u/profile/customise/ src/components/profile/ListRow.tsx src/app/\(site\)/u/profile/page.tsx
git commit -m "style(copy): replace awkward ai-sounding prose with clean, human copy"
```

---

### Task 9: Make Long Scrolling Sections Collapsible in Customise Page

**Files:**
- Modify: `src/app/(site)/u/profile/customise/customise-client.tsx:210-265,805-835`
- Test: `src/app/(site)/u/profile/customise/panes.test.ts`

**Interfaces:**
- Consumes: `ItemGroup[]` in `#tagline` and `#avatar`
- Produces: Collapsible accordion sections with persistent open/close toggle state and accessible disclosure markup (`<button aria-expanded="...">`).

- [ ] **Step 1: Write test for collapsible sections**

```ts
it("renders collapsible group containers with aria-expanded attributes in customise client", () => {
  const code = readFileSync("src/app/(site)/u/profile/customise/customise-client.tsx", "utf8");
  expect(code).toMatch(/aria-expanded/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/\(site\)/u/profile/customise/panes.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement collapsible group wrapper component**

In `src/app/(site)/u/profile/customise/customise-client.tsx`:
1. Create a `CollapsibleSection` component with internal state:
   - Header button showing group title, item count badge (e.g., `4/12 unlocked`), and animated chevron indicator.
   - Expand / Collapse toggle.
   - Smooth CSS height transition.
2. Provide an "Expand all / Collapse all" top action above long lists like `#tagline` (8 categories) and `#avatar` (7 categories).
3. Wrap each tagline decade and avatar style in this component, defaulting the user's equipped group to expanded.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/\(site\)/u/profile/customise/panes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(site\)/u/profile/customise/customise-client.tsx
git commit -m "feat(ux): make long scrolling sections in edit profile collapsible"
```

---

### Task 10: Expand Avatar Choices (12 Seeds Per Category, CC0 Only)

**Files:**
- Modify: `scripts/generate-avatars.mjs:35-40`
- Modify: `public/avatars/manifest.json`
- Modify: `src/lib/cosmetics/avatars.ts:150-180`
- Test: `src/lib/cosmetics/avatars.test.ts`

**Interfaces:**
- Consumes: DiceBear core collection v9
- Produces: 72 committed SVG files (12 seeds x 6 CC0 styles), updated manifest and catalogue.

- [ ] **Step 1: Write test verifying avatar count per category**

In `src/lib/cosmetics/avatars.test.ts`:
```ts
it("provides at least 10-15 avatars for every CC0 illustrated style", () => {
  const avatars = itemsForSlot("avatar").filter((i) => i.id.startsWith("avatar.gen."));
  for (const style of CC0_STYLES.filter((s) => ["lorelei", "notionists", "open-peeps", "pixel-art", "shapes", "thumbs"].includes(s))) {
    const count = avatars.filter((i) => i.id.startsWith(`avatar.gen.${style}-`)).length;
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(15);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/cosmetics/avatars.test.ts`
Expected: FAIL (currently only 4 seeds per style).

- [ ] **Step 3: Update `scripts/generate-avatars.mjs` and regenerate SVGs**

In `scripts/generate-avatars.mjs`:
Expand `SEEDS`:
```js
const SEEDS = [
  "reel", "usher", "matinee", "double-feature",
  "spotlight", "celluloid", "marquee", "curtain",
  "premiere", "noir", "technicolor", "director"
];
```
Run `node scripts/generate-avatars.mjs`.
Verify 72 SVGs and updated `manifest.json` are written.
In `src/lib/cosmetics/avatars.ts`:
Adjust `FREE_SEEDS_PER_STYLE = 6` and level gating curve so items unlock progressively through Level 100 without clustering.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/cosmetics/avatars.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-avatars.mjs public/avatars/ src/lib/cosmetics/avatars.ts src/lib/cosmetics/avatars.test.ts
git commit -m "feat(cosmetics): expand avatar catalogue to 12 choices per category"
```

---

### Task 11: Fix Spacing Hierarchy on Curator Roulette Card

**Files:**
- Modify: `src/components/roulette/CuratorRoulette.tsx:135-235`
- Test: `src/lib/e2e-theatrical.test.ts`

**Interfaces:**
- Consumes: `CuratorMicroPack`
- Produces: Tight, proportional card layout with no dead vertical space between blurb and filmstrip and balanced button positioning.

- [ ] **Step 1: Write test for Curator Roulette card layout structure**

In `src/lib/e2e-theatrical.test.ts`:
```ts
it("verifies curator roulette card keeps compact spacing hierarchy", () => {
  const code = readFileSync("src/components/roulette/CuratorRoulette.tsx", "utf8");
  expect(code).not.toMatch(/lg:items-center lg:justify-between/);
  expect(code).toMatch(/lg:items-start/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `CuratorRoulette.tsx`**

1. Change `className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"` to `lg:items-start lg:gap-8`.
2. Remove any artificial vertical stretch; ensure filmstrip sits directly under the blurb with `mt-3.5`.
3. Give the right-hand action column (`Rank This Reel` and `Spin Another`) a dedicated, centered vertical alignment with `self-center lg:self-center` and clean responsive padding.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/roulette/CuratorRoulette.tsx src/lib/e2e-theatrical.test.ts
git commit -m "fix(ui): eliminate dead vertical space and balance layout on curator roulette card"
```

---

### Task 12: High-Contrast Cinema Blackout Theater Mode ("Dim the Lights")

**Files:**
- Modify: `src/app/globals.css:992-1036`
- Modify: `src/app/r/play/play-room.tsx:1380-1460`
- Test: `src/lib/e2e-theatrical.test.ts`

**Interfaces:**
- Consumes: `lightsDown: boolean`
- Produces: Deep theater blackout where curtain drapes darken to 85% opacity, peripheral UI dims to 15%, and competing movie cards pop under a warm projector spotlight.

- [ ] **Step 1: Write test verifying theater mode blackout styles**

In `src/lib/e2e-theatrical.test.ts`:
```ts
it("applies theatrical blackout styles to curtains and duel stage under lights down", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  expect(css).toMatch(/\.cinema-lights-down \.bg-curtain-soft/);
  expect(css).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.8/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: FAIL.

- [ ] **Step 3: Update `globals.css` and `play-room.tsx`**

1. In `src/app/globals.css`:
   Add:
   ```css
   .cinema-lights-down .bg-curtain-soft {
     background-color: #030305 !important;
     background-blend-mode: multiply;
     filter: brightness(0.2) contrast(1.2);
     transition: filter 500ms ease-out, background-color 500ms ease-out;
   }

   .cinema-lights-down .stage-spotlight {
     background-image:
       radial-gradient(ellipse 55% 45% at 50% 50%, rgba(245, 197, 24, 0.22), transparent 70%),
       radial-gradient(ellipse 100% 90% at 50% 50%, transparent 35%, rgba(0, 0, 0, 0.98) 95%);
   }

   .cinema-lights-down .mini-marquee-board,
   .cinema-lights-down header {
     opacity: 0.15;
     filter: brightness(0.5);
   }
   ```
2. In `src/app/r/play/play-room.tsx`, ensure `lightsDown` transitions smoothly and illuminates the duel stage with high visual contrast.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/e2e-theatrical.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/r/play/play-room.tsx src/lib/e2e-theatrical.test.ts
git commit -m "feat(duel): enhance dim lights mode with dramatic theatrical blackout and spotlight"
```

---

### Task 13: Full Regression Sweep & Verification

**Files:**
- Test: All suites across `src/`

- [ ] **Step 1: Run full Vitest test suite**

Run: `npm test`
Expected: All tests pass with zero errors.

- [ ] **Step 2: Run Next.js production build check**

Run: `npm run build`
Expected: Successful build with 0 TypeScript or lint errors.

- [ ] **Step 3: Commit all verified artifacts**

```bash
git commit --allow-empty -m "chore: verified full test suite and build after bug fixes"
```
