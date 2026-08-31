import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every way out of a ranking must go through the same door.
 *
 * The play screen has two exits sitting inches apart: an Exit button that opens
 * a three-way confirm, and the MovieRanker wordmark. The wordmark was a plain
 * `<Link href="/">`, so it left via client-side routing — which never fires
 * `beforeunload`, as the guard in play-room.tsx says in its own comment.
 *
 * Nothing was destroyed by that: votes are written to localStorage and the home
 * page offers to resume. The cost was narrower and quieter. For a SIGNED-IN
 * user, Exit's "Resume later" calls handleDirectSave("draft") and puts the
 * ranking on their account; the wordmark skipped it, leaving the work in one
 * browser's storage, absent from My Lists and gone with site data or a device
 * change. Two exits, two different levels of safety, no way to tell which you
 * were using.
 *
 * Source-read rather than rendered because this file has no component test
 * harness, and the regression being prevented is textual: someone simplifying
 * the wordmark back to a bare link. That reintroduces a silent failure, so it
 * is worth pinning even by this blunt method.
 */
describe("leaving a ranking", () => {
  const raw = readFileSync(join(process.cwd(), "src/app/r/play/play-room.tsx"), "utf8");

  /**
   * Comments stripped before anything is matched. The note explaining this very
   * fix quotes `<Link href="/">` in prose, and the first version of this test
   * matched that instead of the element — reading a comment as if it were the
   * code it describes. Any source-level assertion has to look at code only.
   */
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /**
   * The wordmark link, identified by its CONTENT rather than its href. There is
   * a second `href="/"` link on this page — the "Start one" button shown when
   * there is no session at all — and that one is correctly a plain navigation,
   * so matching on href alone tested the wrong element.
   */
  const wordmarkEl = [...src.matchAll(/<Link[\s\S]*?<\/Link>/g)]
    .map((m) => m[0])
    .find((el) => el.includes("MovieRanker"));

  it("has a wordmark link to find", () => {
    // If the markup were restructured past this matcher, the checks below would
    // silently pass on nothing.
    expect(wordmarkEl, "could not locate the wordmark <Link> in play-room.tsx").toBeDefined();
  });

  /**
   * The whole element, not a slice of its opening tag. Slicing to the first ">"
   * cut the handler off at the "=>" of its own arrow function — the third time
   * a naive pattern in this file measured something other than what it named.
   */
  const el = () => wordmarkEl ?? "";

  it("routes the wordmark through the leave confirm instead of leaving silently", () => {
    expect(
      el(),
      "the wordmark navigates away without opening the leave dialog, so a signed-in user's draft is never offered",
    ).toMatch(/onClick/);
    expect(el()).toMatch(/setExitOpen\(true\)/);
  });

  it("only intercepts when there is something to lose", () => {
    // A confirm on an empty or finished ranking is pure friction: nothing has
    // been voted on, or the work is already saved.
    expect(el()).toMatch(/finished/);
    expect(el()).toMatch(/totalComparisons\(session\) === 0/);
    // preventDefault must sit inside the guard, not above it, or the wordmark
    // stops working entirely on a ranking with no votes yet.
    expect(el()).toMatch(/preventDefault/);
  });

  it("keeps the unload warning for the anonymous case", () => {
    // beforeunload still covers closing the tab and hard navigation, which
    // client-side interception cannot reach.
    expect(src).toMatch(/addEventListener\("beforeunload"/);
  });

  it("still offers a draft save and a discard, distinctly", () => {
    // The three-way choice is the point: the safe default, the save, and the
    // one destructive option — which must remain the ONLY thing that clears.
    expect(src).toMatch(/Keep ranking/);
    expect(src).toMatch(/Resume later/);
    expect(src).toMatch(/Abandon ranking/);
    expect(src).toMatch(/function handleAbandon\(\)\s*\{\s*clearSession\(\)/);
  });
});
