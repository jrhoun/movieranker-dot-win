// Referral & Invite Tracking
// Users earn +15 XP (3 Career Levels) when an invited friend registers and completes their first ranking.

import type { SupabaseClient } from "@supabase/supabase-js";
import { REFERRAL_XP_BONUS } from "./gamification";

export { REFERRAL_XP_BONUS };

export interface ReferralStats {
  /** Count of referred friends who have completed at least 1 ranking (qualifies for XP). */
  activeReferrals: number;
  /** Total count of friends who have registered through this user's link. */
  totalReferred: number;
  /** Bonus XP earned from active referrals. */
  bonusXp: number;
}

/**
 * Resolve a referral code (handle or user ID) to the referrer's user UUID.
 * Returns null if not found or invalid.
 */
export async function resolveReferrerId(
  supabase: SupabaseClient,
  rawRef: string | null | undefined,
): Promise<string | null> {
  if (!rawRef) return null;
  const clean = rawRef.trim().replace(/^@/, "").toLowerCase();
  if (!clean || clean.length > 50) return null;

  // Try matching handle first
  const { data: byHandle } = await supabase
    .from("profiles")
    .select("id")
    .ilike("handle", clean)
    .maybeSingle<{ id: string }>();

  if (byHandle?.id) return byHandle.id;

  // If handle not matched, check if it is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    const { data: byId } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", clean)
      .maybeSingle<{ id: string }>();
    if (byId?.id) return byId.id;
  }

  return null;
}

/**
 * Calculate active and total referrals for a user.
 * Combines direct profile referrals with claimed list participant referrals.
 * An active referral is any referred user who has published at least 1 'done' list.
 */
export async function getReferralStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<ReferralStats> {
  // 1. Direct profile referrals (users whose profiles.referred_by = userId)
  const { data: directRows } = await supabase
    .from("profiles")
    .select("id")
    .eq("referred_by", userId);

  const directUserIds = (directRows ?? []).map((r) => r.id as string);

  // 2. Participant claim attributions on lists owned by userId
  const { data: userLists } = await supabase
    .from("lists")
    .select("id")
    .eq("owner_id", userId);

  const listIds = (userLists ?? []).map((l) => l.id as string);

  const { data: attrRows } = listIds.length > 0
    ? await supabase
        .from("participant_attributions")
        .select("user_id")
        .in("list_id", listIds)
    : { data: [] };

  const participantUserIds = (attrRows ?? [])
    .map((a) => a.user_id as string)
    .filter((id) => Boolean(id) && id !== userId);

  // Deduplicated pool of all friends who joined / participated through this user
  const allReferredIds = [...new Set([...directUserIds, ...participantUserIds])];

  if (allReferredIds.length === 0) {
    return {
      activeReferrals: 0,
      totalReferred: 0,
      bonusXp: 0,
    };
  }

  // Check which referred users have completed at least 1 ranking
  const { data: doneLists } = await supabase
    .from("lists")
    .select("owner_id")
    .in("owner_id", allReferredIds)
    .eq("status", "done");

  const activeUserSet = new Set((doneLists ?? []).map((l) => l.owner_id as string));
  const activeReferrals = allReferredIds.filter((id) => activeUserSet.has(id)).length;

  return {
    activeReferrals,
    totalReferred: allReferredIds.length,
    bonusXp: activeReferrals * REFERRAL_XP_BONUS,
  };
}
