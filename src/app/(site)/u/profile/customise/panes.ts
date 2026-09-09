import { CC0_STYLES, posterAvatarTmdbId } from "@/lib/cosmetics/avatars";
import { itemsForSlot } from "@/lib/cosmetics/catalogue";
import { collectionCategories } from "@/lib/cosmetics/categories";
import type { CosmeticItem, TaglineItem } from "@/lib/cosmetics/types";

/**
 * How the dressing room is divided — the left nav, and the rows inside each
 * pane.
 *
 * Pure data, no JSX: the page is a client component and this is what a test
 * can hold. It also keeps the one claim worth asserting testable — that every
 * item in the catalogue appears in exactly one row of exactly one pane. The
 * dialog this page replaced had the same claim and no way to check it, so a
 * cosmetic could be owned and findable nowhere.
 */

export const SECTIONS = [
  { id: "avatar", label: "Avatar" },
  { id: "frame", label: "Frame" },
  { id: "background", label: "Background" },
  { id: "atmosphere", label: "Atmosphere" },
  { id: "tagline", label: "Tagline" },
  { id: "featured-achievements", label: "Featured achievements" },
  { id: "featured-ranking", label: "Featured ranking" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const DEFAULT_SECTION: SectionId = "avatar";

/** Whether a string is one of the seven pane ids (used to read the URL hash). */
export function isSectionId(value: string): value is SectionId {
  return SECTIONS.some((s) => s.id === value);
}

export interface ItemGroup {
  /** Stable React key; also how a test names a missing row. */
  key: string;
  /** The row's own heading. */
  title: string;
  /**
   * A heading ABOVE the row, printed once for a run of consecutive groups
   * that share it — "Illustrated" over six styles of drawn avatar. Absent for
   * a row that is its own idea.
   */
  section?: string;
  items: CosmeticItem[];
}

const titleCase = (s: string) =>
  s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

/**
 * Frames, backgrounds and overlays, grouped by WHAT THEY COST rather than by
 * rarity or catalogue order.
 *
 * A wardrobe answers two questions: what can I wear now, and what do I have to
 * do. So the things you own lead, and everything else is filed under the act
 * that earns it, cheapest level first. Nothing is hidden and nothing is
 * blurred — a locked row still draws its art and prints its price.
 *
 * `drop`, `marquee` and `purchase` share a final row: their prices are neither
 * a number nor an achievement name, and three rows of one item each would be
 * filing for its own sake. Each item still carries its own sentence.
 */
export function unlockGroups(items: CosmeticItem[], owned: ReadonlySet<string>): ItemGroup[] {
  const mine = items.filter((i) => owned.has(i.id));
  const rest = items.filter((i) => !owned.has(i.id));
  const byLevel = rest
    .filter((i) => i.unlock.kind === "level")
    .slice()
    .sort((a, b) =>
      a.unlock.kind === "level" && b.unlock.kind === "level"
        ? a.unlock.level - b.unlock.level
        : 0,
    );
  const byAchievement = rest.filter((i) => i.unlock.kind === "challenge");
  const other = rest.filter(
    (i) => i.unlock.kind !== "level" && i.unlock.kind !== "challenge",
  );

  // Keys carry the slot: the four row names repeat in every pane, and a key
  // has to identify a row across the whole wardrobe, not just within one.
  const slot = items[0]?.slot ?? "item";

  return [
    { key: `${slot}-yours`, title: "Yours", items: mine },
    { key: `${slot}-by-level`, title: "Unlock by level", items: byLevel },
    { key: `${slot}-by-achievement`, title: "Unlock by achievement", items: byAchievement },
    { key: `${slot}-other`, title: "Still to earn", items: other },
  ].filter((g) => g.items.length > 0);
}

/**
 * Avatars, grouped by WHAT THEY ARE — a claimed poster, a drawn face, a
 * gradient — because that is the only division a person browsing them cares
 * about. Ownership is said per item instead: unlike a frame, a locked avatar
 * sitting beside its unlocked siblings is the whole argument for reaching the
 * next level, and splitting the six styles by price would scatter every style
 * across three rows.
 *
 * `claimed` carries poster avatars, which are per-user and never in CATALOGUE.
 * They lead: a claim costs an allowance and is permanent, so one the user
 * cannot see is one they will forget they spent.
 */
export function avatarGroups(claimed: CosmeticItem[] = []): ItemGroup[] {
  const avatars = itemsForSlot("avatar");
  const gradients = avatars.filter((i) => i.id.startsWith("avatar.grad."));
  const drawn = avatars.filter((i) => i.id.startsWith("avatar.gen."));

  // Grouped by DiceBear style, in the order the styles first appear, so the
  // rows follow the manifest rather than an alphabet nobody chose.
  const byStyle = new Map<string, CosmeticItem[]>();
  for (const item of drawn) {
    const style = CC0_STYLES.find((s) => item.id.startsWith(`avatar.gen.${s}-`));
    // An id whose style is not in CC0_STYLES cannot be filed by style, and
    // dropping it would make it unfindable — it joins a row of its own name.
    const key = style ?? "other";
    byStyle.set(key, [...(byStyle.get(key) ?? []), item]);
  }

  return [
    {
      key: "posters",
      title: "Your posters",
      items: claimed.filter((i) => posterAvatarTmdbId(i.id) !== null),
    },
    ...[...byStyle.entries()].map(([style, items]) => ({
      key: `illustrated-${style}`,
      section: "Illustrated",
      title: style === "other" ? "Promotional" : titleCase(style),
      items,
    })),
    { key: "gradients", title: "Gradients", items: gradients },
  ].filter((g) => g.items.length > 0);
}

/**
 * Taglines, split by set.
 *
 * Read off `collectionCategories()` rather than re-derived here: that builder
 * exists precisely so the browsing division is written once (see its own note
 * — the test that restated the expression agreed with itself by construction).
 * Only the SET NAME is kept; its "Taglines · The 80s" title is right for a tab
 * strip and wrong here, where eight headings sharing a prefix are a prefix
 * rather than a heading.
 */
export function taglineGroups(): ItemGroup[] {
  return collectionCategories()
    .filter((c) => c.items[0]?.slot === "tagline")
    .map((c) => ({
      key: c.key,
      // Read off the first ITEM, never sliced back out of the title: the
      // title's shape is the builder's business.
      title: (c.items[0] as TaglineItem).set,
      items: c.items,
    }));
}
