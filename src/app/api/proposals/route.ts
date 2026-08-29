import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { dbErrorResponse, invalid } from "@/lib/lists-api";
import { parseProposal } from "@/lib/proposals-api";
import {
  grandfatheredXp,
  levelFor,
  MIN_PROPOSAL_LEVEL,
  rankForLevel,
} from "@/lib/gamification";
import { fetchCareerXp } from "@/lib/career-xp";
import {
  LIMITS,
  rateKey,
  rateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Verify user has unlocked theme proposals (minimum level threshold)
  const { data: profile } = await supabase
    .from("profiles")
    .select("showcase")
    .eq("id", data.user.id)
    .maybeSingle();

  let bankedXp = 0;
  if (profile?.showcase && typeof profile.showcase === "object") {
    const sc = profile.showcase as Record<string, unknown>;
    if (typeof sc.lifetimeXp === "number") {
      bankedXp = sc.lifetimeXp;
    }
  }

  // The banked peak is a floor, so if it already clears the gate there is
  // nothing to look up. Only someone who has not yet qualified on record pays
  // for the full derivation, which agrees with the level the profile shows.
  let lifetimeXp = grandfatheredXp(bankedXp);
  if (levelFor(lifetimeXp).level < MIN_PROPOSAL_LEVEL) {
    lifetimeXp = (await fetchCareerXp(supabase, data.user.id, bankedXp)).total;
  }
  const userLevel = levelFor(lifetimeXp).level;
  if (userLevel < MIN_PROPOSAL_LEVEL) {
    return NextResponse.json(
      {
        error: `Theme proposals unlock at Level ${MIN_PROPOSAL_LEVEL} (${rankForLevel(MIN_PROPOSAL_LEVEL)}). You are currently Level ${userLevel}.`,
      },
      { status: 403 },
    );
  }

  const rl = rateLimit(
    await rateKey("proposals", request, data.user.id),
    LIMITS.proposals,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: Parameters<typeof parseProposal>[0];
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  const parsed = parseProposal(body);
  if (!parsed.ok) return invalid(parsed.error);

  const id = nanoid(10);
  const { error } = await supabase.from("shortlist_proposals").insert({
    id,
    proposer_id: data.user.id,
    title: parsed.value.title,
    blurb: parsed.value.blurb || null,
    movie_ids: parsed.value.movieIds,
    status: "pending",
  });
  if (error) return dbErrorResponse(error);

  return NextResponse.json({ id }, { status: 201 });
}
