import { expect, test, type Page } from "@playwright/test";

// Core signed-out flow: search, tray, start, vote to the end, finish screen.
// Stops at the "Save your ranking" button, so it needs no Supabase and no real
// movie API. /api/search is stubbed; the server cannot make outbound requests
// (see e2e/no-outbound-fetch.cjs). Runs at 360x800 and 1440x900.

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

type StoredSession = { history?: unknown[]; finishedAt?: number; movies: { title: string }[] };

async function storedSession(page: Page): Promise<StoredSession | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem("mr-session");
    return raw ? JSON.parse(raw) : null;
  });
}

const votesSaved = async (page: Page) => (await storedSession(page))?.history?.length ?? 0;

test("rank three films from search to the finish screen", async ({ page }, testInfo) => {
  const phone = testInfo.project.name.startsWith("phone");
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // Nothing leaves the machine: stub search, answer analytics, abort the rest.
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.protocol === "data:") return route.fallback();
    // The home hero's fallback posters come from the TMDB image host. Answer
    // with a 1x1 PNG so the page loads cleanly; every other host is a leak.
    if (url.hostname === "image.tmdb.org") {
      return route.fulfill({ contentType: "image/png", body: PIXEL });
    }
    external.push(url.href);
    return route.abort();
  });
  await page.route("**/api/search**", (route) =>
    route.fulfill({ json: { results: FILMS } }),
  );
  await page.route("**/_vercel/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
  );

  async function checkScreen(name: string, { scroll = true } = {}) {
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (scroll) {
      expect(overflow.scrollWidth, `${name}: horizontal scroll`).toBeLessThanOrEqual(
        overflow.clientWidth,
      );
    }
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
  // The phone header overflows on this screen; see the known-bug test below.
  await checkScreen("home with tray", { scroll: !phone });

  // Start: lands on /r/play with a saved session of three films and no votes.
  await start.click();
  await expect(page).toHaveURL(/\/r\/play$/);
  const pick = page.getByRole("button", { name: /^Pick .* as the winner$/ });
  await expect(pick).toHaveCount(2);
  expect((await storedSession(page))?.movies).toHaveLength(3);
  expect(await votesSaved(page)).toBe(0);
  // The phone vote stage overflows; see the known-bug test below.
  await checkScreen("play, first pair", { scroll: !phone });

  // Double-tap one poster. The room does not drop a tap that lands inside the
  // 380ms settle lock: it queues one and replays it against the NEXT pair (see
  // the comment in MatchupStage.tsx). So a double-tap makes two votes, one per
  // pair, and the first pair is never voted twice. (docs/qa-checklist.md item 13
  // still says the second tap is ignored; that text is out of date.)
  const settling = page.locator('[aria-hidden="true"]:has(button[aria-label^="Pick"])');
  await pick.first().dblclick();
  await expect.poll(() => votesSaved(page)).toBe(2);
  await expect(settling).toHaveCount(0);
  const history = ((await storedSession(page))?.history ?? []) as [number, number][];
  const pairKey = ([a, b]: [number, number]) => [a, b].sort().join("-");
  expect(new Set(history.map(pairKey)).size, "same pair voted twice").toBe(history.length);
  await checkScreen("play, after double-tap", { scroll: !phone });

  // Vote through to the end. After each vote, wait for the settle lock to
  // release (no aria-hidden column left) so the next tap is a fresh vote.
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

// Known bug, not fixed here: signed out at 360 wide, "Sign in / Join" in the
// site header ends at 381px, so every page scrolls sideways. Remove test.fail()
// when the header is fixed.
test("signed-out header fits a 360px screen", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("phone"), "phone width only");
  test.fail(true, "header overflows at 360px: scrollWidth 381 > 360");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fallback()
      : route.fulfill({ contentType: "image/png", body: PIXEL }),
  );
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Site Navigation" })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

// Known bug, not fixed here: at 360 wide the vote stage scrolls sideways
// (scrollWidth 372). The decorative `.stage-spotlight` div in play-room.tsx is
// absolute with -inset-x-6 and nothing clips it. Remove test.fail() when fixed.
test("vote stage fits a 360px screen", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("phone"), "phone width only");
  test.fail(true, "stage-spotlight overflows at 360px: scrollWidth 372 > 360");
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.fallback()
      : route.fulfill({ contentType: "image/png", body: PIXEL }),
  );
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
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
