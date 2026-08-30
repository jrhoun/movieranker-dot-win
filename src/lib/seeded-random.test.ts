import { describe, expect, it } from "vitest";
import { hashString, mulberry32 } from "./seeded-random";

describe("hashString", () => {
  it("is stable for the same input", () => {
    expect(hashString("secretly-the-same-story")).toBe(hashString("secretly-the-same-story"));
  });

  it("differs for different inputs", () => {
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});

describe("mulberry32", () => {
  it("produces the same sequence from the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays within [0, 1)", () => {
    const rand = mulberry32(7);
    for (let i = 0; i < 500; i += 1) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
