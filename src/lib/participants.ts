// Real Participants: shape participant chips from lists.participants +
// participant_attributions. Pure so pages and tests share one matcher.

export interface AttributionRow {
  display_name: string;
  user_id: string;
}

export interface PublicProfileRow {
  id: string;
  handle: string;
}

export interface ParticipantChip {
  name: string;
  /** True when an account is bound to this chip (person marker). */
  attributed: boolean;
  /** Handle to link to (/u/<handle>) when that profile is public, else null. */
  handle: string | null;
}

/**
 * Match attributed names to chips case-insensitively (attributions bind to the
 * canonical participant spelling). Links only to visibility='public' profiles.
 */
export function chipParticipants(
  participants: string[],
  attributions: AttributionRow[],
  publicProfiles: PublicProfileRow[],
): ParticipantChip[] {
  const handleByUser = new Map(publicProfiles.map((p) => [p.id, p.handle]));
  const attrByName = new Map(
    attributions.map((a) => [a.display_name.toLowerCase(), a.user_id] as const),
  );
  return participants.map((name) => {
    const userId = attrByName.get(name.toLowerCase());
    return {
      name,
      attributed: userId != null,
      handle: userId ? handleByUser.get(userId) ?? null : null,
    };
  });
}
