import { NextResponse } from "next/server";
import { SHORTLIST_THEMES } from "@/lib/shortlist-themes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Records a CORRECT weekly-marquee connection solve for the signed-in user.
 *
 * The server verifies the answer rather than trusting a client claim: the
 * correct index is code data (shortlist-themes.ts), so a client that simply
 * asserted "I solved it" would make the codebreaker achievement forgeable —
 * which is the whole reason this endpoint exists instead of reading localStorage.
 */

export function isValidSolveRequest(
  body: unknown,
): body is { themeSlug: string; guessIndex: number } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return false;
  const b = body as { themeSlug?: unknown; guessIndex?: unknown };
  return (
    typeof b.themeSlug === "string" &&
    b.themeSlug.length > 0 &&
    typeof b.guessIndex === "number" &&
    Number.isInteger(b.guessIndex) &&
    b.guessIndex >= 0
  );
}

/** True only when the theme exists, defines a game, and the index matches. */
export function isCorrectGuess(themeSlug: string, guessIndex: number): boolean {
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

  if (!isCorrectGuess(body.themeSlug, body.guessIndex)) {
    // Not an error: a wrong guess is a valid outcome, it just records nothing.
    return NextResponse.json({ solved: false });
  }

  // Primary key is (user_id, theme_slug), so re-solving the same theme is a
  // no-op rather than an inflated count.
  const { error } = await supabase
    .from("marquee_solves")
    .upsert(
      { user_id: auth.user.id, theme_slug: body.themeSlug },
      { onConflict: "user_id,theme_slug", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ error: "could not record solve" }, { status: 500 });
  }
  return NextResponse.json({ solved: true });
}
