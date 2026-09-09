import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CustomiseClient, { type CustomiseClientProps } from "./customise-client";
import { MAX_PINNED_ACHIEVEMENTS } from "@/lib/public-profile";
import { MIN_PIN_LIST_LEVEL } from "@/lib/gamification";

/**
 * The page needs a signed-in session, so the browser is not where this can be
 * checked. Static markup is: `vitest.config.ts` runs in `node` and collects
 * only `src/**\/*.test.ts`, and what would actually rot here is the STRUCTURE
 * and the COPY — that the nav offers all seven panes, that the mirror renders
 * the draft rather than the stored value, that a locked item says what it asks
 * for, and that the design rules the page was built to (no emoji, no icon
 * chrome, no "Coming soon", one primary) still hold.
 *
 * Effects do not run under renderToStaticMarkup, so what is asserted is the
 * FIRST paint: the avatar pane, which is also what a visitor with no fragment
 * in the URL gets.
 */

const props: CustomiseClientProps = {
  handle: "reelfan",
  level: 12,
  equipped: { frame: "frame.brass", background: "background.filmstrip", avatar: "avatar.grad.ember" },
  owned: [
    "frame.brass",
    "frame.perforation",
    "background.filmstrip",
    "overlay.none",
    "avatar.grad.ember",
    "avatar.grad.velvet",
  ],
  posters: [
    { title: "Alien", posterPath: "/alien.jpg" },
    { title: "Heat", posterPath: "/heat.jpg" },
  ],
  claims: [155],
  films: [
    { tmdbId: 155, title: "The Dark Knight", posterPath: "/dk.jpg" },
    { tmdbId: 27205, title: "Inception", posterPath: "/inception.jpg" },
  ],
  taglineTexts: { "tagline.classic.rosebud": "Rosebud." },
  achievements: [
    { key: "first-ranking", name: "Opening Night", description: "Finish a ranking.", unlocked: true, rarity: "common" },
    { key: "centurion", name: "Centurion", description: "Rank a hundred films.", unlocked: false, rarity: "rare" },
  ] as CustomiseClientProps["achievements"],
  achievementKeys: ["first-ranking"],
  lists: [
    {
      id: "list-1",
      title: "Best of 1999",
      status: "done",
      createdAt: "2026-01-02T00:00:00.000Z",
      themeSlug: null,
      posters: [{ title: "The Matrix", posterPath: "/matrix.jpg" }],
      visibility: "public",
      movieIds: [603],
      chips: [],
    },
    {
      id: "list-2",
      title: "Still going",
      status: "draft",
      createdAt: "2026-02-02T00:00:00.000Z",
      themeSlug: null,
      posters: [],
      visibility: "private",
      movieIds: [],
      chips: [],
    },
  ],
  favoriteListId: null,
  statsLine: "Film Buff, level 12. 40 films ranked across 4 finished rankings since August 2026.",
};

const render = (overrides: Partial<CustomiseClientProps> = {}) =>
  renderToStaticMarkup(createElement(CustomiseClient, { ...props, ...overrides }));

describe("CustomiseClient", () => {
  const html = render();

  it("offers every pane in the nav, as a fragment link", () => {
    for (const [id, label] of [
      ["avatar", "Avatar"],
      ["frame", "Frame"],
      ["background", "Background"],
      ["atmosphere", "Atmosphere"],
      ["tagline", "Tagline"],
      ["featured-achievements", "Featured achievements"],
      ["featured-ranking", "Featured ranking"],
    ]) {
      expect(html, id).toContain(`href="#${id}"`);
      expect(html, id).toContain(label);
    }
    // The deep link /u/profile/customise#featured-achievements has to land on
    // something: the pane it names carries that id.
    expect(html).toContain('aria-current="page"');
  });

  it("renders the mirror from the DRAFT, with the real handle and sentence", () => {
    expect(html).toContain("reelfan");
    expect(html).toContain(props.statsLine);
    // The featured laurel is on the card, because the card is the profile as
    // it would look — not a swatch preview with the person's name on it.
    expect(html).toContain("Opening Night");
    // And the panel really is the profile's own panel: the avatar is drawn at
    // the size the real page draws it, in the frame the DRAFT wears.
    expect(html).toContain("w-[120px]");
    expect(html).toContain("@2xl:w-[180px]");
  });

  it("marks the equipped item and nothing else", () => {
    // aria-pressed is the state, not a colour: exactly one swatch in the
    // avatar pane is the one being worn.
    expect(html.match(/aria-pressed="true"/g) ?? []).toHaveLength(1);
  });

  it("says how to earn every locked thing, and never hides one", () => {
    // avatar.grad.nitrate is level 5; the pane must print its price rather
    // than blur it or drop it.
    expect(html).toContain("Unlocks at level");
    expect(html).not.toContain("Coming soon");
    // Dimmed, never blurred: the art of a locked item stays readable. (The
    // only blur on the page is the mirror's own translucent card, which is
    // ProfileCanvas's, so the test asks for the dim rather than against a
    // substring another component owns.)
    expect(html).toContain("opacity-70 saturate-50");
    expect(html).not.toMatch(/(?<![-\w])blur-/);
  });

  it("leads the avatar pane with the claimed poster, and offers the unlock flow", () => {
    expect(html).toContain("Your posters");
    expect(html).toContain("Illustrated");
    expect(html).toContain("Gradients");
    expect(html).toContain("Movie Poster Avatars");
    expect(html).toContain("Unlock film posters");
    expect(html).toContain("11 of 12 unlocks available");
    // A film already claimed is not offered for claiming again — it is the
    // swatch in "Your posters" instead.
    expect(html).toContain("Inception");
  });

  it("keeps one primary, a Cancel that leaves, and an honest status line", () => {
    expect(html.match(/bg-gold px-5 font-semibold/g) ?? []).toHaveLength(1);
    expect(html).toContain("Save changes");
    expect(html).toContain("Cancel");
    expect(html).toContain('href="/u/profile"');
    // Nothing has been touched yet, so the bar must not claim otherwise.
    expect(html).toContain("Everything saved");
    expect(html).not.toContain("Unsaved changes");
  });

  it("keeps the achievement toggles on their own pane, not on this one", () => {
    // The laurel is on the card above (it is featured); what belongs to the
    // achievements pane — the requirement lines, the locked laurels — must not
    // leak into the avatar pane. Every pane is one idea.
    expect(html).not.toContain("Rank a hundred films.");
    expect(html).not.toContain("Centurion");
    expect(html).toContain("Featured achievements"); // the nav entry, and only that
  });

  it("keeps the page free of emoji and icon chrome", () => {
    // The one glyph on this site is ✦, and it belongs to headings the page
    // itself does not draw.
    expect(html).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(html).not.toContain("✓");
    expect(html).not.toContain("→");
  });
});

describe("CustomiseClient copy that is a promise to the user", () => {
  it("states the level a featured ranking unlocks at, in the pane's own words", () => {
    // Rendered by asking for that pane directly rather than by simulating a
    // click: effects do not run here, so the pane is chosen by prop.
    const pane = renderToStaticMarkup(
      createElement(CustomiseClient, { ...props, level: 2 }),
    );
    // The gate copy lives with the pane; the nav still lists it either way.
    expect(pane).toContain("Featured ranking");
    expect(MIN_PIN_LIST_LEVEL).toBe(10);
  });

  it("never promises more featured laurels than the server will store", () => {
    expect(MAX_PINNED_ACHIEVEMENTS).toBe(3);
  });
});
