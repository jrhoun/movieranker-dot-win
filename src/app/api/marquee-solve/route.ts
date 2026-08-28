import { NextResponse } from "next/server";
import { LIMITS, rateKey, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Records the signed-in user's ONE attempt at a weekly-marquee connection.
 *
 * Two things make the codebreaker achievement honest, and both matter:
 *
 * 1. The server checks the answer. The correct index is code data
 *    (shortlist-themes.ts), so a client that merely asserted "I solved it"
 *    would make the badge forgeable — which is why this endpoint exists at all
 *    instead of the route trusting localStorage.
 *
 * 2. Only the FIRST attempt is recorded. Server-side checking alone was not
 *    enough: the quiz has four options, so a client could POST guessIndex
 *    0,1,2,3 and be guaranteed a "solve". Every attempt — right, wrong, or a
 *    peek at the answer — writes the (user_id, theme_slug) row, and the table's
 *    primary key rejects the second write. One shot, which is what the badge
 *    claims. See supabase/upgrade-2.sql.
 */

/** Postgres unique-violation. Here it means "this user already had their go". */
const UNIQUE_VIOLATION = "23505";

export function isValidSolveRequest(
  body: unknown,
): body is { themeSlug: string; guessIndex: number | null } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return false;
  const b = body as { themeSlug?: unknown; guessIndex?: unknown };
  if (typeof b.themeSlug !== "string" || b.themeSlug.length === 0) return false;
  // null is the "peeked at the answer" attempt: it burns the try and scores false.
  if (b.guessIndex === null) return true;
  return (
    typeof b.guessIndex === "number" &&
    Number.isInteger(b.guessIndex) &&
    b.guessIndex >= 0
  );
}

/** True only when the theme exists, defines a game, and the index matches. */
export function isCorrectGuess(themeSlug: string, guessIndex: number | null): boolean {
  if (guessIndex === null) return false;
  const theme = SHORTLIST_THEMES.find((t) => t.slug === themeSlug);
  if (!theme?.connectionGame) return false;
  return theme.connectionGame.correctIndex === guessIndex;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidSolveRequest(body)) {
    return NextResponse.json({ error: "themeSlug and guessIndex are required" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "sign in to record a solve" }, { status: 401 });
  }

  // Defence in depth. The primary key is what actually caps attempts; this just
  // keeps a script from hammering the table with doomed inserts.
  const rl = rateLimit(
    await rateKey("marqueeSolve", request, auth.user.id),
    LIMITS.marqueeSolve,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  const correct = isCorrectGuess(body.themeSlug, body.guessIndex);

  // Insert, never upsert: an upsert would let a wrong first attempt be
  // overwritten by a right second one, which is the hole this closes.
  const { error } = await supabase
    .from("marquee_solves")
    .insert({ user_id: auth.user.id, theme_slug: body.themeSlug, correct });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      // Already had their go this week. Report the attempt as unrecorded rather
      // than echoing `correct` back, so a replay cannot mine the endpoint for a
      // verdict it did not earn.
      return NextResponse.json({ solved: false, alreadyAttempted: true });
    }
    return NextResponse.json({ error: "could not record solve" }, { status: 500 });
  }
  return NextResponse.json({ solved: correct });
}
