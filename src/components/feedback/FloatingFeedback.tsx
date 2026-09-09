"use client";

import { usePathname } from "next/navigation";
import { useFeedback } from "./FeedbackContext";

export default function FloatingFeedback() {
  const { openFeedback } = useFeedback();
  const pathname = usePathname();

  // Keep the duel play room completely immersive and distraction-free
  if (pathname?.startsWith("/r/play")) return null;

  return (
    <button
      type="button"
      onClick={openFeedback}
      aria-label="Open feedback dialog"
      className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 rounded-full border border-gold/40 bg-surface/90 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-gold shadow-2xl backdrop-blur-md transition-all duration-200 ease-out hover:border-gold hover:bg-surface-raised hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-gold cursor-pointer sm:bottom-6 sm:right-6"
    >
      <span aria-hidden="true" className="text-sm">✦</span>
      <span>Feedback</span>
    </button>
  );
}
