import { describe, expect, it } from "vitest";
import { flagsFor } from "./moderation";

describe("flagsFor", () => {
  it("returns nothing for ordinary film-list text", () => {
    expect(flagsFor(["Best Noir of the 90s", "Rain, neon, bad decisions.", "with Sam"])).toEqual([]);
  });

  it("names the token that tripped, not just that something did", () => {
    // The admin queue shows this to a person, who then decides. "It matched"
    // with no word attached is not something anyone can act on.
    expect(flagsFor(["totally fuck this"])).toEqual(["fuck"]);
  });

  it("checks every field it is given", () => {
    const hits = flagsFor(["clean title", "clean description", "bastard"]);
    expect(hits).toEqual(["bastard"]);
  });

  it("ignores null and undefined fields", () => {
    expect(flagsFor([null, undefined, "clean"])).toEqual([]);
  });

  it("does not repeat a word that appears more than once", () => {
    expect(flagsFor(["fuck", "fuck again"])).toEqual(["fuck"]);
  });

  it("sees through the leetspeak folding handles already use", () => {
    // 1->i, @->a. The map has no digit for `u`, so "f0ck" folds to "fock" and
    // is NOT caught — a concrete example of why this is a sorting hint and not
    // a filter anyone should trust to be complete.
    expect(flagsFor(["b1tch"]).length).toBeGreaterThan(0);
    expect(flagsFor(["b@stard"]).length).toBeGreaterThan(0);
    expect(flagsFor(["f0ck"])).toEqual([]);
  });

  it("strips surrounding punctuation so a word in prose still matches", () => {
    // "(fuck)" and "fuck." are the normal shapes in a sentence; without
    // trimming, only the bare token would ever be caught.
    expect(flagsFor(["oh (fuck)"])).toEqual(["fuck"]);
    expect(flagsFor(["well, fuck."])).toEqual(["fuck"]);
  });

  it("is tokenised, so an accident of adjacency across words does not match", () => {
    // Checking the whole string would let two innocent words form a hit
    // across the space between them.
    expect(flagsFor(["classic of the genre"])).toEqual([]);
  });
});
