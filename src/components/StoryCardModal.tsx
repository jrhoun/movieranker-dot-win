"use client";

import { useEffect, useState } from "react";
import { generateStoryCardBlob, type StoryCardOptions } from "@/lib/story-card-canvas";

interface StoryCardModalProps {
  options: StoryCardOptions;
  onClose: () => void;
}

export default function StoryCardModal({ options, onClose }: StoryCardModalProps) {
  const [loading, setLoading] = useState(true);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let urlToRevoke: string | null = null;

    generateStoryCardBlob(options)
      .then((b) => {
        if (cancelled) return;
        setBlob(b);
        const url = URL.createObjectURL(b);
        urlToRevoke = url;
        setPreviewUrl(url);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    };
  }, [options]);

  async function copyImageToClipboard() {
    if (!blob) return;
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } else {
        downloadImage();
      }
    } catch {
      downloadImage();
    }
  }

  function downloadImage() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    const safeTitle = options.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.download = `${safeTitle}-story-card.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="story-card-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-5 shadow-2xl ring-1 ring-gold/30">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded-full bg-surface-raised text-muted hover:text-text hover:bg-white/10 transition-colors"
        >
          ✕
        </button>

        <div className="text-center">
          <span className="font-display text-xs uppercase tracking-widest text-gold">
            ✦ Social Share Card ✦
          </span>
          <h3 id="story-card-title" className="mt-1 font-display text-lg font-bold text-text">
            {options.themeSlug ? "Weekly Marquee Story" : "Ranking Story Card"}
          </h3>
          <p className="text-xs text-muted">
            Formatted for Instagram Stories, Threads & Facebook
          </p>
        </div>

        {/* 9:16 Preview Frame */}
        <div className="mt-4 flex items-center justify-center">
          <div className="relative aspect-[9/16] w-52 overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-inner ring-1 ring-white/10">
            {loading ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted">
                <span className="size-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
                <span>Rendering card…</span>
              </div>
            ) : previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Story card preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-muted">
                Unable to render preview
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            disabled={loading || !blob}
            onClick={() => void copyImageToClipboard()}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 text-xs font-bold uppercase tracking-wider text-bg shadow-md transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <span>📸</span>
                <span>Copy Image to Clipboard</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={loading || !previewUrl}
            onClick={downloadImage}
            className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-surface-raised px-4 text-xs font-semibold text-text ring-1 ring-white/10 transition-colors hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            <span>💾</span>
            <span>Download High-Res PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
