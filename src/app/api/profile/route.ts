import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { invalid } from "@/lib/lists-api";
import { checkHandle } from "@/lib/handles";
import { mergeShowcase, type ProfileShowcase } from "@/lib/public-profile";
import {
  CONNECTION_SOLVE_XP,
  evaluateAchievements,
  grandfatheredXp,
  levelFor,
  MIN_PIN_LIST_LEVEL,
  type AchievementStats,
} from "@/lib/gamification";
import { fetchCareerXp } from "@/lib/career-xp";
import { resolveReferrerId } from "@/lib/referrals";
import { parseEquipped } from "@/lib/cosmetics/equipped";
import { validateEquipPatch } from "@/lib/cosmetics/equip-guard";
import { ownedItemIds } from "@/lib/cosmetics/ownership";
import { resolveTaglineText } from "@/lib/cosmetics/taglines";
import { marqueeStanding } from "@/lib/marquee-standing";
import {
  LIMITS,
  rateKey,
  rateLimit,
  tooManyRequests,
} from "@/lib/rate-limit";

const VISIBILITIES = new Set(["private", "public"]);

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // No row yet -> unclaimed handle, default visibility.
  const { data } = await supabase
    .from("profiles")
    .select("handle,visibility")
    .eq("id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    handle: data?.handle ?? null,
    visibility: data?.visibility === "public" ? "public" : "private",
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Attempt-based limiter: runs BEFORE validation so failed attempts burn
  // the budget too — 5 claim attempts per hour per user.
  const rl = rateLimit(
    await rateKey("claimHandle", request, auth.user.id),
    LIMITS.claimHandle,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: { handle?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }
  if (typeof body.handle !== "string") return invalid("handle must be a string");

  const checked = checkHandle(body.handle);
  if (!checked.ok)
    return NextResponse.json(
      {
        error:
          checked.reason === "reserved"
            ? "that handle is reserved"
            : checked.reason === "profane"
              ? "handle contains inappropriate language"
              : "invalid handle (3-20 chars: letters, numbers, _ or -)",
      },
      { status: 400 },
    );

  // Check for referrer cookie or request payload
  const cookieHeader = request.headers.get("cookie") ?? "";
  const matchCookie = cookieHeader.match(/(?:^|;\s*)mr_ref=([^;]+)/);
  const refCode =
    (body as { ref?: string }).ref ??
    (matchCookie ? decodeURIComponent(matchCookie[1]) : null);

  let referrerId: string | null = null;
  if (refCode) {
    const resolved = await resolveReferrerId(supabase, refCode);
    if (resolved && resolved !== auth.user.id) {
      referrerId = resolved;
    }
  }

  // Check if profile exists already to avoid overwriting existing referrer
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("referred_by")
    .eq("id", auth.user.id)
    .maybeSingle();

  const profilePayload: { id: string; handle: string; referred_by?: string } = {
    id: auth.user.id,
    handle: checked.handle,
  };
  if (!existingProfile?.referred_by && referrerId) {
    profilePayload.referred_by = referrerId;
  }

  // Upsert keyed on id: creates the row on first claim, updates only the
  // handle afterwards; existing visibility is never touched.
  const { error } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" });
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "that handle is taken" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ handle: checked.handle }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimit(
    await rateKey("profile", request, auth.user.id),
    LIMITS.profile,
  );
  if (!rl.ok) return tooManyRequests(rl.retryAfterSeconds);

  let body: { visibility?: unknown; showcase?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return invalid("invalid JSON");
  }

  const update: Record<string, string | ProfileShowcase> = {};
  if (body.visibility !== undefined) {
    if (typeof body.visibility !== "string" || !VISIBILITIES.has(body.visibility))
      return invalid("visibility must be 'private' or 'public'");
    update.visibility = body.visibility;
  }

  if (body.showcase !== undefined) {
    if (typeof body.showcase !== "object" || body.showcase === null || Array.isArray(body.showcase))
      return invalid("invalid showcase");

    // lifetimeXp is server-derived and ratcheted only by the profile page's
    // own server component (src/app/(site)/u/profile/page.tsx), which writes
    // it via a direct Supabase update that bypasses this API entirely.
    // mergeShowcase itself still accepts a lifetimeXp patch (that ratchet is
    // its own tested contract), so it must never see whatever a client sent
    // here — otherwise a single PATCH could inflate lifetimeXp arbitrarily,
    // and every level-gated cosmetic, the pin gate, and the proposals gate
    // all trust the level that number produces.
    const clientShowcase: Record<string, unknown> = { ...(body.showcase as Record<string, unknown>) };
    delete clientShowcase.lifetimeXp;

    // taglineText is server-derived from resolveTaglineText, the same trust
    // boundary as lifetimeXp above: never believe a client-supplied value.
    // Strip it before parseEquipped/validateEquipPatch ever see it, so it
    // can't ride along disguised as an ordinary equip patch — ownership
    // validation below only checks catalogue ids (ID_FIELDS) and the avatar
    // fields, so a patch containing NOTHING but a rogue `taglineText` would
    // otherwise sail through validateEquipPatch untouched and get persisted
    // as-is. Recomputed below, from this user's own stats, whenever the
    // patch actually changes `tagline`.
    const clientEquipped = (clientShowcase as { equipped?: unknown }).equipped;
    if (typeof clientEquipped === "object" && clientEquipped !== null && !Array.isArray(clientEquipped)) {
      delete (clientEquipped as Record<string, unknown>).taglineText;
    }

    // Current stored value first so a partial patch preserves the other field.
    const { data: row } = await supabase
      .from("profiles")
      .select("id,showcase")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (!row)
      return NextResponse.json({ error: "claim a handle first" }, { status: 409 });

    // Trust boundary: ownership of catalogue items and avatar posters is
    // recomputed here from the user's own finished-list rows, never from
    // anything the client sent. A client could otherwise POST any catalogue
    // id and equip a cosmetic it never earned, or pin an arbitrary poster as
    // its avatar.
    const equipPatch = parseEquipped(
      (clientShowcase as { equipped?: unknown }).equipped,
    );
    if (equipPatch === null) return invalid("invalid equipped block");
    if (Object.keys(equipPatch).length > 0) {
      // Ordered oldest-first: ownedItemIds replays canister drops in
      // finishedThemeSlugs order, and an unordered query would make the
      // drop-derived half of `owned` (and therefore a 403) non-deterministic
      // across identical requests.
      const { data: doneRowsData } = await supabase
        .from("lists")
        .select("theme_slug,status,participants,created_at,list_movies(tmdb_id,poster_path)")
        .eq("owner_id", auth.user.id)
        .eq("status", "done")
        .order("created_at", { ascending: true });

      const doneRows = (doneRowsData ?? []) as {
        theme_slug?: string | null;
        participants?: unknown;
        list_movies?: { tmdb_id: number; poster_path: string | null }[];
      }[];

      const finishedThemeSlugs = doneRows
        .map((r) => r.theme_slug)
        .filter((s): s is string => typeof s === "string" && s.length > 0);

      // Real poster paths for the user's own finished films, so an equipped
      // avatarPosterPath can be checked against the actual film rather than
      // trusted at face value.
      const ownedTmdbIds = new Set<number>();
      const posterPathByTmdbId = new Map<number, string | null>();
      let moviesRanked = 0;
      let maxMoviesInSingleList = 0;
      for (const r of doneRows) {
        // Raw count for the totals — countMoviesRanked's definition elsewhere
        // is list_movies.length, uncapped and unfiltered; a row missing a
        // tmdb_id must not silently shrink `centurion`'s count.
        const rawMovies = r.list_movies ?? [];
        moviesRanked += rawMovies.length;
        maxMoviesInSingleList = Math.max(maxMoviesInSingleList, rawMovies.length);
        const movies = rawMovies.filter(
          (m): m is { tmdb_id: number; poster_path: string | null } =>
            typeof m.tmdb_id === "number",
        );
        for (const m of movies) {
          ownedTmdbIds.add(m.tmdb_id);
          posterPathByTmdbId.set(m.tmdb_id, m.poster_path);
        }
      }
      const coCuratedLists = doneRows.filter(
        (r) => Array.isArray(r.participants) && r.participants.length > 0,
      ).length;

      // The three ordering achievements (first/top10/top100 on a weekly
      // Marquee) rank within a theme only, so scoping this cross-user query
      // to the themes this user actually finished keeps it correct without
      // an unbounded scan of every Marquee completion ever recorded.
      let standing = { firstToMarquee: false, top10Marquee: false, top100Marquee: false };
      if (finishedThemeSlugs.length > 0) {
        // Ordered oldest-first before the cap: an unordered .limit(10000)
        // could truncate away the EARLIEST completions of a theme, making a
        // later completer look like rank 1 and wrongly granting
        // marquee_pioneer. Ordering means the cap can only drop the latest
        // (irrelevant to who was first) rather than fail open.
        const { data: themeRowsData } = await supabase
          .from("lists")
          .select("owner_id,theme_slug,created_at")
          .in("theme_slug", finishedThemeSlugs)
          .eq("status", "done")
          .in("visibility", ["unlisted", "public"])
          .order("created_at", { ascending: true })
          .limit(10000);
        const completions = ((themeRowsData ?? []) as Record<string, unknown>[])
          .filter((r) => typeof r.owner_id === "string" && typeof r.theme_slug === "string")
          .map((r) => ({
            ownerId: r.owner_id as string,
            themeSlug: r.theme_slug as string,
            createdAt: String(r.created_at ?? ""),
          }));
        standing = marqueeStanding(completions, auth.user.id);
      }

      const equipBankedXp = (row as { showcase?: { lifetimeXp?: number } }).showcase?.lifetimeXp ?? 0;
      const { total, breakdown } = await fetchCareerXp(supabase, auth.user.id, equipBankedXp);
      // Named and reused below for taglineText: this IS the owner's real,
      // full-access stats (never RLS-limited the way a *reader* of
      // /u/[handle] would be), which is exactly why the resolved text is
      // computed and stored here rather than left for a page to re-derive.
      const achievementStats: AchievementStats = {
        doneLists: doneRows.length,
        moviesRanked,
        maxMoviesInSingleList,
        coCuratedLists,
        marqueeWeeks: finishedThemeSlugs.length,
        // Recovered from the already-computed XP breakdown rather than a
        // fresh query: connections XP is solve count * CONNECTION_SOLVE_XP.
        marqueeConnectionsSolved: breakdown.connections / CONNECTION_SOLVE_XP,
        ...standing,
      };
      const owned = ownedItemIds({
        userId: auth.user.id,
        level: levelFor(total).level,
        unlockedAchievementKeys: evaluateAchievements(achievementStats)
          .filter((a) => a.unlocked)
          .map((a) => a.key),
        finishedThemeSlugs,
      });

      const check = validateEquipPatch(equipPatch, owned, ownedTmdbIds, posterPathByTmdbId);
      if (!check.ok) return NextResponse.json({ error: check.error }, { status: 403 });

      // taglineText: resolved here (never trusted from the client — see the
      // strip above) and written back into the same raw object mergeShowcase
      // will re-parse below. Only touched when this patch actually changes
      // `tagline`; other equip-only patches (a frame, an avatar) leave
      // whatever text is already stored untouched.
      if (Object.prototype.hasOwnProperty.call(equipPatch, "tagline")) {
        // A cleared tagline (`tagline: null`) clears its text with it, so
        // storage never carries orphaned text for a slot that's now empty.
        const taglineText = equipPatch.tagline
          ? (resolveTaglineText(equipPatch.tagline, achievementStats) ?? null)
          : null;
        (clientEquipped as Record<string, unknown>).taglineText = taglineText;
      }
    }

    const merged = mergeShowcase(
      (row as { showcase?: unknown }).showcase,
      clientShowcase as { achievementKeys?: unknown; favoriteListId?: unknown; equipped?: unknown },
    );
    if (!merged) return invalid("invalid showcase");
    if (merged.favoriteListId) {
      // Gate: user must be Level 10 or higher to pin a featured list. Derived
      // through the shared helper so this gate cannot drift from the level the
      // profile shows the same person.
      const bankedXp = (row as { showcase?: { lifetimeXp?: number } }).showcase?.lifetimeXp ?? 0;
      // The banked peak is a floor, so someone already qualified on record pays
      // for no lookups at all.
      let lifetimeXp = grandfatheredXp(bankedXp);
      if (levelFor(lifetimeXp).level < MIN_PIN_LIST_LEVEL) {
        lifetimeXp = (await fetchCareerXp(supabase, auth.user.id, bankedXp)).total;
      }
      const userLevel = levelFor(lifetimeXp).level;
      if (userLevel < MIN_PIN_LIST_LEVEL) {
        return NextResponse.json(
          {
            error: `Pinning a featured ranking unlocks at Level ${MIN_PIN_LIST_LEVEL}. You are currently Level ${userLevel}.`,
          },
          { status: 403 },
        );
      }

      // Trust boundary: the featured list must be owned AND a public done list.
      const { data: fav } = await supabase
        .from("lists")
        .select("id")
        .eq("id", merged.favoriteListId)
        .eq("owner_id", auth.user.id)
        .eq("status", "done")
        .eq("visibility", "public")
        .maybeSingle();
      if (!fav)
        return invalid("featured ranking must be one of your public finished lists");
    }
    update.showcase = merged;
  }

  if (!("visibility" in update) && !("showcase" in update))
    return invalid("nothing to update");

  // Update-only: a profiles row exists only once a handle is claimed.
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", auth.user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "claim a handle first" }, { status: 409 });

  return NextResponse.json({
    ...(body.visibility !== undefined ? { visibility: body.visibility as string } : {}),
    ...(update.showcase ? { showcase: update.showcase } : {}),
  });
}
