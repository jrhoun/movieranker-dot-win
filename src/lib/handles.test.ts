import { describe, expect, it } from "vitest";
import {
  checkHandle,
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
});
