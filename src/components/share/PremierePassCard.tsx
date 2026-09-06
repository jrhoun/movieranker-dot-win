"use client";

import { useMemo, useState } from "react";
import MoviePoster from "@/components/list/MoviePoster";
import {
  copyPremierePassToClipboard,
  downloadPremierePass,
  exportPremierePassBlob,
  formatTicketDate,
  generateTicketSerialNumber,
  type TicketMovieItem,
  type TicketRenderOptions,
} from "@/lib/ticket-canvas";

export interface PremierePassCardProps {
  title: string;
  items: TicketMovieItem[];
  creatorHandle?: string | null;
  participants?: string[];
  date?: string | Date;
  themeTitle?: string | null;
  totalRanked?: number;
  /**
   * Absolute URL of the saved list, e.g. "https://www.movieranker.win/l/id".
   * When present, the exported/shared ticket prints a real QR code back to
   * this list instead of the seeded decorative barcode, and native share
   * shares this URL rather than the current page's. Absent on the play-room
   * finale screen, which renders before a list exists to link to.
   */
  listUrl?: string | null;
  className?: string;
}

export default function PremierePassCard({
  title,
  items,
  creatorHandle,
  participants,
  date,
  themeTitle,
  totalRanked,
  listUrl,
  className = "",
}: PremierePassCardProps) {
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => a.rank - b.rank), [items]);
  const champion = sorted[0];
  const runnersUp = sorted.slice(1, 5);
  const formattedDate = useMemo(() => formatTicketDate(date), [date]);
  const serial = useMemo(() => generateTicketSerialNumber(title, date), [title, date]);
  const totalCount = totalRanked ?? sorted.length;

  const renderOptions: TicketRenderOptions = {
    title,
    items,
    creatorHandle,
    participants,
    date,
    themeTitle,
    totalRanked: totalCount,
    serialNumber: serial,
    listUrl: listUrl || undefined,
  };

  const handleShare = async () => {
    setSharing(true);
    setFeedback(null);
    try {
      const shareUrl =
        listUrl || (typeof window !== "undefined" ? window.location.href : "https://movieranker.win");
      const shareTitle = `${title} – Movie Ranking`;
      const shareText = champion
        ? `Check out my #1 ranking: ${champion.title} (${title}) on MovieRanker!`
        : `Check out my movie ranking for "${title}" on MovieRanker!`;

      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        let sharedWithFile = false;
        try {
          const blob = await exportPremierePassBlob(renderOptions);
          if (blob && typeof File !== "undefined" && navigator.canShare) {
            const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ranking-pass.png`;
            const file = new File([blob], fileName, { type: "image/png" });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: shareTitle,
                text: shareText,
                url: shareUrl,
                files: [file],
              });
              sharedWithFile = true;
            }
          }
        } catch {
          // File share not supported, proceed to text share
        }

        if (!sharedWithFile) {
          await navigator.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl,
          });
        }
        setFeedback("Shared");
      } else {
        // Fallback to clipboard copy
        await navigator.clipboard.writeText(shareUrl);
        setFeedback("Link copied");
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setFeedback("Couldn't open share dialog");
      }
    } finally {
      setSharing(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    setFeedback(null);
    try {
      const success = await copyPremierePassToClipboard(renderOptions);
      if (success) {
        setFeedback("Image copied");
      } else {
        // Graceful fallback to download if clipboard image write isn't supported
        await downloadPremierePass(renderOptions);
        setFeedback("Downloaded");
      }
    } catch {
      setFeedback("Couldn't copy image, downloading PNG instead");
      await downloadPremierePass(renderOptions);
    } finally {
      setCopying(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPremierePass(renderOptions);
      setFeedback("Downloaded");
    } catch {
      setFeedback("Couldn't download");
    } finally {
      setDownloading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Visual Retro Ticket Preview */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border-2 border-gold/60 bg-[#0e0e12] p-4 text-left shadow-2xl ring-1 ring-gold/30 sm:p-6">
        {/* Subtle radial gold glow inside */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/4 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
        />

        {/* Top Header Marquee */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-gold font-display text-lg" aria-hidden="true">✦</span>
            <span className="font-display text-sm uppercase tracking-widest text-gold sm:text-base">
              Admit one
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-gold/10 px-2 py-0.5 font-mono text-[11px] text-gold ring-1 ring-gold/30">
              {serial}
            </span>
          </div>
        </div>

        {/* Ticket Body: 2 Columns on desktop */}
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {/* Main Info (Left 2 cols) */}
          <div className="space-y-4 sm:col-span-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                {formattedDate} · {creatorHandle ? `@${creatorHandle}` : "Official Ranking"}
              </p>
              <h3 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
                {title}
              </h3>
            </div>

            {/* Champion Spotlight Box */}
            {champion && (
              <div className="flex items-center gap-3.5 rounded-xl border border-gold/40 bg-gradient-to-r from-gold/15 via-gold/5 to-transparent p-3 shadow-md">
                <div className="w-14 shrink-0 sm:w-16">
                  <MoviePoster title={champion.title} posterPath={champion.posterPath ?? null} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold">
                    <span aria-hidden="true">★</span>
                    <span>#1 Champion</span>
                  </div>
                  <p className="font-display text-lg uppercase tracking-wide text-white truncate sm:text-xl" title={champion.title}>
                    {champion.title}
                  </p>
                  {champion.releaseYear && (
                    <p className="text-xs text-accent">Released {champion.releaseYear}</p>
                  )}
                </div>
              </div>
            )}

            {/* Runners Up List */}
            {runnersUp.length > 0 && (
              <div>
                <p className="mb-1.5 font-display text-xs uppercase tracking-wider text-muted">
                  Top Runners-up
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {runnersUp.map((item) => (
                    <div
                      key={item.rank}
                      className="flex items-center gap-2 rounded bg-surface/80 px-2 py-1 ring-1 ring-white/5"
                    >
                      <span className="font-display text-xs text-gold">#{item.rank}</span>
                      <span className="truncate text-xs font-medium text-text">{item.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ticket Stub (Right 1 col) */}
          <div className="flex flex-col items-center justify-between border-t border-dashed border-gold/30 pt-4 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0 text-center">
            <div className="space-y-1">
              <p className="font-display text-lg uppercase tracking-widest text-gold">Standard admission</p>
              <p className="text-[10px] uppercase tracking-wider text-muted">Ranked head-to-head</p>
            </div>

            <div className="my-3 rounded-lg bg-gold/10 px-3 py-2 ring-1 ring-gold/30">
              <p className="font-display text-xl text-gold">{totalCount}</p>
              <p className="text-[10px] uppercase text-muted">Films Ranked</p>
            </div>

            {/* Sleek Golden Verification Seal */}
            <div className="w-full space-y-1">
              <div className="mx-auto flex flex-col items-center justify-center rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1.5">
                <span className="text-xs text-gold">✦</span>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gold">movieranker.win</p>
                <p className="text-[9px] uppercase tracking-wider text-muted">Ranked Head-to-Head</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Share & Export Actions. ONE primary action (Share); Copy image
          and Download PNG are quiet gold text links beneath it, not equal-weight
          buttons — DESIGN.md's "one primary action per view" rule. */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="inline-flex items-center gap-2 min-h-11 rounded-full bg-gold px-5 font-semibold text-bg shadow-md transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <svg
            className="size-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{sharing ? "Sharing…" : "Share"}</span>
        </button>

        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={handleCopy}
            disabled={copying}
            className="font-semibold text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 cursor-pointer"
          >
            {copying ? "Copying…" : "Copy image"}
          </button>
          <span aria-hidden="true" className="h-3 w-px bg-white/15" />
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="font-semibold text-gold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 cursor-pointer"
          >
            {downloading ? "Downloading…" : "Download PNG"}
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className="animate-sheet-up rounded-full bg-surface-raised px-4 py-1.5 text-xs font-medium text-gold ring-1 ring-gold/40 shadow-lg"
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
