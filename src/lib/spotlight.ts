// Pure helper for the homepage Community Spotlight. Lives apart from
// trending.ts on purpose: that module imports the server Supabase client
// (next/headers), and this one is imported by the client-side home-client.tsx.
import type { TrendingListSummary } from "@/lib/trending";

export type SpotlightSlot<T = TrendingListSummary> =
  | { type: "list"; list: T }
  | { type: "cta" };

/**
 * Calculates Community Spotlight display slots from trending lists.
 *
 * Threshold logic:
 * - 0 lists: returns [] (true-zero case, caller renders blurred skeleton)
 * - 1 list: [list, cta] (fills remaining slots up to 3 with a single CTA card)
 * - 2 lists: [list, list, cta] (fills remaining slots up to 3 with a single CTA card)
 * - 3+ lists: [list, list, list, ...] (all real lists, no CTA card)
 */
export function spotlightSlots<T = TrendingListSummary>(
  lists?: T[] | null,
): SpotlightSlot<T>[] {
  if (!lists || lists.length === 0) {
    return [];
  }
  const slots: SpotlightSlot<T>[] = lists.map((list) => ({
    type: "list" as const,
    list,
  }));
  if (lists.length < 3) {
    slots.push({ type: "cta" as const });
  }
  return slots;
}

