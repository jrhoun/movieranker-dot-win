"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Captures ?ref=<handle> or ?ref=<id> from URL query parameters.
 * Stores in cookie & localStorage so signups within 30 days are credited to the referrer.
 */
export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref) return;

    const clean = ref.trim().replace(/^@/, "").toLowerCase();
    if (clean && clean.length <= 50) {
      try {
        localStorage.setItem("mr_ref", clean);
        document.cookie = `mr_ref=${encodeURIComponent(clean)}; path=/; max-age=2592000; SameSite=Lax`;
      } catch {}
    }
  }, [searchParams]);

  return null;
}
