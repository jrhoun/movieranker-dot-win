"use client";

import { useEffect, useState } from "react";
import MarqueeHeading from "@/components/MarqueeHeading";

interface ProposalFilm {
  tmdbId: number;
  title: string | null;
  posterPath: string | null;
}

interface Proposal {
  id: string;
  title: string;
  blurb: string | null;
  status: string;
  createdAt: string;
  proposerHandle: string | null;
  scheduledWeek: number | null;
  films: ProposalFilm[];
}

type Decision = "approved" | "rejected" | "pending";

const POSTER = "https://image.tmdb.org/t/p/w185";

const btn =
  "min-h-11 rounded px-4 text-sm font-semibold transition-colors duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50";

/**
 * The films in a proposal, as films.
 *
 * This queue previously rendered `movie_ids.join(", ")`, so the approver was
 * shown "155, 550, 27205" and asked to judge a shortlist from it — which is
 * not a decision anybody can actually make. A proposal IS its films.
 *
 * A null title means the lookup failed (dead id, or TMDB unreachable). The id
 * is shown in that case rather than hiding the film, so the count stays honest
 * and the owner can still decide.
 */
function FilmStrip({ films }: { films: ProposalFilm[] }) {
  if (films.length === 0) {
    return <p className="mt-2 text-xs text-muted">No films in this proposal.</p>;
  }
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {films.map((f) => (
        <li key={f.tmdbId} className="w-16 shrink-0">
          <span className="block h-24 w-16 overflow-hidden rounded-sm bg-surface-raised ring-1 ring-white/10">
            {f.posterPath && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`${POSTER}${f.posterPath}`}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </span>
          <span className="mt-1 block text-[10px] leading-tight text-muted">
            {f.title ?? `#${f.tmdbId}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

interface Stats {
  profiles: number;
  publicProfiles: number;
  lists: number;
  doneLists: number;
  draftLists: number;
  filmsRanked: number;
  solves: number;
  proposals: { pending: number; approved: number; rejected: number };
}

type StatsResponse = { available: true; stats: Stats } | { available: false; reason: string };

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded bg-surface p-3 ring-1 ring-white/10">
      <div className="font-display text-2xl tabular-nums text-gold">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wider text-text/80">{label}</div>
      {sub && <div className="text-[10px] text-muted">{sub}</div>}
    </div>
  );
}

/**
 * Site-wide numbers, read with the service role because the owner's own
 * session cannot see other people's drafts (see the note on the stats route).
 *
 * When they cannot be read, this says so. It never falls back to zeroes: a
 * dashboard of zeroes reads as "nothing is happening" rather than "this did
 * not load", and on a young site that is a genuinely misleading thing to show.
 */
function Dashboard({ data }: { data: StatsResponse | null }) {
  if (data === null) return <p className="mt-4 text-sm text-muted">Loading…</p>;
  if (!data.available) {
    return (
      <p className="mt-4 rounded bg-surface p-3 text-sm text-muted ring-1 ring-white/10">
        Site-wide counts unavailable. {data.reason}
      </p>
    );
  }
  const s = data.stats;
  return (
    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Stat label="Profiles" value={s.profiles} sub={`${s.publicProfiles} public`} />
      <Stat label="Rankings" value={s.lists} sub={`${s.doneLists} done · ${s.draftLists} draft`} />
      <Stat label="Films ranked" value={s.filmsRanked} />
      <Stat label="Connections cracked" value={s.solves} />
      <Stat label="Proposals pending" value={s.proposals.pending} />
      <Stat
        label="Proposals decided"
        value={s.proposals.approved + s.proposals.rejected}
        sub={`${s.proposals.approved} approved · ${s.proposals.rejected} rejected`}
      />
    </div>
  );
}

interface WeekInfo {
  currentWeek: number;
  currentMarqueeNumber: number;
  scheduling: boolean;
}

/**
 * Weeks are stored as an ISO-week index counted from 1970 (~2956), which is the
 * number the rotation actually runs on but reads as noise to a person. The
 * marquee number — 1 at launch, +1 each Monday — is what the site shows
 * everywhere else, so scheduling is expressed in those terms and converted here.
 */
function marqueeLabel(week: number, info: WeekInfo): string {
  const n = info.currentMarqueeNumber + (week - info.currentWeek);
  if (week === info.currentWeek) return `Marquee ${n} · this week`;
  if (week === info.currentWeek + 1) return `Marquee ${n} · next week`;
  return `Marquee ${n}`;
}

function statusLine(p: Proposal, info: WeekInfo | null): string {
  if (p.scheduledWeek === null) return "Approved · not scheduled";
  if (!info) return "Approved · scheduled";
  return p.scheduledWeek === info.currentWeek
    ? "Approved · ON THE MARQUEE NOW"
    : `Approved · ${marqueeLabel(p.scheduledWeek, info)}`;
}

/**
 * Assigning a week is what actually puts a theme on the marquee — approving
 * only says it is good enough to run. Only future weeks (and the current one)
 * are offered, because the past cannot be rescheduled; the route refuses it
 * too, so this is convenience rather than the check itself.
 */
function ScheduleControl({
  proposal,
  weekInfo,
  disabled,
  onSchedule,
}: {
  proposal: Proposal;
  weekInfo: WeekInfo;
  disabled: boolean;
  onSchedule: (id: string, week: number | null) => void;
}) {
  const weeks = Array.from({ length: 12 }, (_, i) => weekInfo.currentWeek + i);
  return (
    <span className="flex items-center gap-1">
      <label className="sr-only" htmlFor={`week-${proposal.id}`}>
        Week for {proposal.title}
      </label>
      <select
        id={`week-${proposal.id}`}
        value={proposal.scheduledWeek ?? ""}
        disabled={disabled}
        onChange={(e) => onSchedule(proposal.id, e.target.value === "" ? null : Number(e.target.value))}
        className="min-h-11 rounded bg-surface-raised px-2 text-xs text-text ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-accent"
      >
        <option value="">Not scheduled</option>
        {weeks.map((w) => (
          <option key={w} value={w}>
            {marqueeLabel(w, weekInfo)}
          </option>
        ))}
      </select>
    </span>
  );
}

export default function AdminPage() {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekInfo, setWeekInfo] = useState<{
    currentWeek: number;
    currentMarqueeNumber: number;
    scheduling: boolean;
  } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/proposals");
    if (!res.ok) {
      // Not the owner (or OWNER_EMAIL unset): show nothing, reveal nothing.
      setProposals([]);
      return;
    }
    const json = (await res.json()) as {
      proposals?: Proposal[];
      currentWeek?: number;
      currentMarqueeNumber?: number;
      scheduling?: boolean;
    };
    setProposals(json.proposals ?? []);
    setWeekInfo({
      currentWeek: json.currentWeek ?? 0,
      currentMarqueeNumber: json.currentMarqueeNumber ?? 1,
      // False until upgrade-3.sql is run: the control is hidden rather than
      // offered in a state where it cannot work.
      scheduling: json.scheduling ?? false,
    });
  }

  async function schedule(id: string, scheduledWeek: number | null) {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/admin/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, scheduledWeek }),
    });
    setBusyId(null);
    if (!res.ok) {
      const msg = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(msg?.error ?? `Could not schedule that (${res.status}).`);
      return;
    }
    void load();
  }

  async function loadStats() {
    const res = await fetch("/api/admin/stats");
    if (!res.ok) {
      // Same silence as the proposals fetch: a non-owner learns nothing.
      setStats({ available: false, reason: "" });
      return;
    }
    setStats((await res.json()) as StatsResponse);
  }

  useEffect(() => {
    // async hop so pre-hydration markup matches first client render (same as home)
    const t = setTimeout(() => {
      void load();
      void loadStats();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  async function decide(id: string, status: Decision) {
    setBusyId(id);
    setError(null);
    const res = await fetch("/api/admin/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setBusyId(null);
    if (!res.ok) {
      // Previously unchecked: a failed decision reloaded silently, the row
      // stayed put, and the owner had no way to tell it had not been applied.
      setError(`That did not save (${res.status}). The proposal is unchanged.`);
      return;
    }
    void load();
  }

  const all = proposals ?? [];
  const pending = all.filter((p) => p.status === "pending");
  // Decided proposals were always fetched and never shown, so an approval was
  // invisible the moment it was made and a mis-click could not be found again.
  const decided = all.filter((p) => p.status !== "pending");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <MarqueeHeading as="h2">Admin</MarqueeHeading>

      <h3 className="mt-6 border-b border-white/10 pb-1.5 text-xs font-semibold uppercase tracking-wider text-text/80">
        The site right now
      </h3>
      <Dashboard data={stats} />

      {error && (
        <p className="mt-4 rounded bg-surface p-3 text-sm text-gold ring-1 ring-gold/30" role="status">
          {error}
        </p>
      )}

      {proposals === null ? (
        <p className="mt-6 text-sm text-muted">Loading…</p>
      ) : (
        <>
          <h3 className="mt-6 flex items-baseline justify-between gap-3 border-b border-white/10 pb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text/80">
              Awaiting a decision
            </span>
            <span className="text-[11px] tabular-nums text-muted">{pending.length}</span>
          </h3>

          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No pending proposals.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {pending.map((p) => (
                <li key={p.id} className="rounded bg-surface p-4 ring-1 ring-white/10">
                  <h4 className="font-semibold">{p.title}</h4>
                  {p.blurb && <p className="mt-0.5 text-sm text-muted">{p.blurb}</p>}
                  <p className="mt-1 text-xs text-muted">
                    {p.films.length} film{p.films.length === 1 ? "" : "s"}
                    {p.proposerHandle ? ` · @${p.proposerHandle}` : " · anonymous"}
                  </p>
                  <FilmStrip films={p.films} />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void decide(p.id, "approved")}
                      disabled={busyId === p.id}
                      className={`${btn} bg-gold text-bg`}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(p.id, "rejected")}
                      disabled={busyId === p.id}
                      className={`${btn} bg-surface-raised text-text ring-1 ring-white/10 hover:bg-white/10`}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {decided.length > 0 && (
            <>
              <h3 className="mt-10 flex items-baseline justify-between gap-3 border-b border-white/10 pb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-text/80">
                  Decided
                </span>
                <span className="text-[11px] tabular-nums text-muted">{decided.length}</span>
              </h3>
              <ul className="mt-4 space-y-2">
                {decided.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded bg-surface p-3 ring-1 ring-white/10"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="text-[11px] text-muted">
                        {p.status === "approved" ? statusLine(p, weekInfo) : "Rejected"}
                        {p.proposerHandle ? ` · @${p.proposerHandle}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {p.status === "approved" && weekInfo?.scheduling && (
                        <ScheduleControl
                          proposal={p}
                          weekInfo={weekInfo}
                          disabled={busyId === p.id}
                          onSchedule={schedule}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => void decide(p.id, "pending")}
                        disabled={busyId === p.id}
                        className={`${btn} bg-surface-raised text-text ring-1 ring-white/10 hover:bg-white/10`}
                        title={
                          p.status === "approved"
                            ? "Returns this to the queue and releases any week it holds"
                            : "Returns this to the queue"
                        }
                      >
                        Undo
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  );
}
