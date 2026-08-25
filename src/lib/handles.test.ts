import { describe, expect, it } from "vitest";
import {
  checkHandle,
  isProfane,
  isReserved,
  isValidHandle,
  normalizeHandle,
} from "./handles";

describe("normalizeHandle", () => {
  it("lowercases and trims", () => {
    expect(normalizeHandle("  CinePhile_99  ")).toBe("cinephile_99");
  });
});

describe("isValidHandle", () => {
  it("accepts 3-20 lowercase letters, numbers, _ or -", () => {
    expect(isValidHandle("abc")).toBe(true);
    expect(isValidHandle("a-b_c_9")).toBe(true);
    expect(isValidHandle("a".repeat(20))).toBe(true);
  });

  it("rejects too short/long, uppercase leftovers, spaces, symbols", () => {
    expect(isValidHandle("ab")).toBe(false);
    expect(isValidHandle("a".repeat(21))).toBe(false);
    expect(isValidHandle("Cinephile")).toBe(false);
    expect(isValidHandle("has space")).toBe(false);
    expect(isValidHandle("no!bang")).toBe(false);
    expect(isValidHandle("")).toBe(false);
  });
});

describe("isReserved", () => {
  it("matches the RESERVED set case-insensitively after normalize", () => {
    expect(isReserved("u")).toBe(true);
    expect(isReserved("admin")).toBe(true);
    expect(isReserved("moderator")).toBe(true);
    expect(isReserved("filmfan")).toBe(false);
  });
});

describe("isProfane", () => {
  it("blocks obvious vulgar terms", () => {
    for (const h of ["shit", "fuckyou", "asshole", "bitch"]) {
      expect(isProfane(h)).toBe(true);
    }
  });

  it("passes clean handles", () => {
    for (const h of ["filmfan", "moviebuff-7", "classic_rock", "bassline"]) {
      expect(isProfane(h)).toBe(false);
    }
  });

  it("catches leetspeak variants", () => {
    // digits fold: 0->o 1->i 3->e 4->a 5->s 7->t
    expect(isProfane("sh1t")).toBe(true);
    expect(isProfane("f4gg0t")).toBe(true);
    expect(isProfane("b17ch")).toBe(true);
    expect(isProfane("5hit")).toBe(true);
    expect(isProfane("d1ckhead")).toBe(true);
    // symbol folds: @->a $->s
    expect(isProfane("@sshole")).toBe(true);
    expect(isProfane("a$$hole")).toBe(true);
    expect(isProfane("$hit")).toBe(true);
  });

  it("catches vulgar substrings inside longer handles", () => {
    expect(isProfane("myshitlist")).toBe(true);
    expect(isProfane("bigdickenergy")).toBe(true);
    expect(isProfane("xX_fuck_Xx99")).toBe(true);
  });
});

describe("checkHandle", () => {
  it("normalizes then validates", () => {
    const r = checkHandle("  MovieBuff-7 ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.handle).toBe("moviebuff-7");
  });

  it("normalization feeds the reserved check", () => {
    expect(checkHandle(" Admin ")).toEqual({ ok: false, reason: "reserved" });
    // "ME" normalizes to "me" (2 chars) -> invalid wins before the reserved check
    expect(checkHandle("ME")).toEqual({ ok: false, reason: "invalid" });
    expect(checkHandle("ab")).toEqual({ ok: false, reason: "invalid" });
  });

  it("flags reserved handles", () => {
    expect(checkHandle("API")).toEqual({ ok: false, reason: "reserved" });
    expect(checkHandle("settings")).toEqual({ ok: false, reason: "reserved" });
  });

  it("flags profanity (including leet spellings) before shape checks", () => {
    expect(checkHandle("sh1t")).toEqual({ ok: false, reason: "profane" });
    // @/$ fail the regex but must still report as profane, not invalid
    expect(checkHandle("a$$hole")).toEqual({ ok: false, reason: "profane" });
  });
});
