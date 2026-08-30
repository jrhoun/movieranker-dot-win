import { describe, expect, it } from "vitest";
import { CLAIMS_PER_LEVEL, claimAllowance, parseAvatarClaims } from "./claims";

describe("claims", () => {
  describe("claimAllowance", () => {
    it("derives allowance from level with default drop claims", () => {
      expect(claimAllowance(1)).toBe(1);
      expect(claimAllowance(5)).toBe(5 * CLAIMS_PER_LEVEL);
      expect(claimAllowance(20)).toBe(20 * CLAIMS_PER_LEVEL);
    });

    it("adds bonus drop claims to the level allowance", () => {
      expect(claimAllowance(1, 2)).toBe(3);
      expect(claimAllowance(10, 5)).toBe(15);
    });

    it("handles zero and negative inputs gracefully", () => {
      expect(claimAllowance(0)).toBe(0);
      expect(claimAllowance(-5)).toBe(0);
      expect(claimAllowance(5, -2)).toBe(5);
    });

    it("floors non-integer values", () => {
      expect(claimAllowance(4.7, 2.3)).toBe(6);
    });
  });

  describe("parseAvatarClaims", () => {
    it("parses valid array of tmdb ids", () => {
      expect(parseAvatarClaims([155, 680, 27205])).toEqual([155, 680, 27205]);
      expect(parseAvatarClaims([])).toEqual([]);
    });

    it("rejects non-array inputs", () => {
      expect(parseAvatarClaims(null)).toBeNull();
      expect(parseAvatarClaims(undefined)).toBeNull();
      expect(parseAvatarClaims(155)).toBeNull();
      expect(parseAvatarClaims("155")).toBeNull();
      expect(parseAvatarClaims({})).toBeNull();
    });

    it("rejects non-integer and non-positive numbers", () => {
      expect(parseAvatarClaims([0])).toBeNull();
      expect(parseAvatarClaims([-155])).toBeNull();
      expect(parseAvatarClaims([155.5])).toBeNull();
      expect(parseAvatarClaims([NaN])).toBeNull();
      expect(parseAvatarClaims([Infinity])).toBeNull();
    });

    it("rejects non-number elements", () => {
      expect(parseAvatarClaims(["155"])).toBeNull();
      expect(parseAvatarClaims([155, "680"])).toBeNull();
      expect(parseAvatarClaims([null])).toBeNull();
      expect(parseAvatarClaims([undefined])).toBeNull();
    });

    it("rejects duplicates", () => {
      expect(parseAvatarClaims([155, 155])).toBeNull();
      expect(parseAvatarClaims([155, 680, 155])).toBeNull();
    });
  });
});
