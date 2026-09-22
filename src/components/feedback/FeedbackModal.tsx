"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

export type FeedbackCategory = "bug" | "idea" | "other";

export interface FeedbackModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  pageUrl?: string;
  initialCategory?: FeedbackCategory;
  initialStatus?: "idle" | "submitting" | "success" | "error";
  initialErrorMessage?: string;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: "bug", label: "Bug Report", icon: "🐛" },
  { value: "idea", label: "Feature Idea", icon: "💡" },
  { value: "other", label: "General Feedback", icon: "💬" },
];

export default function FeedbackModal({
  isOpen = false,
  onClose,
  pageUrl,
  initialCategory = "bug",
  initialStatus = "idle",
  initialErrorMessage = "",
}: FeedbackModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [hpWebsite, setHpWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(initialStatus);
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      dialogRef.current?.close();
    }
  };

  const resetForm = () => {
    setMessage("");
    setEmail("");
    setHpWebsite("");
    setCategory("bug");
    setStatus("idle");
    setErrorMessage("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setErrorMessage("Please enter a feedback message.");
      return;
    }

    if (trimmedMessage.length > 2000) {
      setErrorMessage("Feedback message must not exceed 2000 characters.");
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please provide a valid email address or leave it blank.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    try {
      const resolvedPageUrl =
        pageUrl ??
        (typeof window !== "undefined" ? window.location.pathname : undefined);

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmedMessage,
          email: trimmedEmail || undefined,
          pageUrl: resolvedPageUrl,
          hp_website: hpWebsite || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.ok) {
        setStatus("success");
        trackEvent("feedback_sent", { category });
      } else {
        setStatus("error");
        const msg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error.trim()
            : "Could not send feedback. Please try again.";
        setErrorMessage(msg);
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="feedback-dialog-title"
      onClose={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          handleClose();
        }
      }}
      className="m-auto w-full max-w-lg bg-transparent p-4 text-left font-sans normal-case tracking-normal text-text backdrop:bg-black/80 backdrop:backdrop-blur-sm"
    >
      <div className="animate-fade-in relative overflow-hidden rounded-2xl border border-gold/40 bg-surface p-6 shadow-2xl ring-1 ring-white/10 sm:p-7">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-gold">
              <span aria-hidden="true">✦</span>
              <span>MovieRanker Feedback</span>
            </div>
            <h2
              id="feedback-dialog-title"
              className="font-display text-2xl uppercase tracking-wide text-text sm:text-3xl"
            >
              {status === "success" ? "Feedback Received" : "Send Feedback"}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close feedback dialog"
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-text focus-visible:outline-2 focus-visible:outline-gold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-6 flex flex-col items-center text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold text-2xl ring-1 ring-gold/40">
              ✓
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl uppercase tracking-wide text-text">
                Thank You for Your Voice!
              </h3>
              <p className="text-sm text-muted leading-relaxed max-w-sm">
                Your feedback helps shape MovieRanker. We review all submissions as we polish the public beta experience.
              </p>
            </div>
            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                }}
                className="rounded-lg border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:border-gold/40 hover:text-gold transition-colors cursor-pointer"
              >
                Send Another
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-wider text-bg hover:brightness-110 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                Category
              </label>
              <div
                role="radiogroup"
                aria-label="Feedback Category"
                className="grid grid-cols-3 gap-2"
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? "border-gold bg-gold/15 text-gold ring-1 ring-gold/40"
                          : "border-white/10 bg-white/5 text-muted hover:border-white/20 hover:text-text"
                      }`}
                    >
                      <span aria-hidden="true">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="feedback-message"
                  className="block text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Message <span className="text-accent-red">*</span>
                </label>
                <span
                  className={`text-[11px] tabular-nums ${
                    message.length > 2000 ? "text-accent-red" : "text-muted"
                  }`}
                  aria-live="polite"
                >
                  {message.length} / 2000
                </span>
              </div>
              <textarea
                id="feedback-message"
                name="message"
                required
                rows={4}
                maxLength={2000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  category === "bug"
                    ? "What went wrong? Steps to reproduce help us fix it quickly..."
                    : category === "idea"
                    ? "What feature or improvement would make MovieRanker better?"
                    : "What happened, or what would you like to see?"
                }
                className="w-full resize-y rounded-lg border border-white/15 bg-bg/80 px-3 py-2 text-sm text-text placeholder-muted/60 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            {/* Email input (optional) */}
            <div>
              <label
                htmlFor="feedback-email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1"
              >
                Email <span className="text-[11px] normal-case text-muted/70">(optional, for follow-up)</span>
              </label>
              <input
                id="feedback-email"
                name="email"
                type="email"
                maxLength={320}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/15 bg-bg/80 px-3 py-2 text-sm text-text placeholder-muted/60 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            {/* Honeypot field - hidden from humans, trapped for bots */}
            <div className="sr-only" aria-hidden="true" style={{ display: "none" }}>
              <label htmlFor="feedback-hp">Website</label>
              <input
                id="feedback-hp"
                type="text"
                name="hp_website"
                tabIndex={-1}
                autoComplete="off"
                value={hpWebsite}
                onChange={(e) => setHpWebsite(e.target.value)}
              />
            </div>

            {/* Error banner */}
            {errorMessage && (
              <div
                role="alert"
                className="rounded-lg border border-accent-red/40 bg-accent-red/10 p-3 text-xs text-accent-red"
              >
                {errorMessage}
              </div>
            )}

            {/* Form actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={status === "submitting"}
                className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "submitting" || !message.trim() || message.length > 2000}
                className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-wider text-bg transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {status === "submitting" ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-bg border-t-transparent"
                    />
                    <span>Sending...</span>
                  </>
                ) : (
                  <span>Submit Feedback</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
