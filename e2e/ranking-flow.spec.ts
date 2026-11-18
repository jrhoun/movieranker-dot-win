import { expect, test, type Page, type TestInfo } from "@playwright/test";

// Core signed-out flow: search, tray, start, vote to the end, finish screen.
// Stops at the "Save your ranking" button, so it needs no Supabase and no real
// movie API. /api/search is stubbed. The server under test cannot make outbound
// requests (e2e/no-outbound-fetch.cjs) and the browser may only reach the app's
// own origin (everything else is stubbed or aborted and counted). `npm run e2e`
// as a whole is not offline: `next build` downloads Google Fonts.
// Runs at 360x800 and 1440x900.

// posterPath null: the card draws its own placeholder, so no image request.
const FILMS = [
  { tmdbId: 9001, title: "Alpha Harbor", posterPath: null, releaseYear: 1991 },
  { tmdbId: 9002, title: "Bravo Station", posterPath: null, releaseYear: 2003 },
  { tmdbId: 9003, title: "Cedar Lane", posterPath: null, releaseYear: 2015 },
];

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// Phone project = a narrow viewport, whatever the project is called.
const isPhone = (testInfo: TestInfo) => (testInfo.project.use.viewport?.width ?? Infinity) <= 480;

// Overflow currently measured at 360px on two screens (known bugs, see the
// KNOWN BUG tests at the bottom). The main flow tolerates exactly this much, so
// a new overflow still fails it.
const KNOWN_PHONE_SCROLL = { home: 381, voteStage: 372 };

/**
 * Only the app's own origin is reachable. TMDB poster images get a 1x1 PNG and
 * the Vercel analytics script an empty file; every other URL is recorded in the
 * returned list and aborted. Register this before any other route.
 */
async function isolate(page: Page, testInfo: TestInfo): Promise<string[]> {
  const appHost = new URL(testInfo.project.use.baseURL ?? "").host;
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.host === appHost || url.protocol === "data:") return route.fallback();
    if (url.hostname === "image.tmdb.org") {
      return route.fulfill({ contentType: "image/png", body: PIXEL });
    }
    external.push(url.href);
    return route.abort();
  });
  await page.route("**/_vercel/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );
  return external;
}

type StoredSession = { history?: unknown[]; finishedAt?: number; movies: { title: string }[] };

async function storedSession(page: Page): Promise<StoredSession | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("mr-session");
    return raw ? JSON.parse(raw) : null;
  });
}

const votesSaved = async (page: Page) => (await storedSession(page))?.history?.length ?? 0;

test("rank three films from search to the finish screen", async ({ page }, testInfo) => {
  const phone = isPhone(testInfo);
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  const external = await isolate(page, testInfo);
  await page.route("**/api/search**", (route) =>
    route.fulfill({ json: { results: FILMS } }),
  );

  // maxScroll: the widest scrollWidth tolerated; default is no horizontal scroll.
  async function checkScreen(name: string, maxScroll?: number) {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth, `${name}: horizontal scroll`).toBeLessThanOrEqual(
      maxScroll ?? overflow.clientWidth,
    );
    expect(consoleErrors, `${name}: console errors`).toEqual([]);
  }

  // Home: search by title and add three films to the tray.
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: /search movies by title/i });
  await search.fill("harbor");
  for (const f of FILMS) {
    await page.getByRole("button", { name: `Add ${f.title} (${f.releaseYear})` }).click();
  }
  const start = page.getByRole("button", { name: /start ranking \(3\)/i });
  await expect(start).toBeVisible();
  await checkScreen("home with tray", phone ? KNOWN_PHONE_SCROLL.home : undefined);

  // Start: lands on /r/play with a saved session of three films and no votes.
  await start.click();
  await expect(page).toHaveURL(/\/r\/play$/);
  const pick = page.getByRole("button", { name: /^Pick .* as the winner$/ });
  await expect(pick).toHaveCount(2);
  expect((await storedSession(page))?.movies).toHaveLength(3);
  expect(await votesSaved(page)).toBe(0);
  await checkScreen("play, first pair", phone ? KNOWN_PHONE_SCROLL.voteStage : undefined);

  // Double-tap one poster. The room does not drop a tap that lands inside the
  // 380ms settle lock: it queues one and replays it against the NEXT pair (see
  // the comment in MatchupStage.tsx). So a double-tap makes two votes, one per
  // pair, and the first pair is never voted twice. (docs/qa-checklist.md item 13
  // still says the second tap is ignored; that text is out of date.)
  // Depends on MatchupStage marking the losing poster column aria-hidden for
  // the 380ms settle; if that markup changes, this wait must change with it.
  const settling = page.locator('[aria-hidden="true"]:has(button[aria-label^="Pick"])');
  await pick.first().dblclick();
  await expect.poll(() => votesSaved(page)).toBe(2);
  await expect(settling).toHaveCount(0);
  const history = ((await storedSession(page))?.history ?? []) as [number, number][];
  const pairKey = ([a, b]: [number, number]) => [a, b].sort().join("-");
  expect(new Set(history.map(pairKey)).size, "same pair voted twice").toBe(history.length);
  await checkScreen("play, after double-tap", phone ? KNOWN_PHONE_SCROLL.voteStage : undefined);

  // Vote through to the end. After each vote, wait for the settle lock to
  // release so the next tap is a fresh vote.
  const finish = page.getByRole("heading", { name: /consensus reached|early result/i });
  let votes = 2;
  for (let i = 0; i < 20; i++) {
    await expect(settling).toHaveCount(0);
    await expect(pick.first().or(finish)).toBeVisible();
    if (await finish.isVisible()) break;
    await pick.first().click();
    votes += 1;
    await expect.poll(() => votesSaved(page)).toBe(votes);
  }

  // Finish screen: the save prompt, no sign-in attempted.
  await expect(finish).toBeVisible();
  await expect(page.getByRole("button", { name: /save your ranking/i })).toBeVisible();
  await checkScreen("finish");

  // The saved session holds every vote and the finish stamp.
  await expect.poll(async () => (await storedSession(page))?.finishedAt).toBeGreaterThan(0);
  expect(await votesSaved(page)).toBe(votes);

  expect(external, "requests that tried to leave the machine").toEqual([]);
});

// KNOWN BUG tests. They assert the bug as it is today, so they go red when the
// product is fixed (delete the test then and drop the tolerance in
// KNOWN_PHONE_SCROLL), and red when their setup stops matching the page.

// Signed out at 360 wide, the header's "Sign in" link ends at 381px, past the
// viewport, so pages under the (site) layout scroll sideways. /r/play has its
// own header and is not affected by this one.
test("KNOWN BUG: signed-out header overflows a 360px screen", async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), "phone width only");
  await isolate(page, testInfo);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Site Navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "known bug: remove this test when the header is fixed").toBeGreaterThan(
    clientWidth,
  );
});

// At 360 wide the vote stage scrolls sideways (scrollWidth 372). The decorative
// `.stage-spotlight` div in play-room.tsx is absolute with -inset-x-6 and
// nothing clips it.
test("KNOWN BUG: vote stage overflows a 360px screen", async ({ page }, testInfo) => {
  test.skip(!isPhone(testInfo), "phone width only");
  await isolate(page, testInfo);
  await page.goto("/");
  await page.evaluate((films) => {
    const movies = films.map((f) => ({ ...f, tagline: null, elo: 1000, comparisons: 0, parked: false }));
    localStorage.setItem(
      "mr-session",
      JSON.stringify({ title: "T", participants: [], movies, votesSinceOrderChange: 0, nudgeShown: false }),
    );
  }, FILMS);
  await page.goto("/r/play");
  await expect(page.getByRole("button", { name: /^Pick .* as the winner$/ })).toHaveCount(2);
  await expect(page.getByRole("progressbar", { name: "Ranking progress" })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth, "known bug: remove this test when the vote stage is fixed").toBeGreaterThan(
    clientWidth,
  );
});
