import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getReferralStats, resolveReferrerId } from "./referrals";

describe("resolveReferrerId", () => {
  it("returns null for empty or invalid input", async () => {
    const supabase = { from: vi.fn() } as unknown as SupabaseClient;
    expect(await resolveReferrerId(supabase, "")).toBeNull();
    expect(await resolveReferrerId(supabase, null)).toBeNull();
    expect(await resolveReferrerId(supabase, "   ")).toBeNull();
  });

  it("resolves handle to user UUID", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: "user-123" } });
    const ilike = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ ilike });
    const from = vi.fn().mockReturnValue({ select });
    const supabase = { from } as unknown as SupabaseClient;

    const id = await resolveReferrerId(supabase, "@nolanfan");
    expect(id).toBe("user-123");
    expect(ilike).toHaveBeenCalledWith("handle", "nolanfan");
  });
});

describe("getReferralStats", () => {
  it("calculates active referrals when referred users complete lists", async () => {
    const from = vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: "friend-1" }, { id: "friend-2" }],
            }),
          }),
        };
      }
      if (table === "lists") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((field: string) => {
              if (field === "owner_id") {
                return Promise.resolve({ data: [{ id: "my-list-1" }] });
              }
              return Promise.resolve({ data: [] });
            }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ owner_id: "friend-1" }], // friend-1 completed a list
              }),
            }),
          }),
        };
      }
      if (table === "participant_attributions") {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ user_id: "friend-3" }],
            }),
          }),
        };
      }
      return {};
    });

    const supabase = { from } as unknown as SupabaseClient;
    const stats = await getReferralStats(supabase, "user-me");

    expect(stats.totalReferred).toBe(3); // friend-1, friend-2, friend-3
    expect(stats.activeReferrals).toBe(1); // friend-1 completed a list
    expect(stats.bonusXp).toBe(15); // 1 active * 15 XP
  });
});
