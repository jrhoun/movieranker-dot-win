import type { SupabaseClient } from "@supabase/supabase-js";
import { maskListTitle } from "./marquee-title";
import { supabaseAdmin, supabaseSecretKey } from "./supabase/admin";
import { computeThemeStats, type ThemeRoom } from "./theme-stats";

/**
 * The Taste section of a profile: what a person's finished rankings say about
 * them, as opposed to how long they have been here. Pure math lives in
 * `computeTaste`; `loadTasteForProfile` fetches the rows and calls it.
 *
 * Everything here is derived from FINISHED lists only. A draft has no #1 and
 * no settled order, and on the public page a draft is invisible anyway.
 */

export interface TasteMovie {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  /** 1-based finished position; null for a parked (unseen) film. */
  finalRank: number | null;
}

export interface TasteList {
  id: string;
  /** The stored title. For a Marquee this IS the theme title (see marquee-title.ts). */
  title: string;
  themeSlug: string | null;
  /** ISO timestamp; lists.created_at. */
  createdAt: string;
  movies: TasteMovie[];
}

export interface NumberOne {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  listId: string;
  /** Already passed through the spoiler rule: a live-week Marquee reads "Weekly Marquee #n". */
  listTitle: string;
}

export interface DecadeShare {
  /** The decade's first year, e.g. 1990. */
  decade: number;
  /** "1990s". */
  label: string;
  count: number;
  /** Whole-number percentage; the shares of one profile sum to exactly 100. */
  pct: number;
}

export interface Agreement {
  /** Whole-number percentage of compared Marquees where the player's #1 was the room's #1. */
  pct: number;
  /** How many Marquees had enough other rooms to compare against. */
  compared: number;
}

export interface TasteProfile {
  finishedLists: number;
  /** The #1 of each finished list, newest list first, at most twelve. */
  numberOnes: NumberOne[];
  /** Only decades with at least one film, oldest first. Empty when no film has a year. */
  decades: DecadeShare[];
  /** Null below two comparable Marquees: one is an anecdote. */
  agreement: Agreement | null;
  connections: { cracked: number; marqueesFinished: number };
  /** The film ranked in the most finished lists, if it was ranked at least twice. */
  mostRanked: { tmdbId: number; title: string; posterPath: string | null; count: number } | null;
}

export const NUMBER_ONES_CAP = 12;

/**
 * A room's verdict needs at least this many OTHER rooms before it is a room.
 * theme-stats' own spread math needs two; and "agrees with the room" against
 * one stranger is a coin toss, not a consensus.
 */
export const MIN_OTHER_ROOMS = 2;

export interface ComputeTasteInput {
  lists: TasteList[];
  /**
   * Every done room per theme slug, as the Community Verdict on /l/[id] reads
   * them. The player's own room may be included; it is removed here so the
   * "room" the player is measured against is other people.
   */
  roomsByTheme?: ReadonlyMap<string, ThemeRoom[]>;
  /** Correct marquee_solves rows for this user. */
  connectionsCracked: number;
  /** Injectable clock for the spoiler rule (which week is live). */
  now?: Date;
}

/** The film a finished list put first: rank 1, or the best-ranked film if 1 is somehow missing. */
function listNumberOne(list: TasteList): TasteMovie | null {
  let best: TasteMovie | null = null;
  for (const m of list.movies) {
    if (m.finalRank === null) continue;
    if (!best || m.finalRank < (best.finalRank as number)) best = m;
  }
  return best;
}

/**
 * Whole-number percentages that sum to exactly 100 (largest remainder).
 * Rounding each share independently gives 33/33/33 or 34/33/34; a bar built
 * from those is visibly short or long by a segment's width.
 */
export function percentagesSummingTo100(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (c * 100) / total);
  const floors = raw.map((r) => Math.floor(r));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (remainder <= 0) break;
    floors[i] += 1;
    remainder -= 1;
  }
  return floors;
}

export function computeTaste(input: ComputeTasteInput): TasteProfile {
  const now = input.now ?? new Date();
  const lists = input.lists
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id));

  // Number ones, newest list first.
  const numberOnes: NumberOne[] = [];
  for (const l of lists) {
    if (numberOnes.length >= NUMBER_ONES_CAP) break;
    const top = listNumberOne(l);
    if (!top) continue;
    numberOnes.push({
      tmdbId: top.tmdbId,
      title: top.title,
      posterPath: top.posterPath,
      releaseYear: top.releaseYear,
      listId: l.id,
      // No `reveal` even for the owner: this strip may be lifted onto the
      // public page verbatim, and the live week's theme is masked everywhere.
      listTitle: maskListTitle(
        { title: l.title, themeSlug: l.themeSlug, createdAt: l.createdAt },
        now,
      ),
    });
  }

  // Decades: every RANKED film (a parked one was not seen, so it says nothing).
  const decadeCounts = new Map<number, number>();
  for (const l of lists) {
    for (const m of l.movies) {
      if (m.finalRank === null || m.releaseYear === null) continue;
      const decade = Math.floor(m.releaseYear / 10) * 10;
      decadeCounts.set(decade, (decadeCounts.get(decade) ?? 0) + 1);
    }
  }
  const decadeKeys = [...decadeCounts.keys()].sort((a, b) => a - b);
  const pcts = percentagesSummingTo100(decadeKeys.map((d) => decadeCounts.get(d) as number));
  const decades: DecadeShare[] = decadeKeys.map((d, i) => ({
    decade: d,
    label: `${d}s`,
    count: decadeCounts.get(d) as number,
    pct: pcts[i],
  }));

  // Agreement with the room, per finished Marquee that has enough other rooms.
  let compared = 0;
  let matched = 0;
  for (const l of lists) {
    if (!l.themeSlug) continue;
    const mine = listNumberOne(l);
    if (!mine) continue;
    const others = (input.roomsByTheme?.get(l.themeSlug) ?? []).filter((r) => r.id !== l.id);
    if (others.length < MIN_OTHER_ROOMS) continue;
    const stats = computeThemeStats(others);
    const lead = stats.movies[0];
    if (!lead || lead.firstCount === 0) continue;
    // The room's #1 is every film tied at the top of the verdict, not the one
    // theme-stats happens to put first alphabetically.
    const roomTop = stats.movies.filter(
      (m) => m.pctRankedFirst === lead.pctRankedFirst && m.firstCount === lead.firstCount,
    );
    compared += 1;
    if (roomTop.some((m) => m.tmdbId === mine.tmdbId)) matched += 1;
  }
  const agreement: Agreement | null =
    compared >= 2 ? { pct: Math.round((matched / compared) * 100), compared } : null;

  // Most ranked: appears in the most finished lists; ties go to the film whose
  // latest appearance is newest (lists are already newest first).
  const appearances = new Map<
    number,
    { tmdbId: number; title: string; posterPath: string | null; count: number; newest: number }
  >();
  lists.forEach((l, order) => {
    const seenInList = new Set<number>();
    for (const m of l.movies) {
      if (m.finalRank === null || seenInList.has(m.tmdbId)) continue;
      seenInList.add(m.tmdbId);
      const acc = appearances.get(m.tmdbId);
      if (acc) {
        acc.count += 1;
        if (!acc.posterPath && m.posterPath) acc.posterPath = m.posterPath;
      } else {
        appearances.set(m.tmdbId, {
          tmdbId: m.tmdbId,
          title: m.title,
          posterPath: m.posterPath,
          count: 1,
          newest: order,
        });
      }
    }
  });
  let mostRanked: TasteProfile["mostRanked"] = null;
  for (const a of appearances.values()) {
    if (a.count < 2) continue;
    if (
      !mostRanked ||
      a.count > mostRanked.count ||
      (a.count === mostRanked.count &&
        a.newest < (appearances.get(mostRanked.tmdbId) as { newest: number }).newest)
    ) {
      mostRanked = { tmdbId: a.tmdbId, title: a.title, posterPath: a.posterPath, count: a.count };
    }
  }

  return {
    finishedLists: lists.length,
    numberOnes,
    decades,
    agreement,
    connections: {
      cracked: input.connectionsCracked,
      marqueesFinished: lists.filter((l) => Boolean(l.themeSlug)).length,
    },
    mostRanked,
  };
}

/* ───────────────────────────── prose ───────────────────────────── */

export interface TasteVoice {
  mode: "owner" | "visitor";
  /** Without the @; used only in visitor mode. */
  handle: string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The sentence under the bar. Owner mode speaks in "you"; visitor mode names
 * the handle once and then uses "they". Returns [] when there is nothing to
 * say, so the section can leave the line out rather than print a stub.
 */
export function tasteSentences(taste: TasteProfile, voice: TasteVoice): string[] {
  const owner = voice.mode === "owner";
  const subject = owner ? "You" : `@${voice.handle}`;
  const has = owner ? "have" : "has";
  const out: string[] = [];

  const { agreement, connections, mostRanked } = taste;
  const cracked =
    connections.cracked > 0
      ? `${has} cracked ${plural(connections.cracked, "connection", "connections")}`
      : null;

  if (agreement) {
    const agrees = owner ? "agree" : "agrees";
    let s = `${subject} ${agrees} with the room ${agreement.pct}% of the time across ${plural(agreement.compared, "Marquee", "Marquees")}`;
    if (cracked) s += `, and ${cracked}`;
    out.push(`${s}.`);
  } else if (connections.marqueesFinished > 0) {
    let s = `${subject} ${has} finished ${plural(connections.marqueesFinished, "Marquee", "Marquees")}`;
    if (cracked) s += ` and ${cracked}`;
    out.push(`${s}.`);
  }

  if (mostRanked) {
    const returns = owner ? "you come back to" : "they come back to";
    out.push(
      `The film ${returns} most is ${mostRanked.title}, ranked in ${plural(mostRanked.count, "list", "lists")}.`,
    );
  }
  return out;
}

/** The decade bar as one sentence, for narrow screens and screen readers. */
export function decadesSentence(decades: DecadeShare[], voice: TasteVoice): string | null {
  if (decades.length === 0) return null;
  const owner = voice.mode === "owner";
  const byShare = decades.slice().sort((a, b) => b.pct - a.pct || a.decade - b.decade);
  const [first, second] = byShare;
  const whose = owner ? "Your" : "Their";
  if (decades.length === 1) return `${whose} films are all from the ${first.label}.`;
  const lead = `${whose} films lean ${first.label} (${first.pct}%)`;
  return second ? `${lead}, then ${second.label} (${second.pct}%).` : `${lead}.`;
}

/* ───────────────────────────── loading ───────────────────────────── */

export interface LoadTasteOptions {
  /** Visitor view: public finished lists only. Owner view sees every finished list. */
  publicOnly: boolean;
  /** Already-loaded finished lists (e.g. the owner dashboard's rows); skips the lists query. */
  lists?: TasteList[];
  /** Already-counted correct solves; skips the marquee_solves query. */
  connectionsCracked?: number;
}

interface DbTasteList {
  id: string;
  title: string;
  theme_slug: string | null;
  created_at: string;
  status: string;
  visibility: string | null;
  list_movies:
    | {
        tmdb_id: number;
        title: string;
        poster_path: string | null;
        release_year: number | null;
        final_rank: number | null;
      }[]
    | null;
}

/** Map raw `lists` rows (with `list_movies`) to the pure input. Drops rows that are not done. */
export function tasteListsFromRows(
  rows: {
    id: string;
    title: string;
    theme_slug?: string | null;
    created_at: string;
    status: string;
    list_movies?:
      | {
          tmdb_id?: number;
          title: string;
          poster_path: string | null;
          release_year?: number | null;
          final_rank?: number | null;
        }[]
      | null;
  }[],
): TasteList[] {
  return rows
    .filter((r) => r.status === "done")
    .map((r) => ({
      id: r.id,
      title: r.title,
      themeSlug: r.theme_slug ?? null,
      createdAt: r.created_at,
      movies: (r.list_movies ?? [])
        .filter((m): m is typeof m & { tmdb_id: number } => Number.isInteger(m.tmdb_id))
        .map((m) => ({
          tmdbId: m.tmdb_id,
          title: m.title,
          posterPath: m.poster_path ?? null,
          releaseYear: typeof m.release_year === "number" ? m.release_year : null,
          finalRank: typeof m.final_rank === "number" ? m.final_rank : null,
        })),
    }));
}

/**
 * Fetch and compute. Three reads at most: this user's finished lists, every
 * done room for the Marquee themes among them, and the solve count.
 */
export async function loadTasteForProfile(
  supabase: SupabaseClient,
  userId: string,
  opts: LoadTasteOptions,
): Promise<TasteProfile> {
  let lists = opts.lists;
  if (!lists) {
    let q = supabase
      .from("lists")
      .select(
        "id,title,theme_slug,created_at,status,visibility,list_movies(tmdb_id,title,poster_path,release_year,final_rank)",
      )
      .eq("owner_id", userId)
      .eq("status", "done");
    // Mirrors shapePublicProfile: unlisted stays link-accessible but is not on
    // the public page, so it cannot feed the public page's taste either.
    if (opts.publicOnly) q = q.eq("visibility", "public");
    const { data } = await q.order("created_at", { ascending: false });
    const rows = ((data ?? []) as DbTasteList[]).filter(
      (r) => !opts.publicOnly || r.visibility === "public",
    );
    lists = tasteListsFromRows(rows);
  }

  // Rooms for the consensus, read the way /l/[id] reads them: done, not
  // private, and filtered explicitly rather than trusting "owner all" to stay
  // out, so every viewer computes the same verdict.
  const themeSlugs = [...new Set(lists.map((l) => l.themeSlug).filter((s): s is string => !!s))];
  const roomsByTheme = new Map<string, ThemeRoom[]>();
  if (themeSlugs.length > 0) {
    const { data: themed } = await supabase
      .from("lists")
      .select("id,theme_slug,list_movies(tmdb_id,title,poster_path,elo,parked,final_rank)")
      .in("theme_slug", themeSlugs)
      .eq("status", "done")
      .in("visibility", ["unlisted", "public"])
      .limit(5000);
    for (const r of (themed ?? []) as Record<string, unknown>[]) {
      const slug = r.theme_slug as string;
      const room: ThemeRoom = {
        id: String(r.id),
        movies: ((Array.isArray(r.list_movies) ? r.list_movies : []) as Record<string, unknown>[]).map(
          (mv) => ({
            tmdbId: mv.tmdb_id as number,
            title: mv.title as string,
            posterPath: (mv.poster_path as string | null) ?? null,
            elo: typeof mv.elo === "number" ? mv.elo : 1000,
            parked: Boolean(mv.parked),
            finalRank: (mv.final_rank as number | null) ?? null,
          }),
        ),
      };
      roomsByTheme.set(slug, [...(roomsByTheme.get(slug) ?? []), room]);
    }
  }

  let connectionsCracked = opts.connectionsCracked;
  if (connectionsCracked === undefined) {
    // marquee_solves is RLS-scoped to the reader ("read own solves"), so a
    // visitor's session counts zero for everyone else. It is a count of
    // correct rows for one user and nothing more, so the public view reads
    // it through the server's own key; the owner's session reads its own.
    const client = opts.publicOnly && supabaseSecretKey() ? supabaseAdmin() : supabase;
    const { count } = await client
      .from("marquee_solves")
      .select("theme_slug", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("correct", true);
    connectionsCracked = count ?? 0;
  }

  return computeTaste({ lists, roomsByTheme, connectionsCracked });
}
