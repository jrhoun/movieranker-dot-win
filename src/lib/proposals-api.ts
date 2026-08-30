/** Shared validation for shortlist theme proposals (POST /api/proposals, tests). */

export interface ProposalBody {
  title?: unknown;
  blurb?: unknown;
  movieIds?: unknown;
}

export type ParsedProposal =
  | { ok: true; value: { title: string; blurb: string; movieIds: number[] } }
  | { ok: false; error: string };

/** Title <=80 chars, optional blurb <=200, movieIds 6-8 valid ints deduped. */
export function parseProposal(body: ProposalBody): ParsedProposal {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 80)
    return { ok: false, error: "title required (max 80 characters)" };

  const blurb = typeof body.blurb === "string" ? body.blurb.trim() : "";
  if (blurb.length > 200)
    return { ok: false, error: "blurb must be at most 200 characters" };

  if (!Array.isArray(body.movieIds))
    return { ok: false, error: "movieIds must be an array" };
  const movieIds = [...new Set(body.movieIds)].filter(
    (v): v is number => Number.isInteger(v),
  );
  if (movieIds.length < 6 || movieIds.length > 8)
    return { ok: false, error: "pick 6 to 8 distinct movies" };

  return { ok: true, value: { title, blurb, movieIds } };
}

/** Whitelist for PATCH status transitions; anything else -> null. */
/**
 * `pending` is accepted so the owner can UNDO a decision.
 *
 * It is a real state change, not a no-op: `getApprovedProposals` reads
 * `status = 'approved'`, so reverting an approval pulls that theme back out of
 * the live shortlist. That is exactly what undoing a mis-click should do, and
 * the route is owner-gated, so the only person who can reach it is the one
 * person entitled to decide.
 */
export function parseProposalStatus(
  raw: unknown,
): "approved" | "rejected" | "pending" | null {
  return raw === "approved" || raw === "rejected" || raw === "pending" ? raw : null;
}

/**
 * Owner gate for admin routes: authenticated user email must equal
 * OWNER_EMAIL. Unset OWNER_EMAIL means the feature has no approver —
 * routes answer 404-style silence.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return !!owner && !!email && email.trim().toLowerCase() === owner;
}
